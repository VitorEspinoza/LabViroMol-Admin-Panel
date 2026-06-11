import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';

import { UsersService } from '../../users/users.service';
import { User, UserInfo, CreateUserRequest, UpdateUserRequest, ResearchRegistrationData } from '../../../../shared/models/user.model';
import { Role } from '../../../../shared/models/role.model';
import { DegreeLevel } from '../../../../shared/models/research.model';
import { PhoneMaskDirective } from '../../../../shared/directives/phone-mask.directive';
import { AuthService } from '../../../../core/auth/auth.service';
import { PositionsService } from '../../../research/positions/positions.service';
import { DEGREE_LEVEL_OPTIONS } from '../../../../shared/utils/degree-level';

@Component({
  selector: 'app-user-form',
  imports: [
    ReactiveFormsModule,
    Dialog, Button, InputText, MultiSelect, Select, ToggleSwitch,
    Tabs, TabList, Tab, TabPanels, TabPanel,
    PhoneMaskDirective,
  ],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent {
  readonly visible = model(false);
  readonly user = input<User | null>(null);
  readonly roles = input<Role[]>([]);
  readonly saved = output<void>();

  private readonly usersService = inject(UsersService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly positionsService = inject(PositionsService);

  protected readonly saving = signal(false);
  protected readonly loadingUser = signal(false);
  protected readonly positionOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly degreeLevelOptions = DEGREE_LEVEL_OPTIONS;
  protected readonly isEditing = computed(() => this.user() !== null);
  protected readonly canManage = computed(() => this.auth.hasPermission('Identity.Users.Manage'));
  protected readonly readOnly = computed(() => this.isEditing() && !this.canManage());
  protected readonly dialogHeader = computed(() => {
    if (!this.isEditing()) return 'Nova Pessoa';
    return this.readOnly() ? 'Visualizar Pessoa' : 'Editar Pessoa';
  });

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    roleIds: this.fb.nonNullable.control<string[]>([]),
    emergencyContactName: [''],
    emergencyContactNumber: [''],
    research: this.fb.nonNullable.group({
      enabled: [false],
      positionId: [''],
      degreeLevel: this.fb.nonNullable.control<DegreeLevel | ''>(''),
      fieldOfStudy: [''],
      lattesUrl: [''],
      citationName: [''],
      displayName: [''],
    }),
  });

  constructor() {
    this.form.controls.research.controls.enabled.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(enabled => {
        if (this.form.controls.research.disabled) return;
        this.applyResearchValidators(enabled);
      });
  }

  private applyResearchValidators(enabled: boolean): void {
    const research = this.form.controls.research.controls;
    (['positionId', 'degreeLevel', 'fieldOfStudy'] as const).forEach(field => {
      const control = research[field];
      if (enabled) control.setValidators(Validators.required);
      else control.clearValidators();
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  protected onDialogShow(): void {
    this.loadPositions();

    const u = this.user();
    if (!u) {
      this.form.reset();
      this.form.enable();
      return;
    }

    this.loadingUser.set(true);
    this.form.disable();
    this.usersService.getUserById(u.userId).subscribe({
      next: detail => {
        const roleIds = this.roles()
          .filter(r => (detail.roles ?? []).includes(r.name))
          .map(r => r.roleId);
        this.form.patchValue({
          firstName: detail.firstName,
          lastName: detail.lastName,
          email: u.email,
          phoneNumber: detail.phoneNumber ?? '',
          roleIds,
          emergencyContactName: detail.emergencyContactName ?? '',
          emergencyContactNumber: detail.emergencyContactNumber ?? '',
        });
        this.patchResearchData(detail.researchData ?? null);
        this.loadingUser.set(false);
        this.applyFormState();
      },
      error: () => {
        this.loadingUser.set(false);
        this.applyFormState();
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os dados do usuário.',
        });
      },
    });
  }

  private loadPositions(): void {
    this.positionsService.getPositions({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => this.positionOptions.set(res.data.map(p => ({ label: p.name, value: p.id }))),
    });
  }

  private patchResearchData(researchData: ResearchRegistrationData | null): void {
    const research = this.form.controls.research;
    research.reset({
      enabled: false,
      positionId: '',
      degreeLevel: '',
      fieldOfStudy: '',
      lattesUrl: '',
      citationName: '',
      displayName: '',
    });

    if (researchData) {
      research.patchValue({
        enabled: true,
        positionId: researchData.positionId,
        degreeLevel: researchData.degreeLevel as DegreeLevel,
        fieldOfStudy: researchData.fieldOfStudy,
        lattesUrl: researchData.lattesUrl ?? '',
        citationName: researchData.citationName ?? '',
        displayName: researchData.displayName ?? '',
      });
    }
  }

  private applyFormState(): void {
    this.form.enable();
    this.form.get('email')?.disable();
    if (this.readOnly()) {
      this.form.disable();
    }
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const editingUser = this.user();

    const researchData: ResearchRegistrationData | null = value.research.enabled
      ? {
          positionId: value.research.positionId,
          degreeLevel: value.research.degreeLevel as DegreeLevel,
          fieldOfStudy: value.research.fieldOfStudy,
          lattesUrl: value.research.lattesUrl || null,
          citationName: value.research.citationName || null,
          displayName: value.research.displayName || null,
        }
      : null;

    const userData: UserInfo = {
      firstName: value.firstName,
      lastName: value.lastName,
      phoneNumber: value.phoneNumber || null,
      emergencyContactName: value.emergencyContactName || null,
      emergencyContactNumber: value.emergencyContactNumber || null,
      researchData,
    };

    if (editingUser) {
      const body: UpdateUserRequest = {
        userData,
        roleIds: value.roleIds,
      };
      this.saving.set(true);
      this.usersService.updateUser(editingUser.userId, body).subscribe({
        next: () => {
          this.saving.set(false);
          this.visible.set(false);
          this.saved.emit();
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Usuário atualizado com sucesso.',
          });
        },
        error: err => {
          this.saving.set(false);
          if (err.status === 400) this.handleValidationErrors(err.error?.errors ?? {});
          else
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: err.error?.error ?? 'Erro inesperado.',
            });
        },
      });
    } else {
      const body: CreateUserRequest = {
        userData,
        email: value.email,
        roleIds: value.roleIds,
      };
      this.saving.set(true);
      this.usersService.createUser(body).subscribe({
        next: res => {
          this.saving.set(false);
          this.visible.set(false);
          this.saved.emit();
          this.messageService.add({
            severity: 'success',
            summary: 'Usuário criado',
            detail: `Token de primeiro acesso: ${res.resetToken}`,
            life: 10000,
          });
        },
        error: err => {
          this.saving.set(false);
          if (err.status === 400) this.handleValidationErrors(err.error?.errors ?? {});
          else if (err.status === 409) {
            this.form.get('email')?.setErrors({ serverError: 'E-mail já está em uso.' });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: err.error?.error ?? 'Erro inesperado.',
            });
          }
        },
      });
    }
  }

  protected onCancel(): void {
    this.visible.set(false);
  }

  private handleValidationErrors(errors: Record<string, string[]>): void {
    Object.entries(errors).forEach(([field, msgs]) => {
      this.form.get(field)?.setErrors({ serverError: msgs[0] });
    });
  }
}
