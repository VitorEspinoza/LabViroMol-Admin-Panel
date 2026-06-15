import { Component, computed, input, model } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { Schedule } from '../../../../shared/models/scheduling.model';
import { SCHEDULE_STATUS_LABELS, SCHEDULE_STATUS_SEVERITIES } from '../../../../shared/utils/schedule-status';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-schedule-detail-dialog',
  imports: [DatePipe, Dialog, Button, Tag],
  templateUrl: './schedule-detail-dialog.component.html',
})
export class ScheduleDetailDialogComponent {
  readonly visible = model(false);
  readonly schedule = input<Schedule | null>(null);

  protected readonly termDownloadUrl = computed(() => {
    const termUrl = this.schedule()?.termUrl;
    return termUrl ? `${environment.apiUrl}${termUrl}` : null;
  });

  protected statusLabel(status: Schedule['status']): string {
    return SCHEDULE_STATUS_LABELS[status];
  }

  protected statusSeverity(status: Schedule['status']) {
    return SCHEDULE_STATUS_SEVERITIES[status];
  }

  protected onClose(): void {
    this.visible.set(false);
  }
}
