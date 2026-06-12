import { Component, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';

import { OrdersService } from '../orders.service';
import { Order } from '../../../../shared/models/inventory.model';

@Component({
  selector: 'app-order-process-dialog',
  imports: [ReactiveFormsModule, Dialog, Button, Textarea],
  templateUrl: './order-process-dialog.component.html',
})
export class OrderProcessDialogComponent {
  readonly visible = model(false);
  readonly order = input<Order | null>(null);
  readonly processed = output<void>();

  private readonly ordersService = inject(OrdersService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    notes: [''],
  });

  protected onDialogShow(): void {
    this.form.reset({ notes: '' });
  }

  protected onProcess(): void {
    const order = this.order();
    if (!order) return;

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.ordersService.processOrder(order.orderId, { notes: value.notes || null }).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.processed.emit();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Pedido em processamento.' });
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível processar o pedido.'),
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
