import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { MaterialTypesService } from './material-types.service';
import { CreateMaterialTypeRequest, MaterialType } from '../../../shared/models/inventory.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const mockType: MaterialType = {
  materialTypeId: 'mt1',
  name: 'Reagentes',
  active: true,
};

describe('MaterialTypesService', () => {
  let service: MaterialTypesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MaterialTypesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getTypes — mapeia PagedResponse corretamente', () => {
    const response: PagedResponse<MaterialType> = {
      data: [mockType],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getTypes({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].materialTypeId).toBe('mt1');
      expect(res.data[0].active).toBe(true);
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/inventory/types');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('createType — envia POST com corpo correto', () => {
    const body: CreateMaterialTypeRequest = { name: 'Vidrarias' };

    let response: { id: string } | undefined;
    service.createType(body).subscribe(res => (response = res));

    const req = http.expectOne('http://localhost:5085/api/inventory/types');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'mt-novo' });

    expect(response).toEqual({ id: 'mt-novo' });
  });

  it('createType — propaga erro 400 (validação)', () => {
    const body: CreateMaterialTypeRequest = { name: '' };
    let caught = false;

    service.createType(body).subscribe({
      error: err => {
        expect(err.status).toBe(400);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/types').flush(
      { errors: ['O nome é obrigatório.'] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught).toBe(true);
  });

  it('activateType — envia POST /activate', () => {
    service.activateType('mt1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/types/mt1/activate');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('deactivateType — envia POST /deactivate', () => {
    service.deactivateType('mt1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/types/mt1/deactivate');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('deactivateType — propaga erro 409 (tipo em uso)', () => {
    let caught = false;

    service.deactivateType('mt1').subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/types/mt1/deactivate').flush(
      { errors: ['Tipo de material possui materiais vinculados.'] },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });
});
