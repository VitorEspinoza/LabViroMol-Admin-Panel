import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { StockService } from './stock.service';
import { ConsumeForProjectRequest, RemoveStockRequest, StockExceptionRequest } from '../../../shared/models/inventory.model';

describe('StockService', () => {
  let service: StockService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StockService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stockException — envia POST /add-stock com corpo correto', () => {
    const body: StockExceptionRequest = { quantity: 100, reason: 'Reposição de fornecedor' };

    service.stockException('mat1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/materials/mat1/add-stock');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('stockException — propaga erro 400 (validação)', () => {
    const body: StockExceptionRequest = { quantity: 0, reason: null };
    let caught = false;

    service.stockException('mat1', body).subscribe({
      error: err => {
        expect(err.status).toBe(400);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/materials/mat1/add-stock').flush(
      { errors: ['A quantidade deve ser maior que zero.'] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught).toBe(true);
  });

  it('consumeForProject — envia POST /write-off com projectId', () => {
    const body: ConsumeForProjectRequest = { quantity: 10, projectId: 'proj1' };

    service.consumeForProject('mat1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/materials/mat1/write-off');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ quantity: 10, projectId: 'proj1', reason: null });
    req.flush(null);
  });

  it('consumeForProject — propaga erro 422 (estoque insuficiente)', () => {
    const body: ConsumeForProjectRequest = { quantity: 10000, projectId: 'proj1' };
    let caught = false;

    service.consumeForProject('mat1', body).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/materials/mat1/write-off').flush(
      { errors: ['Estoque insuficiente para a baixa solicitada.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });

  it('removeException — envia POST /write-off sem projectId e com justificativa', () => {
    const body: RemoveStockRequest = { quantity: 5, reason: 'Material danificado' };

    service.removeException('mat1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/materials/mat1/write-off');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ quantity: 5, projectId: null, reason: 'Material danificado' });
    req.flush(null);
  });

  it('removeException — propaga erro 409 (conflito de estoque)', () => {
    let caught = false;

    service.removeException('mat1', { quantity: 5, reason: 'Material danificado' }).subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/materials/mat1/write-off').flush(
      { errors: ['Operação de estoque conflitante em andamento.'] },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });
});
