import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of } from 'rxjs';

import { CalendarViewComponent } from './calendar-view.component';
import { SchedulesService } from '../schedules/schedules.service';
import { Schedule } from '../../../shared/models/scheduling.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'sch1',
  scheduler: { name: 'João da Silva', email: 'joao@example.com', course: 'Biomedicina' },
  scheduling: { date: '2026-07-01', startDateHour: '2026-07-01T14:00:00Z', endDateHour: '2026-07-01T16:00:00Z' },
  advisorProfessor: 'Profa. Maria Souza',
  projectTitle: 'Análise de Amostras',
  description: 'Uso do microscópio para análise de amostras',
  status: 'PENDING',
  termUrl: null,
  equipments: [{ equipmentId: 'eq1', name: 'Microscópio Óptico' }],
  ...overrides,
});

const pagedSchedules = (schedules: Schedule[]): PagedResponse<Schedule> => ({
  data: schedules,
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: schedules.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('CalendarViewComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<CalendarViewComponent>;
  let component: CalendarViewComponent;
  let schedulesServiceMock: Mocked<Pick<SchedulesService, 'getSchedules'>>;

  const setup = async (schedules: Schedule[]) => {
    schedulesServiceMock = {
      getSchedules: vi.fn().mockReturnValue(of(pagedSchedules(schedules))),
    };

    await TestBed.configureTestingModule({
      imports: [CalendarViewComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: SchedulesService, useValue: schedulesServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('carrega as reservas e exibe apenas as agendamentos com status SCHEDULED', async () => {
    await setup([
      makeSchedule({ id: 'sch1', status: 'SCHEDULED' }),
      makeSchedule({ id: 'sch2', status: 'PENDING' }),
      makeSchedule({ id: 'sch3', status: 'REFUSED' }),
      makeSchedule({ id: 'sch4', status: 'CANCELED' }),
    ]);

    expect(schedulesServiceMock.getSchedules).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 100 });
    expect((component as any).confirmedSchedules().length).toBe(1);
    expect((component as any).confirmedSchedules()[0].id).toBe('sch1');
    expect((component as any).loading()).toBe(false);
  });

  it('ordena as reservas confirmadas cronologicamente por data e horário', async () => {
    await setup([
      makeSchedule({
        id: 'sch1',
        status: 'SCHEDULED',
        scheduling: { date: '2026-07-02', startDateHour: '2026-07-02T09:00:00Z', endDateHour: '2026-07-02T10:00:00Z' },
      }),
      makeSchedule({
        id: 'sch2',
        status: 'SCHEDULED',
        scheduling: { date: '2026-07-01', startDateHour: '2026-07-01T15:00:00Z', endDateHour: '2026-07-01T16:00:00Z' },
      }),
      makeSchedule({
        id: 'sch3',
        status: 'SCHEDULED',
        scheduling: { date: '2026-07-01', startDateHour: '2026-07-01T08:00:00Z', endDateHour: '2026-07-01T09:00:00Z' },
      }),
    ]);

    const order = (component as any).confirmedSchedules().map((s: Schedule) => s.id);
    expect(order).toEqual(['sch3', 'sch2', 'sch1']);
  });

  it('exibe a mensagem de estado vazio quando não há reservas confirmadas', async () => {
    await setup([
      makeSchedule({ id: 'sch1', status: 'PENDING' }),
      makeSchedule({ id: 'sch2', status: 'REFUSED' }),
    ]);

    expect((component as any).confirmedSchedules().length).toBe(0);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Nenhuma reserva confirmada.');
  });
});
