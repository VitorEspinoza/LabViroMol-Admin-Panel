import { Component, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { MaintenanceService } from '../maintenance.service';
import { MaintenanceRequest } from '../../../../shared/models/assets.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_SEVERITIES } from '../../../../shared/utils/maintenance-status';
import { MaintenanceFormComponent } from '../maintenance-form/maintenance-form.component';
import { DataTableContainerComponent } from '../../../../shared/components/data-table-container/data-table-container.component';

@Component({
  selector: 'app-maintenance-list',
  imports: [
    FormsModule, DatePipe,
    TableModule, Button, Tag, InputText, IconField, InputIcon, Toast,
    MaintenanceFormComponent, DataTableContainerComponent,
  ],
  templateUrl: './maintenance-list.component.html',
  providers: [MessageService],
})
export class MaintenanceListComponent {
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly messageService = inject(MessageService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  protected readonly auth = inject(AuthService);

  protected readonly requests = signal<MaintenanceRequest[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly dialogVisible = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  protected readonly statusLabels = MAINTENANCE_STATUS_LABELS;
  protected readonly statusSeverities = MAINTENANCE_STATUS_SEVERITIES;

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadRequests();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadRequests(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);

    const sortField = event?.sortField;
    const sortBy = typeof sortField === 'string' ? sortField : undefined;
    const sortDirection = sortBy ? (event?.sortOrder === -1 ? 'desc' : 'asc') : undefined;

    this.loading.set(true);
    this.maintenanceService
      .getMaintenanceRequests({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined, sortBy, sortDirection })
      .subscribe({
        next: res => {
          this.requests.set(res.data);
          this.totalRecords.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar as solicitações de manutenção.',
          });
        },
      });
  }

  protected statusLabel(status: MaintenanceRequest['status']): string {
    return this.statusLabels[status];
  }

  protected statusSeverity(status: MaintenanceRequest['status']) {
    return this.statusSeverities[status];
  }

  protected openCreate(): void {
    this.dialogVisible.set(true);
  }

  protected onFormSaved(): void {
    this.loadRequests();
  }

  protected startMaintenance(request: MaintenanceRequest): void {
    this.maintenanceService.startMaintenance(request.maintenanceRequestId).subscribe({
      next: () => {
        this.loadRequests();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Manutenção iniciada.' });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível iniciar a manutenção.'),
        });
      },
    });
  }

  protected confirmComplete(request: MaintenanceRequest): void {
    this.confirmDialogService.confirm({
      header: 'Concluir Manutenção',
      message: `Deseja realmente concluir a manutenção de "${request.equipmentName}"?`,
      accept: () => this.completeMaintenance(request),
    });
  }

  private completeMaintenance(request: MaintenanceRequest): void {
    this.maintenanceService.completeMaintenance(request.maintenanceRequestId).subscribe({
      next: () => {
        this.loadRequests();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Manutenção concluída.' });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível concluir a manutenção.'),
        });
      },
    });
  }

  protected confirmCancel(request: MaintenanceRequest): void {
    this.confirmDialogService.confirm({
      header: 'Cancelar Manutenção',
      message: `Deseja realmente cancelar a manutenção de "${request.equipmentName}"?`,
      accept: () => this.cancelMaintenance(request),
    });
  }

  private cancelMaintenance(request: MaintenanceRequest): void {
    this.maintenanceService.cancelMaintenance(request.maintenanceRequestId).subscribe({
      next: () => {
        this.loadRequests();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Manutenção cancelada.' });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível cancelar a manutenção.'),
        });
      },
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
