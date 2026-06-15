import { Component, inject, signal, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Dialog } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { PositionsService } from './positions.service';
import { Position } from '../../../shared/models/research.model';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableContainerComponent } from '../../../shared/components/data-table-container/data-table-container.component';
import { TableSortCycle } from '../../../shared/utils/table-sort-cycle';

@Component({
  selector: 'app-positions-list',
  imports: [
    ReactiveFormsModule,
    TableModule, Button, Toast, InputText, Textarea, IconField, InputIcon, Dialog,
    PageHeaderComponent, DataTableContainerComponent,
  ],
  templateUrl: './positions-list.component.html',
  providers: [MessageService],
})
export class PositionsListComponent {
  private readonly positionsService = inject(PositionsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly positions = signal<Position[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly dialogVisible = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  private readonly searchSubject = new Subject<string>();
  private readonly sortCycle = new TableSortCycle();

  @ViewChild('dt') private table?: Table;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadPositions();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadPositions(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);

    const { sortBy, sortDirection } = this.sortCycle.resolve(event, this.table);

    this.loading.set(true);
    this.positionsService.getPositions({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined, sortBy, sortDirection }).subscribe({
      next: res => {
        this.positions.set(res.data);
        this.totalRecords.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar as posições.',
        });
      },
    });
  }

  protected openCreate(): void {
    this.form.reset({ name: '', description: '' });
    this.dialogVisible.set(true);
  }

  protected onCancel(): void {
    this.dialogVisible.set(false);
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.positionsService.createPosition(value).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.loadPositions();
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Posição criada com sucesso.',
        });
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível criar a posição.'),
        });
      },
    });
  }

  protected confirmDelete(position: Position): void {
    this.confirmDialogService.confirm({
      header: 'Excluir Posição',
      message: `Deseja realmente excluir a posição "${position.name}"?`,
      accept: () => this.deletePosition(position),
    });
  }

  private deletePosition(position: Position): void {
    this.positionsService.deletePosition(position.id).subscribe({
      next: () => {
        this.loadPositions();
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Posição excluída com sucesso.',
        });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível excluir a posição.'),
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
