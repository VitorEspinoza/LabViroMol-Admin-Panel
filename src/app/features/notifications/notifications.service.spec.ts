import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

import { NotificationsService } from './notifications.service';
import { Notification } from '../../shared/models/notification.model';

const notifications: Notification[] = [
  {
    id: 'n1',
    title: 'Estoque mínimo',
    message: 'Material abaixo do estoque mínimo.',
    referenceId: 'mat-1',
    referenceModule: 'Inventory',
    type: 'LowStock',
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: 'n2',
    title: 'Agendamento solicitado',
    message: 'Novo agendamento solicitado.',
    referenceId: 'sch-1',
    referenceModule: 'Schedule',
    type: 'NewSchedule',
    createdAt: '2026-06-15T11:00:00Z',
  },
];

describe('NotificationsService', () => {
  let service: NotificationsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loadNotifications — busca a lista e calcula unreadCount a partir do total recebido', () => {
    service.loadNotifications();

    http.expectOne('http://localhost:5085/api/notify/notifications').flush(notifications);

    expect(service.notifications()).toEqual(notifications);
    expect(service.unreadCount()).toBe(2);
  });

  it('dismissNotification — envia POST para /dismiss/{id} e atualiza unreadCount', () => {
    service.loadNotifications();
    http.expectOne('http://localhost:5085/api/notify/notifications').flush(notifications);

    service.dismissNotification('n1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/notify/notifications/dismiss/n1');
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(service.unreadCount()).toBe(1);
  });

  it('dismissAll — envia POST para /dismiss/all e zera o unreadCount', () => {
    service.loadNotifications();
    http.expectOne('http://localhost:5085/api/notify/notifications').flush(notifications);

    service.dismissAll().subscribe();

    const req = http.expectOne('http://localhost:5085/api/notify/notifications/dismiss/all');
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(service.unreadCount()).toBe(0);
  });
});
