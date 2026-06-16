import { Component, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';

import { MaterialsService } from '../materials.service';
import { Material } from '../../../../shared/models/inventory.model';

@Component({
  selector: 'app-stock-entry-dialog',
  imports: [ReactiveFormsModule, Dialog, Button, InputNumber, Textarea],
  templateUrl: './stock-entry-dialog.component.html',
})
export class StockEntryDialogComponent {
  readonly visible = model(false);
  readonly material = input<Material | null>(null);
  readonly saved = output<void>();

  private readonly materialsService = inject(MaterialsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    quantity: [null as unknown as number, [Validators.required, Validators.min(0.001)]],
    reason: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected onDialogShow(): void {
    this.form.reset({ quantity: null as unknown as number, reason: '' });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const mat = this.material();
    if (!mat) return;

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.materialsService.addStockEntry(mat.materialId, { quantity: value.quantity, reason: value.reason }).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Estoque atualizado com sucesso.' });
      },
      error: err => {
        this.saving.set(false);
        const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
        const detail = (Array.isArray(body?.errors) && body.errors.length > 0)
          ? String(body.errors[0])
          : (body?.error ?? 'Não foi possível registrar a entrada de estoque.');
        this.messageService.add({ severity: 'error', summary: 'Erro', detail });
      },
    });
  }

  protected onCancel(): void {
    this.visible.set(false);
  }
}
