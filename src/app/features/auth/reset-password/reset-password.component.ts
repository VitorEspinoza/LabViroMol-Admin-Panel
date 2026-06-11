import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { Toast } from 'primeng/toast';
import { AuthService } from '../../../core/auth/auth.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, Button, Password, Toast],
  providers: [MessageService],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly success = signal(false);

  private readonly email = signal(this.route.snapshot.queryParamMap.get('email') ?? '');
  private readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');

  protected readonly invalidLink = computed(() => !this.email() || !this.token());

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  protected resetPassword(): void {
    if (this.invalidLink() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { newPassword } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.resetPassword(this.email(), this.token(), newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const detail =
          err.status === 400
            ? 'Token inválido ou expirado. Solicite um novo link de redefinição.'
            : 'Ocorreu um erro inesperado. Tente novamente.';
        this.messageService.add({ severity: 'error', summary: 'Erro', detail });
      },
    });
  }
}
