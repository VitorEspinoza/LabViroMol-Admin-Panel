import { Component, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';

import { SchedulesService } from '../schedules.service';
import { Schedule } from '../../../../shared/models/scheduling.model';

@Component({
  selector: 'app-refuse-dialog',
  imports: [ReactiveFormsModule, Dialog, Button, Textarea],
  templateUrl: './refuse-dialog.component.html',
})
export class RefuseDialogComponent {
  readonly visible = model(false);
  readonly schedule = input<Schedule | null>(null);
  readonly refused = output<void>();

  private readonly schedulesService = inject(SchedulesService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    justification: ['', Validators.required],
  });

  protected onDialogShow(): void {
    this.form.reset({ justification: '' });
  }

  protected onConfirm(): void {
    const schedule = this.schedule();
    if (!schedule) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.schedulesService.refuseSchedule(schedule.id, { justification: value.justification }).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.refused.emit();
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível rejeitar o agendamento.'),
        });
      },
    });
  }

  protected onCancel(): void {
    this.visible.set(false);
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
