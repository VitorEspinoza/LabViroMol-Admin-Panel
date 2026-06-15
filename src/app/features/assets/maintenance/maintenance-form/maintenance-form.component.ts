import { Component, inject, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { MaintenanceService } from '../maintenance.service';
import { EquipmentsService } from '../../equipments/equipments.service';
import { CreateMaintenanceRequest } from '../../../../shared/models/assets.model';

@Component({
  selector: 'app-maintenance-form',
  imports: [ReactiveFormsModule, Dialog, Button, Select, Textarea],
  templateUrl: './maintenance-form.component.html',
})
export class MaintenanceFormComponent {
  readonly visible = model(false);
  readonly saved = output<void>();

  private readonly maintenanceService = inject(MaintenanceService);
  private readonly equipmentsService = inject(EquipmentsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly equipmentOptions = signal<{ label: string; value: string }[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    equipmentId: ['', Validators.required],
    description: ['', Validators.required],
    problemDescription: ['', Validators.required],
  });

  protected onDialogShow(): void {
    this.form.reset({ equipmentId: '', description: '', problemDescription: '' });
    this.loadEquipmentOptions();
  }

  private loadEquipmentOptions(): void {
    this.equipmentsService.getEquipments({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res =>
        this.equipmentOptions.set(
          res.data.map(e => ({ label: `${e.name} (${e.code})`, value: e.equipmentId })),
        ),
    });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: CreateMaintenanceRequest = {
      equipmentId: value.equipmentId,
      description: value.description,
      problemDescription: value.problemDescription,
    };

    this.saving.set(true);
    this.maintenanceService.createMaintenanceRequest(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Solicitação de manutenção criada.' });
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível criar a solicitação.'),
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
