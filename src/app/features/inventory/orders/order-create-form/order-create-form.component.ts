import { Component, inject, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { OrdersService } from '../orders.service';
import { MaterialsService } from '../../materials/materials.service';
import { ProjectsService } from '../../../research/projects/projects.service';
import { CreateOrderRequest } from '../../../../shared/models/inventory.model';

@Component({
  selector: 'app-order-create-form',
  imports: [ReactiveFormsModule, Dialog, Button, InputNumber, Select, Textarea],
  templateUrl: './order-create-form.component.html',
})
export class OrderCreateFormComponent {
  readonly visible = model(false);
  readonly saved = output<void>();

  private readonly ordersService = inject(OrdersService);
  private readonly materialsService = inject(MaterialsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly materialOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly projectOptions = signal<{ label: string; value: string }[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    materialId: ['', Validators.required],
    projectId: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0.01)]],
    description: ['', Validators.required],
  });

  protected onDialogShow(): void {
    this.form.reset({ materialId: '', projectId: '', quantity: 0, description: '' });
    this.loadMaterialOptions();
    this.loadProjectOptions();
  }

  private loadMaterialOptions(): void {
    this.materialsService.getMaterials({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res =>
        this.materialOptions.set(res.data.map(m => ({ label: m.name, value: m.materialId }))),
    });
  }

  private loadProjectOptions(): void {
    this.projectsService.getProjects({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res =>
        this.projectOptions.set(
          res.data
            .filter(p => p.status === 'Planned' || p.status === 'InProgress')
            .map(p => ({ label: p.title, value: p.id })),
        ),
    });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: CreateOrderRequest = {
      materialId: value.materialId,
      projectId: value.projectId,
      quantity: value.quantity,
      description: value.description,
    };
    this.saving.set(true);
    this.ordersService.createOrder(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Pedido registrado.' });
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível registrar o pedido.'),
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
