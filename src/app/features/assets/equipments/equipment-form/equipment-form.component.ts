import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { EquipmentsService } from '../equipments.service';
import { CreateEquipmentRequest, Equipment, UpdateEquipmentRequest } from '../../../../shared/models/assets.model';

@Component({
  selector: 'app-equipment-form',
  imports: [ReactiveFormsModule, Dialog, Button, InputText, Textarea],
  templateUrl: './equipment-form.component.html',
})
export class EquipmentFormComponent {
  readonly visible = model(false);
  readonly equipment = input<Equipment | null>(null);
  readonly saved = output<void>();

  private readonly equipmentsService = inject(EquipmentsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly isEditing = computed(() => this.equipment() !== null);
  protected readonly dialogHeader = computed(() => (this.isEditing() ? 'Editar Equipamento' : 'Novo Equipamento'));

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    model: ['', Validators.required],
    brand: ['', Validators.required],
    code: ['', Validators.required],
    location: [''],
    description: ['', Validators.required],
  });

  protected onDialogShow(): void {
    const equipment = this.equipment();
    this.form.reset({
      name: equipment?.name ?? '',
      model: equipment?.model ?? '',
      brand: equipment?.brand ?? '',
      code: equipment?.code ?? '',
      location: equipment?.location ?? '',
      description: equipment?.description ?? '',
    });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const editingEquipment = this.equipment();

    if (editingEquipment) {
      const body: UpdateEquipmentRequest = {
        name: value.name,
        brand: value.brand,
        model: value.model,
        code: value.code,
        description: value.description,
        location: value.location || null,
      };
      this.saving.set(true);
      this.equipmentsService.updateEquipment(editingEquipment.equipmentId, body).subscribe({
        next: () => this.onSaveSuccess('Equipamento atualizado com sucesso.'),
        error: err => this.onSaveError(err, 'Não foi possível atualizar o equipamento.'),
      });
    } else {
      const body: CreateEquipmentRequest = {
        name: value.name,
        brand: value.brand,
        model: value.model,
        code: value.code,
        description: value.description,
      };
      this.saving.set(true);
      this.equipmentsService.createEquipment(body).subscribe({
        next: () => this.onSaveSuccess('Equipamento criado com sucesso.'),
        error: err => this.onSaveError(err, 'Não foi possível criar o equipamento.'),
      });
    }
  }

  protected onCancel(): void {
    this.visible.set(false);
  }

  private onSaveSuccess(detail: string): void {
    this.saving.set(false);
    this.visible.set(false);
    this.saved.emit();
    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail });
  }

  private onSaveError(err: unknown, fallback: string): void {
    this.saving.set(false);
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: this.extractErrorMessage(err, fallback),
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
