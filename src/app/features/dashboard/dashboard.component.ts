import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Skeleton } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';

import { AuthService } from '../../core/auth/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SchedulesService } from '../scheduling/schedules/schedules.service';
import { MaterialsService } from '../inventory/materials/materials.service';
import { MaintenanceService } from '../assets/maintenance/maintenance.service';
import { Schedule } from '../../shared/models/scheduling.model';
import { Material } from '../../shared/models/inventory.model';
import { SCHEDULE_STATUS_LABELS, SCHEDULE_STATUS_SEVERITIES } from '../../shared/utils/schedule-status';
import { MaterialUnitLabelPipe } from '../inventory/materials/material-unit-label.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, Skeleton, Tag, PageHeaderComponent, MaterialUnitLabelPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly schedulesService = inject(SchedulesService);
  private readonly materialsService = inject(MaterialsService);
  private readonly maintenanceService = inject(MaintenanceService);
  protected readonly auth = inject(AuthService);

  private readonly now = new Date();
  protected readonly currentMonth = this.now.getMonth();
  protected readonly currentYear = this.now.getFullYear();

  protected readonly statusLabels = SCHEDULE_STATUS_LABELS;
  protected readonly statusSeverities = SCHEDULE_STATUS_SEVERITIES;

  protected readonly pendingSchedulesLoading = signal(true);
  protected readonly pendingSchedulesCount = signal(0);

  protected readonly lowStockLoading = signal(true);
  protected readonly lowStockMaterials = signal<Material[]>([]);

  protected readonly maintenanceLoading = signal(true);
  protected readonly maintenanceCount = signal(0);

  protected readonly approvedSchedulesLoading = signal(true);
  protected readonly approvedSchedulesCount = signal(0);

  protected readonly upcomingSchedulesLoading = signal(true);
  protected readonly upcomingSchedules = signal<Schedule[]>([]);

  ngOnInit(): void {
    if (this.auth.hasPermission('Scheduling.Schedules.View')) {
      this.loadPendingSchedules();
      this.loadSchedulesOverview();
    }
    if (this.auth.hasPermission('Inventory.Materials.View')) {
      this.loadLowStockMaterials();
    }
    if (this.auth.hasPermission('Assets.Maintenance.View')) {
      this.loadMaintenanceRequests();
    }
  }

  protected equipmentNames(schedule: Schedule): string {
    return schedule.equipments.map(e => e.name).join(', ');
  }

  private parseLocalDate(date: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private loadPendingSchedules(): void {
    this.pendingSchedulesLoading.set(true);
    this.schedulesService.getPendingSchedules().subscribe({
      next: schedules => {
        this.pendingSchedulesCount.set(schedules.length);
        this.pendingSchedulesLoading.set(false);
      },
      error: () => this.pendingSchedulesLoading.set(false),
    });
  }

  private loadSchedulesOverview(): void {
    this.approvedSchedulesLoading.set(true);
    this.upcomingSchedulesLoading.set(true);
    this.schedulesService.getSchedules({ pageSize: 100 }).subscribe({
      next: res => {
        const scheduled = res.data.filter(s => s.status === 'SCHEDULED');

        const approvedThisMonth = scheduled.filter(s => {
          const date = this.parseLocalDate(s.scheduling.date);
          return date.getMonth() === this.currentMonth && date.getFullYear() === this.currentYear;
        });
        this.approvedSchedulesCount.set(approvedThisMonth.length);
        this.approvedSchedulesLoading.set(false);

        const upcoming = scheduled
          .filter(s => new Date(s.scheduling.startDateHour).getTime() >= this.now.getTime())
          .sort(
            (a, b) =>
              new Date(a.scheduling.startDateHour).getTime() -
              new Date(b.scheduling.startDateHour).getTime(),
          )
          .slice(0, 4);
        this.upcomingSchedules.set(upcoming);
        this.upcomingSchedulesLoading.set(false);
      },
      error: () => {
        this.approvedSchedulesLoading.set(false);
        this.upcomingSchedulesLoading.set(false);
      },
    });
  }

  private loadLowStockMaterials(): void {
    this.lowStockLoading.set(true);
    this.materialsService.getMaterials({ pageSize: 100 }).subscribe({
      next: res => {
        this.lowStockMaterials.set(res.data.filter(m => m.isLowStock));
        this.lowStockLoading.set(false);
      },
      error: () => this.lowStockLoading.set(false),
    });
  }

  private loadMaintenanceRequests(): void {
    this.maintenanceLoading.set(true);
    this.maintenanceService.getMaintenanceRequests({ pageSize: 100 }).subscribe({
      next: res => {
        const count = res.data.filter(m => m.status === 'Requested' || m.status === 'InProgress').length;
        this.maintenanceCount.set(count);
        this.maintenanceLoading.set(false);
      },
      error: () => this.maintenanceLoading.set(false),
    });
  }
}
