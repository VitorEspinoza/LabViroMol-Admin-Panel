import { Component, computed, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { EquipmentsService } from '../equipments.service';
import { CreateEquipmentRequest, Equipment, UpdateEquipmentRequest } from '../../../../shared/models/assets.model';
import { environment } from '../../../../../environments/environment';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly saving = signal(false);
  protected readonly imagePreviewUrl = signal<string | null>(null);
  private readonly pendingImageFile = signal<File | null>(null);
  private objectUrl: string | null = null;

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

    this.pendingImageFile.set(null);
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.imagePreviewUrl.set(equipment?.imageUrl ? `${environment.apiUrl}${equipment.imageUrl}` : null);
  }

  protected triggerImageSelect(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erro',
        detail: 'Formato de arquivo inválido. Envie uma imagem JPG, PNG ou WEBP.',
      });
      return;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
    this.objectUrl = URL.createObjectURL(file);
    this.pendingImageFile.set(file);
    this.imagePreviewUrl.set(this.objectUrl);
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const editingEquipment = this.equipment();

    this.saving.set(true);

    if (editingEquipment) {
      const body: UpdateEquipmentRequest = {
        name: value.name,
        brand: value.brand,
        model: value.model,
        code: value.code,
        description: value.description,
        location: value.location || null,
      };
      this.equipmentsService.updateEquipment(editingEquipment.equipmentId, body).subscribe({
        next: () => this.uploadPendingImage(editingEquipment.equipmentId, 'Equipamento atualizado com sucesso.'),
        error: err => this.onSaveError(err, 'Não foi possível atualizar o equipamento.'),
      });
    } else {
      const body: CreateEquipmentRequest = {
        name: value.name,
        brand: value.brand,
        model: value.model,
        code: value.code,
        description: value.description,
        location: value.location || null,
      };
      this.equipmentsService.createEquipment(body).subscribe({
        next: response => this.uploadPendingImage(response.id, 'Equipamento criado com sucesso.'),
        error: err => this.onSaveError(err, 'Não foi possível criar o equipamento.'),
      });
    }
  }

  private uploadPendingImage(equipmentId: string, successMessage: string): void {
    const file = this.pendingImageFile();
    if (!file) {
      this.onSaveSuccess(successMessage);
      return;
    }

    this.equipmentsService.uploadImage(equipmentId, file).subscribe({
      next: () => this.onSaveSuccess(successMessage),
      error: err => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
        this.messageService.add({
          severity: 'warn',
          summary: 'Atenção',
          detail: `${successMessage} Porém não foi possível enviar a imagem: ${this.extractErrorMessage(err, 'erro desconhecido.')}`,
        });
      },
    });
  }

  protected onCancel(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.pendingImageFile.set(null);
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
