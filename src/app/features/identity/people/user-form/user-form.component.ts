import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';

import { UsersService } from '../../users/users.service';
import { User, CreateUserRequest, UpdateUserRequest } from '../../../../shared/models/user.model';
import { Role } from '../../../../shared/models/role.model';
import { PhoneMaskDirective } from '../../../../shared/directives/phone-mask.directive';

@Component({
  selector: 'app-user-form',
  imports: [
    ReactiveFormsModule,
    Dialog, Button, InputText, Select,
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

  protected readonly saving = signal(false);
  protected readonly isEditing = computed(() => this.user() !== null);
  protected readonly dialogHeader = computed(() =>
    this.isEditing() ? 'Editar Pessoa' : 'Nova Pessoa',
  );

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    roleId: [''],
    emergencyContactName: [''],
    emergencyContactNumber: [''],
  });

  protected onDialogShow(): void {
    const u = this.user();
    if (u) {
      const matchingRole = this.roles().find(r => (u.roles ?? []).includes(r.name));
      this.form.patchValue({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phoneNumber: u.phoneNumber ?? '',
        roleId: matchingRole?.roleId ?? '',
        emergencyContactName: u.emergencyContactName ?? '',
        emergencyContactNumber: u.emergencyContactNumber ?? '',
      });
      this.form.get('email')?.disable();
    } else {
      this.form.reset();
      this.form.get('email')?.enable();
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
        roleIds: value.roleId ? [value.roleId] : [],
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
