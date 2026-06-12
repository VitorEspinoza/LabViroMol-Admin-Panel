import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { Checkbox } from 'primeng/checkbox';
import { Textarea } from 'primeng/textarea';

import { CartItem, CartService } from './cart.service';
import { StockService } from '../../stock.service';
import { ProjectsService } from '../../../../research/projects/projects.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { MaterialUnitLabelPipe } from '../../../materials/material-unit-label.pipe';
import { SaveKitDialogComponent } from '../save-kit-dialog/save-kit-dialog.component';

type WriteOffResult =
  | { item: CartItem; success: true }
  | { item: CartItem; success: false; error: unknown };

@Component({
  selector: 'app-cart',
  imports: [FormsModule, ReactiveFormsModule, Button, Checkbox, Dialog, InputNumber, Select, Textarea, MaterialUnitLabelPipe, SaveKitDialogComponent],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly stockService = inject(StockService);
  private readonly projectsService = inject(ProjectsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly items = this.cart.items;
  protected readonly count = this.cart.count;

  // Emitido após uma baixa confirmada, para que o WriteOffTabComponent recarregue os estoques exibidos
  readonly stockUpdated = output<void>();

  protected readonly confirmDialogVisible = signal(false);
  protected readonly confirming = signal(false);
  protected readonly projectOptions = signal<{ label: string; value: string }[]>([]);

  protected readonly saveKitDialogVisible = signal(false);

  // Caso de exceção: baixa sem vincular a um projeto, exige justificativa
  protected readonly withoutProject = signal(false);

  protected readonly confirmForm = this.fb.nonNullable.group({
    projectId: ['', Validators.required],
    reason: [''],
  });

  protected increment(materialId: string): void {
    this.cart.increment(materialId);
  }

  protected decrement(materialId: string): void {
    this.cart.decrement(materialId);
  }

  protected setQuantity(materialId: string, quantity: number | null): void {
    this.cart.setQuantity(materialId, quantity ?? 1);
  }

  protected remove(materialId: string): void {
    this.cart.remove(materialId);
  }

  protected openConfirmDialog(): void {
    this.confirmForm.reset({ projectId: '', reason: '' });
    this.withoutProject.set(false);
    this.applyConfirmValidators();
    this.loadProjectOptions();
    this.confirmDialogVisible.set(true);
  }

  protected onCancelConfirm(): void {
    this.confirmDialogVisible.set(false);
  }

  // Alterna entre vincular a um projeto (padrão) e remover sem projeto, mediante justificativa
  protected toggleWithoutProject(value: boolean): void {
    this.withoutProject.set(value);
    this.confirmForm.patchValue({ projectId: '', reason: '' });
    this.applyConfirmValidators();
  }

  private applyConfirmValidators(): void {
    const projectIdControl = this.confirmForm.controls.projectId;
    const reasonControl = this.confirmForm.controls.reason;

    if (this.withoutProject()) {
      projectIdControl.clearValidators();
      reasonControl.setValidators([Validators.required, Validators.minLength(10)]);
    } else {
      projectIdControl.setValidators([Validators.required]);
      reasonControl.clearValidators();
    }

    projectIdControl.updateValueAndValidity();
    reasonControl.updateValueAndValidity();
  }

  protected openSaveKitDialog(): void {
    this.saveKitDialogVisible.set(true);
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

  protected confirmWriteOff(): void {
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      return;
    }

    const { projectId, reason } = this.confirmForm.getRawValue();
    const items = this.items();
    const withoutProject = this.withoutProject();

    this.confirming.set(true);
    const requests = items.map(item => {
      const writeOff = withoutProject
        ? this.stockService.removeException(item.materialId, { quantity: item.quantity, reason })
        : this.stockService.consumeForProject(item.materialId, { quantity: item.quantity, projectId });

      return writeOff.pipe(
        map((): WriteOffResult => ({ item, success: true })),
        catchError(error => of<WriteOffResult>({ item, success: false, error })),
      );
    });

    forkJoin(requests).subscribe(results => {
      this.confirming.set(false);

      const succeeded = results.filter((r): r is { item: CartItem; success: true } => r.success);
      const failed = results.filter((r): r is { item: CartItem; success: false; error: unknown } => !r.success);

      if (succeeded.length > 0) {
        this.cart.removeMany(succeeded.map(r => r.item.materialId));
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Baixa confirmada para ${succeeded.length} ${succeeded.length === 1 ? 'item' : 'itens'}.`,
        });
        this.stockUpdated.emit();
      }

      failed.forEach(r => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(r.error, `Não foi possível dar baixa em "${r.item.materialName}".`),
        });
      });

      if (failed.length === 0) {
        this.confirmDialogVisible.set(false);
      }
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
