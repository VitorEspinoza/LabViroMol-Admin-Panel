import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { MaterialsService } from './materials.service';
import { CreateMaterialRequest, UpdateMaterialRequest } from '../../../shared/models/inventory.model';

// Shape retornado pela API (GET /api/inventory/materials e /materials/{id})
const rawMaterial = {
  id: 'mat1',
  name: 'Álcool 70%',
  materialType: 'Reagentes',
  minStock: 100,
  stockQuantity: 500,
  unit: 'Milliliter',
  location: 'Armário A1',
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

  it('getMaterials — mapeia PagedResponse da API (id, materialType) para o formato do frontend', () => {
    const response = {
      data: [rawMaterial],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getMaterials({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0]).toEqual({
        materialId: 'mat1',
        name: 'Álcool 70%',
        location: 'Armário A1',
        stockQuantity: 500,
        minStock: 100,
        unit: 'Milliliter',
        typeName: 'Reagentes',
        isLowStock: false,
      });
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/inventory/materials');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getMaterials — mapeia isLowStock = true quando estoque está baixo', () => {
    const response = {
      data: [{ ...rawMaterial, stockQuantity: 50, minStock: 100 }],
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

  it('getMaterialById — mapeia id para materialId e materialType para typeName', () => {
    service.getMaterialById('mat1').subscribe(material => {
      expect(material.materialId).toBe('mat1');
      expect(material.typeName).toBe('Reagentes');
      expect(material.isLowStock).toBe(false);
    });

    http.expectOne('http://localhost:5085/api/inventory/materials/mat1').flush(rawMaterial);
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
