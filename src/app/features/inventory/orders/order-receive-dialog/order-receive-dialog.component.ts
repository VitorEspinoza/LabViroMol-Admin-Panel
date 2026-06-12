import { Component, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';

import { OrdersService } from '../orders.service';
import { Order } from '../../../../shared/models/inventory.model';

@Component({
  selector: 'app-order-receive-dialog',
  imports: [ReactiveFormsModule, Dialog, Button, InputNumber, Textarea],
  templateUrl: './order-receive-dialog.component.html',
})
export class OrderReceiveDialogComponent {
  readonly visible = model(false);
  readonly order = input<Order | null>(null);
  readonly received = output<number>();

  private readonly ordersService = inject(OrdersService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    quantityReceived: [0, [Validators.required, Validators.min(0.01)]],
    notes: [''],
  });

  protected onDialogShow(): void {
    const order = this.order();
    this.form.reset({ quantityReceived: order?.requestedQuantity ?? 0, notes: '' });
  }

  protected onReceive(): void {
    const order = this.order();
    if (!order) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.ordersService
      .receiveOrder(order.orderId, { quantityReceived: value.quantityReceived, notes: value.notes || null })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.visible.set(false);
          this.received.emit(value.quantityReceived);
        },
        error: err => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: this.extractErrorMessage(err, 'Não foi possível receber o pedido.'),
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
