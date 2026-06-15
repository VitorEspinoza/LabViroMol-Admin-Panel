import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Notification } from '../../shared/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/notify/notifications`;

  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(false);
  readonly unreadCount = computed(() => this.notifications().length);

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.base);
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.getNotifications().subscribe({
      next: notifications => {
        this.notifications.set(notifications);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  dismissNotification(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/dismiss/${id}`, null)
      .pipe(tap(() => this.removeLocally([id])));
  }

  dismissAll(): Observable<void> {
    return this.http
      .post<void>(`${this.base}/dismiss/all`, {})
      .pipe(tap(() => this.notifications.set([])));
  }

  private removeLocally(ids: string[]): void {
    const idSet = new Set(ids);
    this.notifications.update(list => list.filter(n => !idSet.has(n.id)));
  }
}
