import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { MaterialsService } from './materials.service';
import { CreateMaterialRequest, Material, UpdateMaterialRequest } from '../../../shared/models/inventory.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const mockMaterial: Material = {
  materialId: 'mat1',
  name: 'Álcool 70%',
  location: 'Armário A1',
  stockQuantity: 500,
  minStock: 100,
  unit: 'Milliliter',
  typeId: 'mt1',
  typeName: 'Reagentes',
  isLowStock: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: null,
};

describe('MaterialsService', () => {
  let service: MaterialsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MaterialsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getMaterials — mapeia PagedResponse corretamente', () => {
    const response: PagedResponse<Material> = {
      data: [mockMaterial],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getMaterials({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].materialId).toBe('mat1');
      expect(res.data[0].unit).toBe('Milliliter');
      expect(res.data[0].isLowStock).toBe(false);
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/inventory/materials');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getMaterials — mapeia isLowStock = true quando estoque está baixo', () => {
    const response: PagedResponse<Material> = {
      data: [{ ...mockMaterial, stockQuantity: 50, isLowStock: true }],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getMaterials({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data[0].isLowStock).toBe(true);
    });

    http.expectOne(r => r.url === 'http://localhost:5085/api/inventory/materials').flush(response);
  });

  it('getMaterialById — retorna material', () => {
    service.getMaterialById('mat1').subscribe(material => {
      expect(material.materialId).toBe('mat1');
      expect(material.typeName).toBe('Reagentes');
    });

    http.expectOne('http://localhost:5085/api/inventory/materials/mat1').flush(mockMaterial);
  });

  it('getMaterialById — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.getMaterialById('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/materials/inexistente').flush(
      { errors: ['Material não encontrado.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('createMaterial — envia POST com corpo correto', () => {
    const body: CreateMaterialRequest = {
      name: 'Luvas Nitrílicas',
      location: 'Armário B2',
      minStock: 50,
      stockQuantity: 200,
      unit: 'Piece',
      typeId: 'mt1',
    };

    let response: { id: string } | undefined;
    service.createMaterial(body).subscribe(res => (response = res));

    const req = http.expectOne('http://localhost:5085/api/inventory/materials');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'mat-novo' });

    expect(response).toEqual({ id: 'mat-novo' });
  });

  it('createMaterial — propaga erro 422 (tipo de material inválido)', () => {
    const body: CreateMaterialRequest = {
      name: 'Luvas Nitrílicas',
      location: 'Armário B2',
      minStock: 50,
      stockQuantity: 200,
      unit: 'Piece',
      typeId: 'inexistente',
    };
    let caught = false;

    service.createMaterial(body).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/materials').flush(
      { errors: ['Tipo de material informado não existe.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });

  it('updateMaterial — envia PUT com corpo correto', () => {
    const body: UpdateMaterialRequest = {
      name: 'Álcool 70% - atualizado',
      location: 'Armário A2',
      minStock: 150,
    };

    service.updateMaterial('mat1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/materials/mat1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('updateMaterial — propaga erro 400 (validação)', () => {
    const body: UpdateMaterialRequest = { name: '', location: 'Armário A2', minStock: 150 };
    let caught = false;

    service.updateMaterial('mat1', body).subscribe({
      error: err => {
        expect(err.status).toBe(400);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/materials/mat1').flush(
      { errors: ['O nome é obrigatório.'] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught).toBe(true);
  });
});
