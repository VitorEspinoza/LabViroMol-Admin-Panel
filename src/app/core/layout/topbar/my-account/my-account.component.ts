import { Component, inject, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';

import { AuthService } from '../../../auth/auth.service';
import { UserInfo, UpdateProfileRequest, ResearchRegistrationData } from '../../../../shared/models/user.model';
import { DegreeLevel } from '../../../../shared/models/research.model';
import { PhoneMaskDirective } from '../../../../shared/directives/phone-mask.directive';
import { PositionsService } from '../../../../features/research/positions/positions.service';
import { DEGREE_LEVEL_OPTIONS } from '../../../../shared/utils/degree-level';

@Component({
  selector: 'app-my-account',
  imports: [
    ReactiveFormsModule,
    Dialog, Button, InputText, Select, ToggleSwitch,
    Tabs, TabList, Tab, TabPanels, TabPanel,
    PhoneMaskDirective,
  ],
  templateUrl: './my-account.component.html',
})
export class MyAccountComponent {
  readonly visible = model(false);

  private readonly auth = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly positionsService = inject(PositionsService);

  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly positionOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly degreeLevelOptions = DEGREE_LEVEL_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phoneNumber: [''],
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
    this.loading.set(true);
    this.form.disable();
    this.auth.getMe().subscribe({
      next: me => {
        this.form.patchValue({
          firstName: me.userData.firstName,
          lastName: me.userData.lastName,
          phoneNumber: me.userData.phoneNumber ?? '',
          emergencyContactName: me.userData.emergencyContactName ?? '',
          emergencyContactNumber: me.userData.emergencyContactNumber ?? '',
        });
        this.patchResearchData(me.userData.researchData ?? null);
        this.loading.set(false);
        this.form.enable();
      },
      error: () => {
        this.loading.set(false);
        this.form.enable();
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os dados da conta.',
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

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

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
    const body: UpdateProfileRequest = { userData };

    this.saving.set(true);
    this.auth.updateProfile(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Dados da conta atualizados com sucesso.',
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
