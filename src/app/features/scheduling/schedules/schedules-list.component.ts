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

import { SchedulesService } from './schedules.service';
import { Schedule } from '../../../shared/models/scheduling.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SCHEDULE_STATUS_LABELS, SCHEDULE_STATUS_SEVERITIES } from '../../../shared/utils/schedule-status';
import { ScheduleDetailDialogComponent } from './schedule-detail-dialog/schedule-detail-dialog.component';
import { RefuseDialogComponent } from './refuse-dialog/refuse-dialog.component';
import { AttachTermDialogComponent } from './attach-term-dialog/attach-term-dialog.component';

@Component({
  selector: 'app-schedules-list',
  imports: [
    FormsModule, DatePipe,
    TableModule, Button, Tag, InputText, IconField, InputIcon, Toast,
    PageHeaderComponent,
    ScheduleDetailDialogComponent, RefuseDialogComponent, AttachTermDialogComponent,
  ],
  templateUrl: './schedules-list.component.html',
  providers: [MessageService],
})
export class SchedulesListComponent {
  private readonly schedulesService = inject(SchedulesService);
  private readonly messageService = inject(MessageService);
  protected readonly auth = inject(AuthService);

  protected readonly schedules = signal<Schedule[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);
  protected readonly approvingIds = signal<Set<string>>(new Set());

  protected readonly detailDialogVisible = signal(false);
  protected readonly refuseDialogVisible = signal(false);
  protected readonly attachTermDialogVisible = signal(false);
  protected readonly selectedSchedule = signal<Schedule | null>(null);

  protected readonly statusLabels = SCHEDULE_STATUS_LABELS;
  protected readonly statusSeverities = SCHEDULE_STATUS_SEVERITIES;

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadSchedules();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadSchedules(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);

    const sortField = event?.sortField;
    const sortBy = typeof sortField === 'string' ? sortField : undefined;
    const sortDirection = sortBy ? (event?.sortOrder === -1 ? 'desc' : 'asc') : undefined;

    this.loading.set(true);
    this.schedulesService
      .getSchedules({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined, sortBy, sortDirection })
      .subscribe({
        next: res => {
          this.schedules.set(res.data);
          this.totalRecords.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar os agendamentos.',
          });
        },
      });
  }

  protected statusLabel(status: Schedule['status']): string {
    return this.statusLabels[status];
  }

  protected statusSeverity(status: Schedule['status']) {
    return this.statusSeverities[status];
  }

  protected openDetail(schedule: Schedule): void {
    this.selectedSchedule.set(schedule);
    this.detailDialogVisible.set(true);
  }

  protected openRefuse(schedule: Schedule): void {
    this.selectedSchedule.set(schedule);
    this.refuseDialogVisible.set(true);
  }

  protected openAttachTerm(schedule: Schedule): void {
    this.selectedSchedule.set(schedule);
    this.attachTermDialogVisible.set(true);
  }

  protected approveSchedule(schedule: Schedule): void {
    this.approvingIds.update(ids => new Set(ids).add(schedule.id));
    this.schedulesService.approveSchedule(schedule.id).subscribe({
      next: () => {
        this.approvingIds.update(ids => this.withoutId(ids, schedule.id));
        this.schedules.update(list =>
          list.map(s => (s.id === schedule.id ? { ...s, status: 'SCHEDULED' } : s)),
        );
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Agendamento aprovado.' });
      },
      error: err => {
        this.approvingIds.update(ids => this.withoutId(ids, schedule.id));
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível aprovar o agendamento.'),
        });
      },
    });
  }

  protected onRefused(): void {
    const schedule = this.selectedSchedule();
    if (schedule) {
      this.schedules.update(list =>
        list.map(s => (s.id === schedule.id ? { ...s, status: 'REFUSED' } : s)),
      );
    }
    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Agendamento rejeitado.' });
  }

  protected onTermAttached(): void {
    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Termo anexado com sucesso.' });
    this.loadSchedules();
  }

  private withoutId(ids: Set<string>, id: string): Set<string> {
    const next = new Set(ids);
    next.delete(id);
    return next;
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
