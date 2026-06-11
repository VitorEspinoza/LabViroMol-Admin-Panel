import { Component, inject, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';

import { AuthService } from '../../../auth/auth.service';
import { UserInfo, UpdateProfileRequest } from '../../../../shared/models/user.model';
import { PhoneMaskDirective } from '../../../../shared/directives/phone-mask.directive';

@Component({
  selector: 'app-my-account',
  imports: [
    ReactiveFormsModule,
    Dialog, Button, InputText,
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

  protected readonly saving = signal(false);
  protected readonly loading = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phoneNumber: [''],
    emergencyContactName: [''],
    emergencyContactNumber: [''],
  });

  protected onDialogShow(): void {
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

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const userData: UserInfo = {
      firstName: value.firstName,
      lastName: value.lastName,
      phoneNumber: value.phoneNumber || null,
      emergencyContactName: value.emergencyContactName || null,
      emergencyContactNumber: value.emergencyContactNumber || null,
      researchData: null,
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
