import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Tag } from 'primeng/tag';
import { Skeleton } from 'primeng/skeleton';

import { SchedulesService } from '../schedules/schedules.service';
import { Schedule } from '../../../shared/models/scheduling.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SCHEDULE_STATUS_LABELS, SCHEDULE_STATUS_SEVERITIES } from '../../../shared/utils/schedule-status';

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface ScheduleGroup {
  date: string;
  weekday: string;
  day: string;
  month: string;
  schedules: Schedule[];
}

@Component({
  selector: 'app-calendar-view',
  imports: [DatePipe, Tag, Skeleton, PageHeaderComponent],
  templateUrl: './calendar-view.component.html',
})
export class CalendarViewComponent {
  private readonly schedulesService = inject(SchedulesService);

  protected readonly schedules = signal<Schedule[]>([]);
  protected readonly loading = signal(true);

  protected readonly skeletonItems = Array.from({ length: 4 });
  protected readonly statusLabels = SCHEDULE_STATUS_LABELS;
  protected readonly statusSeverities = SCHEDULE_STATUS_SEVERITIES;

  protected readonly confirmedSchedules = computed(() =>
    this.schedules()
      .filter(schedule => schedule.status === 'SCHEDULED')
      .sort((a, b) => a.scheduling.startDateHour.localeCompare(b.scheduling.startDateHour)),
  );

  protected readonly scheduleGroups = computed<ScheduleGroup[]>(() => {
    const groups = new Map<string, Schedule[]>();
    for (const schedule of this.confirmedSchedules()) {
      const list = groups.get(schedule.scheduling.date) ?? [];
      list.push(schedule);
      groups.set(schedule.scheduling.date, list);
    }

    return Array.from(groups.entries()).map(([date, schedules]) => ({
      date,
      weekday: this.weekdayLabel(date),
      day: this.dayOfMonth(date),
      month: this.monthLabel(date),
      schedules,
    }));
  });

  constructor() {
    this.loadSchedules();
  }

  private loadSchedules(): void {
    this.loading.set(true);
    this.schedulesService.getSchedules({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => {
        this.schedules.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected statusLabel(status: Schedule['status']): string {
    return this.statusLabels[status];
  }

  protected statusSeverity(status: Schedule['status']) {
    return this.statusSeverities[status];
  }

  private dateParts(date: string): { year: number; month: number; day: number } {
    const [year, month, day] = date.split('-').map(Number);
    return { year, month, day };
  }

  private weekdayLabel(date: string): string {
    const { year, month, day } = this.dateParts(date);
    return WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];
  }

  private dayOfMonth(date: string): string {
    return this.dateParts(date).day.toString().padStart(2, '0');
  }

  private monthLabel(date: string): string {
    return MONTH_LABELS[this.dateParts(date).month - 1];
  }
}
