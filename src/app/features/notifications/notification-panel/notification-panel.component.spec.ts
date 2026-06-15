import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

import { NotificationPanelComponent } from './notification-panel.component';
import { NotificationsService } from '../notifications.service';
import { Notification } from '../../../shared/models/notification.model';

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

describe('NotificationPanelComponent', () => {
  let fixture: ComponentFixture<NotificationPanelComponent>;
  let component: NotificationPanelComponent;
  let http: HttpTestingController;
  let notificationsService: NotificationsService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotificationPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });

    fixture = TestBed.createComponent(NotificationPanelComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    notificationsService = TestBed.inject(NotificationsService);
    router = TestBed.inject(Router);

    fixture.detectChanges();
    http.expectOne('http://localhost:5085/api/notify/notifications').flush(notifications);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('descartar notificação individual remove da lista de visíveis', () => {
    expect(notificationsService.notifications().map((n: Notification) => n.id)).toEqual(['n1', 'n2']);

    (component as any).dismiss('n1');
    http.expectOne('http://localhost:5085/api/notify/notifications/dismiss/n1').flush(null);

    expect(notificationsService.notifications().map((n: Notification) => n.id)).toEqual(['n2']);
    expect(notificationsService.unreadCount()).toBe(1);
  });

  it('"Marcar todas como lidas" chama dismissAll e zera o badge de não lidas', () => {
    (component as any).dismissAll();
    http.expectOne('http://localhost:5085/api/notify/notifications/dismiss/all').flush(null);

    expect(notificationsService.unreadCount()).toBe(0);
    expect(notificationsService.notifications()).toEqual([]);
  });

  it('clicar em uma notificação de estoque mínimo navega para a tela de materiais, descarta e fecha o painel', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (component as any).open(notifications[0]);
    http.expectOne('http://localhost:5085/api/notify/notifications/dismiss/n1').flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/inventory/materiais'], {
      queryParams: { highlight: 'mat-1' },
    });
    expect(notificationsService.notifications().map((n: Notification) => n.id)).toEqual(['n2']);
  });

  it('clicar em uma notificação de agendamento navega para a tela de agendamentos', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (component as any).open(notifications[1]);
    http.expectOne('http://localhost:5085/api/notify/notifications/dismiss/n2').flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/scheduling/solicitacoes'], {
      queryParams: { highlight: 'sch-1' },
    });
  });

  it('notificações sem rota mapeada não navegam ao serem clicadas', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const outroTipo: Notification = { ...notifications[0], id: 'n3', type: 'Outro' };

    (component as any).open(outroTipo);

    expect(navigateSpy).not.toHaveBeenCalled();
    http.expectNone('http://localhost:5085/api/notify/notifications/dismiss/n3');
  });

  it('faz polling periódico das notificações em segundo plano', () => {
    vi.useFakeTimers();

    const pollingFixture = TestBed.createComponent(NotificationPanelComponent);
    pollingFixture.detectChanges();
    http.expectOne('http://localhost:5085/api/notify/notifications').flush(notifications);

    vi.advanceTimersByTime(60000);
    http.expectOne('http://localhost:5085/api/notify/notifications').flush(notifications);

    vi.useRealTimers();
  });
});
