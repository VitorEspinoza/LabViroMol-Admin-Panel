import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { SchedulesListComponent } from './schedules-list.component';
import { RefuseDialogComponent } from './refuse-dialog/refuse-dialog.component';
import { AttachTermDialogComponent } from './attach-term-dialog/attach-term-dialog.component';
import { SchedulesService } from './schedules.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Schedule } from '../../../shared/models/scheduling.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  scheduleId: 'sch1',
  scheduler: { name: 'João da Silva', email: 'joao@example.com', phone: '11999998888' },
  scheduling: { date: '2026-07-01', time: '14:00' },
  acceptTerm: true,
  advisorProfessor: 'Profa. Maria Souza',
  projectTitle: 'Análise de Amostras',
  description: 'Uso do microscópio para análise de amostras',
  equipments: [{ equipmentId: 'eq1', equipmentName: 'Microscópio Óptico' }],
  status: 'PENDING',
  termUrl: null,
  createdAt: '2026-06-10T10:00:00Z',
  ...overrides,
});

const pagedSchedules = (schedules: Schedule[]): PagedResponse<Schedule> => ({
  data: schedules,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: schedules.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('SchedulesListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<SchedulesListComponent>;
  let component: SchedulesListComponent;
  let schedulesServiceMock: Mocked<Pick<SchedulesService, 'getSchedules' | 'approveSchedule' | 'refuseSchedule' | 'attachTerm'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [SchedulesListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: SchedulesService, useValue: schedulesServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    schedulesServiceMock = {
      getSchedules: vi.fn().mockReturnValue(of(pagedSchedules([makeSchedule()]))),
      approveSchedule: vi.fn().mockReturnValue(of(undefined)),
      refuseSchedule: vi.fn().mockReturnValue(of(undefined)),
      attachTerm: vi.fn().mockReturnValue(of(undefined)),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
  });

  it('deve criar o componente e carregar os agendamentos ao inicializar', async () => {
    await setup();

    expect(schedulesServiceMock.getSchedules).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 });
    expect((component as any).schedules().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  describe('ações contextuais por status', () => {
    it('exibe Aprovar e Rejeitar para agendamentos PENDING', async () => {
      await setup();
      (component as any).schedules.set([makeSchedule({ status: 'PENDING' })]);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('p-button');
      const icons = Array.from(buttons).map((b: any) => b.getAttribute('icon'));
      expect(icons).toContain('pi pi-check');
      expect(icons).toContain('pi pi-times');
      expect(icons).not.toContain('pi pi-paperclip');
    });

    it('exibe Anexar Termo para agendamentos SCHEDULED', async () => {
      await setup();
      (component as any).schedules.set([makeSchedule({ status: 'SCHEDULED' })]);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('p-button');
      const icons = Array.from(buttons).map((b: any) => b.getAttribute('icon'));
      expect(icons).toContain('pi pi-paperclip');
      expect(icons).not.toContain('pi pi-check');
      expect(icons).not.toContain('pi pi-times');
    });

    it('exibe apenas o botão de detalhes quando o usuário não possui Scheduling.Schedules.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();
      (component as any).schedules.set([makeSchedule({ status: 'PENDING' })]);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('p-button');
      const icons = Array.from(buttons).map((b: any) => b.getAttribute('icon'));
      expect(icons).toEqual(['pi pi-eye']);
    });
  });

  describe('Aprovar agendamento', () => {
    it('atualiza o status para SCHEDULED localmente, sem recarregar a lista', async () => {
      await setup();
      schedulesServiceMock.getSchedules.mockClear();

      (component as any).approveSchedule(makeSchedule({ status: 'PENDING' }));

      expect(schedulesServiceMock.approveSchedule).toHaveBeenCalledWith('sch1');
      expect(schedulesServiceMock.getSchedules).not.toHaveBeenCalled();
      expect((component as any).schedules()[0].status).toBe('SCHEDULED');
    });
  });

  describe('Rejeitar agendamento', () => {
    it('abre o RefuseDialog com o agendamento selecionado', async () => {
      await setup();
      const schedule = makeSchedule({ status: 'PENDING' });

      (component as any).openRefuse(schedule);

      expect((component as any).refuseDialogVisible()).toBe(true);
      expect((component as any).selectedSchedule()).toEqual(schedule);
    });

    it('onRefused atualiza o status para REFUSED localmente', async () => {
      await setup();
      const schedule = makeSchedule({ status: 'PENDING' });
      (component as any).schedules.set([schedule]);
      (component as any).selectedSchedule.set(schedule);

      (component as any).onRefused();

      expect((component as any).schedules()[0].status).toBe('REFUSED');
    });
  });

  describe('Anexar termo', () => {
    it('abre o AttachTermDialog com o agendamento selecionado', async () => {
      await setup();
      const schedule = makeSchedule({ status: 'SCHEDULED' });

      (component as any).openAttachTerm(schedule);

      expect((component as any).attachTermDialogVisible()).toBe(true);
      expect((component as any).selectedSchedule()).toEqual(schedule);
    });

    it('onTermAttached recarrega a lista de agendamentos', async () => {
      await setup();
      schedulesServiceMock.getSchedules.mockClear();

      (component as any).onTermAttached();

      expect(schedulesServiceMock.getSchedules).toHaveBeenCalled();
    });
  });
});

describe('RefuseDialogComponent', () => {
  let fixture: ComponentFixture<RefuseDialogComponent>;
  let component: RefuseDialogComponent;
  let schedulesServiceMock: Mocked<Pick<SchedulesService, 'refuseSchedule'>>;

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [RefuseDialogComponent],
      providers: [
        provideNoopAnimations(),
        MessageService,
        { provide: SchedulesService, useValue: schedulesServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RefuseDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('schedule', makeSchedule({ status: 'PENDING' }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    schedulesServiceMock = {
      refuseSchedule: vi.fn().mockReturnValue(of(undefined)),
    };
  });

  it('não envia a rejeição quando a justificativa está vazia', async () => {
    await setup();

    (component as any).onConfirm();

    expect(schedulesServiceMock.refuseSchedule).not.toHaveBeenCalled();
    expect((component as any).form.get('justification')?.touched).toBe(true);
    expect((component as any).form.invalid).toBe(true);
  });

  it('envia a rejeição com a justificativa preenchida', async () => {
    await setup();

    (component as any).form.setValue({ justification: 'Equipamento em manutenção' });
    (component as any).onConfirm();

    expect(schedulesServiceMock.refuseSchedule).toHaveBeenCalledWith('sch1', { justification: 'Equipamento em manutenção' });
  });

  it('propaga erro ao falhar a rejeição', async () => {
    schedulesServiceMock.refuseSchedule.mockReturnValue(throwError(() => ({ status: 409, error: { error: 'Não é possível rejeitar.' } })));
    await setup();

    (component as any).form.setValue({ justification: 'Equipamento em manutenção' });
    (component as any).onConfirm();

    expect((component as any).saving()).toBe(false);
  });
});

describe('AttachTermDialogComponent', () => {
  let fixture: ComponentFixture<AttachTermDialogComponent>;
  let component: AttachTermDialogComponent;
  let schedulesServiceMock: Mocked<Pick<SchedulesService, 'attachTerm'>>;

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [AttachTermDialogComponent],
      providers: [
        provideNoopAnimations(),
        MessageService,
        { provide: SchedulesService, useValue: schedulesServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttachTermDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('schedule', makeSchedule({ status: 'SCHEDULED' }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    schedulesServiceMock = {
      attachTerm: vi.fn().mockReturnValue(of(undefined)),
    };
  });

  it('não permite enviar sem arquivo selecionado', async () => {
    await setup();

    (component as any).onUpload();

    expect(schedulesServiceMock.attachTerm).not.toHaveBeenCalled();
    expect((component as any).selectedFile()).toBeNull();
  });

  it('rejeita arquivo com formato inválido', async () => {
    await setup();
    const file = new File(['conteudo'], 'termo.exe', { type: 'application/x-msdownload' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    (component as any).onFileSelected(event);

    expect((component as any).selectedFile()).toBeNull();
  });

  it('aceita arquivo PDF e envia para o backend', async () => {
    await setup();
    const file = new File(['conteudo'], 'termo.pdf', { type: 'application/pdf' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    (component as any).onFileSelected(event);
    expect((component as any).selectedFile()).toBe(file);

    (component as any).onUpload();
    expect(schedulesServiceMock.attachTerm).toHaveBeenCalledWith('sch1', file);
  });
});
