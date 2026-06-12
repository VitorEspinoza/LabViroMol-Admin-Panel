import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { EquipmentsService } from './equipments.service';
import { CreateEquipmentRequest, Equipment, UpdateEquipmentRequest } from '../../../shared/models/assets.model';

const equipment: Equipment = {
  equipmentId: 'eq1',
  name: 'Microscópio Óptico',
  brand: 'Olympus',
  model: 'CX23',
  code: 'PAT-001',
  description: 'Microscópio para análises de rotina',
  imageUrl: '/images/equipments/microscopio.jpg',
  location: 'Laboratório 1',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: null,
};

describe('EquipmentsService', () => {
  let service: EquipmentsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipmentsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getEquipments — envia parâmetros de paginação e retorna PagedResponse', () => {
    const response = {
      data: [equipment],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getEquipments({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data).toEqual([equipment]);
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/assets/equipments');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getEquipmentById — retorna o equipamento', () => {
    service.getEquipmentById('eq1').subscribe(res => {
      expect(res).toEqual(equipment);
    });

    http.expectOne('http://localhost:5085/api/assets/equipments/eq1').flush(equipment);
  });

  it('getEquipmentById — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.getEquipmentById('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/assets/equipments/inexistente').flush(
      { errors: ['Equipamento não encontrado.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('createEquipment — envia POST com corpo correto', () => {
    const body: CreateEquipmentRequest = {
      name: 'Microscópio Óptico',
      brand: 'Olympus',
      model: 'CX23',
      code: 'PAT-001',
      description: 'Microscópio para análises de rotina',
    };

    let response: { id: string } | undefined;
    service.createEquipment(body).subscribe(res => (response = res));

    const req = http.expectOne('http://localhost:5085/api/assets/equipments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'eq-novo' });

    expect(response).toEqual({ id: 'eq-novo' });
  });

  it('updateEquipment — envia PUT com corpo correto', () => {
    const body: UpdateEquipmentRequest = {
      name: 'Microscópio Óptico',
      brand: 'Olympus',
      model: 'CX23',
      code: 'PAT-001',
      description: 'Microscópio para análises de rotina',
      location: 'Laboratório 2',
    };

    service.updateEquipment('eq1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/assets/equipments/eq1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('uploadImage — constrói FormData com campo "file" e não seta Content-Type manualmente', () => {
    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });

    service.uploadImage('eq1', file).subscribe();

    const req = http.expectOne('http://localhost:5085/api/assets/equipments/eq1/image');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush(null);
  });

  it('uploadImage — propaga erro 422 (arquivo inválido)', () => {
    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    let caught = false;

    service.uploadImage('eq1', file).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/assets/equipments/eq1/image').flush(
      { errors: ['Formato de arquivo inválido.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });
});
