import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { KitsService } from './kits.service';
import { CreateKitRequest, UpdateKitRequest } from '../../../shared/models/inventory.model';

// Shape retornado pela API (camelCase de KitViewModel/KitItemViewModel)
const mockKitApiResponse = {
  id: 'kit1',
  name: 'Kit PCR Básico',
  description: 'Materiais essenciais para PCR',
  items: [{ materialId: 'mat1', name: 'Álcool 70%', quantity: 2, unit: 'Milliliter' }],
};

describe('KitsService', () => {
  let service: KitsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(KitsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getKits — mapeia PagedResponse corretamente', () => {
    const response = {
      data: [mockKitApiResponse],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getKits({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].kitId).toBe('kit1');
      expect(res.data[0].materials.length).toBe(1);
      expect(res.data[0].materials[0].materialName).toBe('Álcool 70%');
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/inventory/kits');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getKitById — retorna kit com materiais', () => {
    service.getKitById('kit1').subscribe(kit => {
      expect(kit.kitId).toBe('kit1');
      expect(kit.materials[0].materialId).toBe('mat1');
      expect(kit.materials[0].materialName).toBe('Álcool 70%');
      expect(kit.materials[0].unit).toBe('Milliliter');
    });

    http.expectOne('http://localhost:5085/api/inventory/kits/kit1').flush(mockKitApiResponse);
  });

  it('getKitById — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.getKitById('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/kits/inexistente').flush(
      { errors: ['Kit não encontrado.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('createKit — envia POST com corpo correto', () => {
    const body: CreateKitRequest = {
      name: 'Kit PCR Básico',
      description: 'Materiais essenciais para PCR',
      materials: [{ id: 'mat1', quantity: 2 }],
    };

    let response: { id: string } | undefined;
    service.createKit(body).subscribe(res => (response = res));

    const req = http.expectOne('http://localhost:5085/api/inventory/kits');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'kit-novo' });

    expect(response).toEqual({ id: 'kit-novo' });
  });

  it('createKit — propaga erro 400 (validação)', () => {
    const body: CreateKitRequest = { name: '', description: '', materials: [] };
    let caught = false;

    service.createKit(body).subscribe({
      error: err => {
        expect(err.status).toBe(400);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/kits').flush(
      { errors: ['O nome é obrigatório.'] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught).toBe(true);
  });

  it('updateKit — envia PUT com corpo correto', () => {
    const body: UpdateKitRequest = {
      name: 'Kit PCR Completo',
      description: 'Materiais completos para PCR',
      materials: [
        { id: 'mat1', quantity: 2 },
        { id: 'mat2', quantity: 1 },
      ],
    };

    service.updateKit('kit1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/kits/kit1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('updateKit — propaga erro 422 (material inválido na lista)', () => {
    const body: UpdateKitRequest = {
      name: 'Kit PCR Completo',
      description: 'Materiais completos para PCR',
      materials: [{ id: 'inexistente', quantity: 2 }],
    };
    let caught = false;

    service.updateKit('kit1', body).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/kits/kit1').flush(
      { errors: ['Material informado não existe.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });
});
