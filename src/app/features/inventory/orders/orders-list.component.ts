import { Component, inject, signal, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { OrdersService } from './orders.service';
import { MaterialsService } from '../materials/materials.service';
import { MaterialUnit, Order, OrderStatus } from '../../../shared/models/inventory.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { MaterialUnitLabelPipe, MATERIAL_UNIT_OPTIONS } from '../materials/material-unit-label.pipe';
import { ORDER_STATUS_LABELS, ORDER_STATUS_SEVERITIES } from '../../../shared/utils/order-status';
import { OrderCreateFormComponent } from './order-create-form/order-create-form.component';
import { OrderProcessDialogComponent } from './order-process-dialog/order-process-dialog.component';
import { OrderReceiveDialogComponent } from './order-receive-dialog/order-receive-dialog.component';
import { DataTableContainerComponent } from '../../../shared/components/data-table-container/data-table-container.component';
import { TableSortCycle } from '../../../shared/utils/table-sort-cycle';

@Component({
  selector: 'app-orders-list',
  imports: [
    FormsModule,
    TableModule, Button, Tag, Toast, InputText, IconField, InputIcon, DatePipe,
    PageHeaderComponent, MaterialUnitLabelPipe,
    OrderCreateFormComponent, OrderProcessDialogComponent, OrderReceiveDialogComponent,
    DataTableContainerComponent,
  ],
  templateUrl: './orders-list.component.html',
  providers: [MessageService],
})
export class OrdersListComponent {
  private readonly ordersService = inject(OrdersService);
  private readonly materialsService = inject(MaterialsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  protected readonly auth = inject(AuthService);

  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  protected readonly materialUnits = signal<Record<string, MaterialUnit>>({});

  protected readonly createDialogVisible = signal(false);
  protected readonly processDialogVisible = signal(false);
  protected readonly receiveDialogVisible = signal(false);
  protected readonly selectedOrder = signal<Order | null>(null);

  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly statusSeverities = ORDER_STATUS_SEVERITIES;

  private readonly searchSubject = new Subject<string>();
  private readonly sortCycle = new TableSortCycle();

  @ViewChild('dt') private table?: Table;

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadOrders();
      });

    this.loadMaterialUnits();
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadOrders(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);

    const { sortBy, sortDirection } = this.sortCycle.resolve(event, this.table);

    this.loading.set(true);
    this.ordersService
      .getOrders({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined, sortBy, sortDirection })
      .subscribe({
        next: res => {
          this.orders.set(res.data);
          this.totalRecords.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar os pedidos.',
          });
        },
      });
  }

  private loadMaterialUnits(): void {
    this.materialsService.getMaterials({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => {
        const map: Record<string, MaterialUnit> = {};
        res.data.forEach(m => (map[m.materialId] = m.unit));
        this.materialUnits.set(map);
      },
    });
  }

  protected unitFor(materialId: string): MaterialUnit | undefined {
    return this.materialUnits()[materialId];
  }

  protected statusLabel(status: OrderStatus): string {
    return this.statusLabels[status];
  }

  protected statusSeverity(status: OrderStatus) {
    return this.statusSeverities[status];
  }

  protected openCreate(): void {
    this.createDialogVisible.set(true);
  }

  protected openProcess(order: Order): void {
    this.selectedOrder.set(order);
    this.processDialogVisible.set(true);
  }

  protected openReceive(order: Order): void {
    this.selectedOrder.set(order);
    this.receiveDialogVisible.set(true);
  }

  protected confirmCancel(order: Order): void {
    this.confirmDialogService.confirm({
      header: 'Cancelar Pedido',
      message: `Deseja realmente cancelar o pedido de "${order.materialName}"?`,
      accept: () => this.cancelOrder(order),
    });
  }

  private cancelOrder(order: Order): void {
    this.ordersService.cancelOrder(order.orderId).subscribe({
      next: () => {
        this.loadOrders();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Pedido cancelado.' });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível cancelar o pedido.'),
        });
      },
    });
  }

  protected onOrderCreated(): void {
    this.loadOrders();
  }

  protected onOrderProcessed(): void {
    this.loadOrders();
  }

  protected onOrderReceived(quantityReceived: number): void {
    const order = this.selectedOrder();
    this.loadOrders();
    if (!order) return;

    const unit = this.materialUnits()[order.materialId];
    const unitLabel = MATERIAL_UNIT_OPTIONS.find(o => o.value === unit)?.label ?? '';
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: `Pedido concluído — ${quantityReceived} ${unitLabel} de ${order.materialName} adicionados ao estoque.`,
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
