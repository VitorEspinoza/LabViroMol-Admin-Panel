import { Component, inject, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { Popover } from 'primeng/popover';
import { Button } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { Toast } from 'primeng/toast';

import { NotificationsService } from '../notifications.service';
import { Notification } from '../../../shared/models/notification.model';

const POLLING_INTERVAL_MS = 60000;

const NOTIFICATION_ROUTES: Record<string, string> = {
  LowStock: '/inventory/materiais',
  NewSchedule: '/scheduling/solicitacoes',
};

@Component({
  selector: 'app-notification-panel',
  imports: [DatePipe, Popover, Button, Skeleton, Toast],
  providers: [MessageService],
  templateUrl: './notification-panel.component.html',
})
export class NotificationPanelComponent {
  protected readonly notificationsService = inject(NotificationsService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  private readonly panelRef = viewChild.required<Popover>('panel');

  constructor() {
    this.notificationsService.loadNotifications();

    interval(POLLING_INTERVAL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.notificationsService.loadNotifications());
  }

  toggle(event: Event): void {
    this.notificationsService.loadNotifications();
    this.panelRef().toggle(event);
  }

  protected routeFor(notification: Notification): string | null {
    return NOTIFICATION_ROUTES[notification.type] ?? null;
  }

  protected open(notification: Notification): void {
    const route = this.routeFor(notification);
    if (!route) return;

    this.notificationsService.dismissNotification(notification.id).subscribe({
      error: () => this.showError(),
    });

    this.panelRef().hide();
    this.router.navigate([route], {
      queryParams: notification.referenceId ? { highlight: notification.referenceId } : undefined,
    });
  }

  protected dismiss(id: string): void {
    this.notificationsService.dismissNotification(id).subscribe({
      error: () => this.showError(),
    });
  }

  protected dismissAll(): void {
    this.notificationsService.dismissAll().subscribe({
      error: () => this.showError(),
    });
  }

  private showError(): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: 'Não foi possível descartar a notificação.',
    });
  }
}
