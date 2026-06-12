import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { MaterialsService } from '../materials.service';
import { MaterialTypesService } from '../../material-types/material-types.service';
import { CreateMaterialRequest, Material, MaterialUnit, UpdateMaterialRequest } from '../../../../shared/models/inventory.model';
import { MATERIAL_UNIT_OPTIONS } from '../material-unit-label.pipe';

@Component({
  selector: 'app-material-form',
  imports: [ReactiveFormsModule, Dialog, Button, InputText, InputNumber, Select],
  templateUrl: './material-form.component.html',
})
export class MaterialFormComponent {
  readonly visible = model(false);
  readonly material = input<Material | null>(null);
  readonly saved = output<void>();

  private readonly materialsService = inject(MaterialsService);
  private readonly materialTypesService = inject(MaterialTypesService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly loadingMaterial = signal(false);
  protected readonly typeOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly materialTypeName = signal('');
  protected readonly unitOptions = MATERIAL_UNIT_OPTIONS;

  protected readonly isEditing = computed(() => this.material() !== null);
  protected readonly dialogHeader = computed(() => (this.isEditing() ? 'Editar Material' : 'Novo Material'));

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    typeId: ['', Validators.required],
    unit: this.fb.nonNullable.control<MaterialUnit | ''>('', Validators.required),
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    minStock: [0, [Validators.required, Validators.min(0)]],
    location: ['', Validators.required],
  });

  protected onDialogShow(): void {
    const m = this.material();
    if (!m) {
      this.form.enable();
      this.form.reset({ name: '', typeId: '', unit: '', stockQuantity: 0, minStock: 0, location: '' });
      this.materialTypeName.set('');
      this.loadTypeOptions();
      return;
    }

    this.materialTypeName.set(m.typeName);
    this.form.reset({
      name: m.name,
      typeId: '',
      unit: m.unit,
      stockQuantity: m.stockQuantity,
      minStock: m.minStock,
      location: m.location,
    });
    this.applyEditFormState();

    this.loadingMaterial.set(true);
    this.materialsService.getMaterialById(m.materialId).subscribe({
      next: detail => {
        this.materialTypeName.set(detail.typeName);
        this.form.patchValue({
          name: detail.name,
          minStock: detail.minStock,
          location: detail.location,
        });
        this.loadingMaterial.set(false);
      },
      error: () => {
        this.loadingMaterial.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os dados atualizados do material.',
        });
      },
    });
  }

  private applyEditFormState(): void {
    this.form.enable();
    this.form.controls.typeId.disable();
    this.form.controls.unit.disable();
    this.form.controls.stockQuantity.disable();
  }

  private loadTypeOptions(): void {
    this.materialTypesService.getTypes({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res =>
        this.typeOptions.set(
          res.data.filter(t => t.active).map(t => ({ label: t.name, value: t.id })),
        ),
    });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const editingMaterial = this.material();

    if (editingMaterial) {
      const body: UpdateMaterialRequest = {
        name: value.name,
        location: value.location,
        minStock: value.minStock,
      };
      this.saving.set(true);
      this.materialsService.updateMaterial(editingMaterial.materialId, body).subscribe({
        next: () => this.onSaveSuccess('Material atualizado com sucesso.'),
        error: err => this.onSaveError(err, 'Não foi possível atualizar o material.'),
      });
    } else {
      const body: CreateMaterialRequest = {
        name: value.name,
        location: value.location,
        minStock: value.minStock,
        stockQuantity: value.stockQuantity,
        unit: value.unit as MaterialUnit,
        typeId: value.typeId,
      };
      this.saving.set(true);
      this.materialsService.createMaterial(body).subscribe({
        next: () => this.onSaveSuccess('Material criado com sucesso.'),
        error: err => this.onSaveError(err, 'Não foi possível criar o material.'),
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
