import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';

import { UsersService } from '../../users/users.service';
import { User, CreateUserRequest, UpdateUserRequest } from '../../../../shared/models/user.model';
import { Role } from '../../../../shared/models/role.model';
import { PhoneMaskDirective } from '../../../../shared/directives/phone-mask.directive';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-user-form',
  imports: [
    ReactiveFormsModule,
    Dialog, Button, InputText, MultiSelect,
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

  protected readonly saving = signal(false);
  protected readonly loadingUser = signal(false);
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
  });

  protected onDialogShow(): void {
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

    if (editingUser) {
      const body: UpdateUserRequest = {
        firstName: value.firstName,
        lastName: value.lastName,
        email: editingUser.email,
        phoneNumber: value.phoneNumber || undefined,
        emergencyContactName: value.emergencyContactName || undefined,
        emergencyContactNumber: value.emergencyContactNumber || undefined,
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
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        phoneNumber: value.phoneNumber || undefined,
        emergencyContactName: value.emergencyContactName || undefined,
        emergencyContactNumber: value.emergencyContactNumber || undefined,
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
