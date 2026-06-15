import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRequest, MaintenanceRequest } from '../../../shared/models/assets.model';

const maintenanceRequest: MaintenanceRequest = {
  maintenanceRequestId: 'mr1',
  equipmentId: 'eq1',
  equipmentName: 'Microscópio Óptico',
  description: 'Manutenção preventiva',
  problemDescription: 'Lente desalinhada',
  status: 'Requested',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: null,
};

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MaintenanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getMaintenanceRequests — envia parâmetros de paginação e retorna PagedResponse', () => {
    const response = {
      data: [maintenanceRequest],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getMaintenanceRequests({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data).toEqual([maintenanceRequest]);
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/assets/maintenance-requests');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getMaintenanceRequestById — retorna a solicitação', () => {
    service.getMaintenanceRequestById('mr1').subscribe(res => {
      expect(res).toEqual(maintenanceRequest);
    });

    http.expectOne('http://localhost:5085/api/assets/maintenance-requests/mr1').flush(maintenanceRequest);
  });

  it('getMaintenanceRequestById — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.getMaintenanceRequestById('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/assets/maintenance-requests/inexistente').flush(
      { errors: ['Solicitação não encontrada.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('createMaintenanceRequest — envia POST com corpo correto', () => {
    const body: CreateMaintenanceRequest = {
      equipmentId: 'eq1',
      description: 'Manutenção preventiva',
      problemDescription: 'Lente desalinhada',
    };

    let response: { id: string } | undefined;
    service.createMaintenanceRequest(body).subscribe(res => (response = res));

    const req = http.expectOne('http://localhost:5085/api/assets/maintenance-requests');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'mr-novo' });

    expect(response).toEqual({ id: 'mr-novo' });
  });

  it('createMaintenanceRequest — propaga erro 422 (equipamento inválido)', () => {
    const body: CreateMaintenanceRequest = {
      equipmentId: 'inexistente',
      description: 'Manutenção preventiva',
      problemDescription: 'Lente desalinhada',
    };
    let caught = false;

    service.createMaintenanceRequest(body).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/assets/maintenance-requests').flush(
      { errors: ['Equipamento informado não existe.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });

  it('startMaintenance — envia POST sem corpo para /start', () => {
    service.startMaintenance('mr1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/assets/maintenance-requests/mr1/start');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });

  it('completeMaintenance — envia POST sem corpo para /done', () => {
    service.completeMaintenance('mr1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/assets/maintenance-requests/mr1/done');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });

  it('cancelMaintenance — envia POST sem corpo para /cancel', () => {
    service.cancelMaintenance('mr1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/assets/maintenance-requests/mr1/cancel');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });

  it('cancelMaintenance — propaga erro 409 (transição de status inválida)', () => {
    let caught = false;

    service.cancelMaintenance('mr1').subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/assets/maintenance-requests/mr1/cancel').flush(
      { error: 'Não é possível cancelar uma solicitação já concluída.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });
});
