import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { SchedulesService } from './schedules.service';
import { RefuseScheduleRequest, Schedule } from '../../../shared/models/scheduling.model';

const schedule: Schedule = {
  id: 'sch1',
  scheduler: {
    name: 'João da Silva',
    email: 'joao@example.com',
    course: 'Biomedicina',
  },
  scheduling: {
    date: '2026-07-01',
    startDateHour: '2026-07-01T14:00:00Z',
    endDateHour: '2026-07-01T16:00:00Z',
  },
  advisorProfessor: 'Profa. Maria Souza',
  projectTitle: 'Análise de Amostras',
  description: 'Uso do microscópio para análise de amostras',
  status: 'PENDING',
  termUrl: null,
  equipments: [{ equipmentId: 'eq1', name: 'Microscópio Óptico' }],
};

describe('SchedulesService', () => {
  let service: SchedulesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SchedulesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getSchedules — envia parâmetros de paginação e retorna PagedResponse', () => {
    const response = {
      data: [schedule],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getSchedules({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data).toEqual([schedule]);
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/scheduling/schedules');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getPendingSchedules — retorna lista de agendamentos pendentes', () => {
    service.getPendingSchedules().subscribe(res => {
      expect(res).toEqual([schedule]);
    });

    const req = http.expectOne('http://localhost:5085/api/scheduling/schedules/pending');
    expect(req.request.method).toBe('GET');
    req.flush([schedule]);
  });

  it('approveSchedule — envia POST sem corpo para /approve', () => {
    service.approveSchedule('sch1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/scheduling/schedules/sch1/approve');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });

  it('refuseSchedule — envia POST com corpo { justification }', () => {
    const body: RefuseScheduleRequest = { justification: 'Equipamento em manutenção' };

    service.refuseSchedule('sch1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/scheduling/schedules/sch1/refuse');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('refuseSchedule — propaga erro 409 (transição de status inválida)', () => {
    let caught = false;

    service.refuseSchedule('sch1', { justification: 'Equipamento em manutenção' }).subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/scheduling/schedules/sch1/refuse').flush(
      { error: 'Não é possível recusar um agendamento já aprovado.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });

  it('attachTerm — constrói FormData com campo "file" e não seta Content-Type manualmente', () => {
    const file = new File(['conteudo'], 'termo.pdf', { type: 'application/pdf' });

    service.attachTerm('sch1', file).subscribe();

    const req = http.expectOne('http://localhost:5085/api/scheduling/schedules/sch1/term');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush(null);
  });

  it('attachTerm — propaga erro 422 (arquivo inválido)', () => {
    const file = new File(['conteudo'], 'termo.exe', { type: 'application/octet-stream' });
    let caught = false;

    service.attachTerm('sch1', file).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/scheduling/schedules/sch1/term').flush(
      { errors: ['Formato de arquivo inválido.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });
});
