import { Component, inject, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { CartService } from '../cart/cart.service';
import { KitsService } from '../../../kits/kits.service';
import { CreateKitRequest } from '../../../../../shared/models/inventory.model';

@Component({
  selector: 'app-save-kit-dialog',
  imports: [ReactiveFormsModule, Dialog, Button, InputText, Textarea],
  templateUrl: './save-kit-dialog.component.html',
})
export class SaveKitDialogComponent {
  readonly visible = model(false);
  readonly saved = output<void>();

  private readonly cart = inject(CartService);
  private readonly kitsService = inject(KitsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  protected onDialogShow(): void {
    this.form.reset({ name: '', description: '' });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body: CreateKitRequest = {
      name: value.name,
      description: value.description ?? '',
      materials: this.cart.items().map(i => ({ id: i.materialId, quantity: i.quantity })),
    };

    this.saving.set(true);
    this.kitsService.createKit(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Kit salvo com sucesso.' });
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível salvar o kit.'),
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
