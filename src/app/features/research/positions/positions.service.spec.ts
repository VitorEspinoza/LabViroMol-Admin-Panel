import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PositionsService } from './positions.service';
import { CreatePositionRequest, Position } from '../../../shared/models/research.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const mockPosition: Position = {
  id: 'p1',
  name: 'Pesquisador Sênior',
  description: 'Responsável por liderar projetos de pesquisa.',
};

describe('PositionsService', () => {
  let service: PositionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PositionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getPositions — mapeia PagedResponse corretamente', () => {
    const response: PagedResponse<Position> = {
      data: [mockPosition],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getPositions({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('p1');
      expect(res.data[0].name).toBe('Pesquisador Sênior');
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/research/positions');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getPositions — retorna lista vazia sem erro', () => {
    const response: PagedResponse<Position> = {
      data: [],
      currentPage: 1,
      pageSize: 10,
      totalPages: 0,
      totalCount: 0,
    };

    service.getPositions({ pageNumber: 1, pageSize: 10 }).subscribe(res => expect(res.data).toEqual([]));

    http.expectOne(r => r.url === 'http://localhost:5085/api/research/positions').flush(response);
  });

  it('createPosition — envia POST com corpo correto', () => {
    const body: CreatePositionRequest = { name: 'Estagiário', description: 'Apoio a projetos.' };

    service.createPosition(body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/positions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null, { status: 201, statusText: 'Created' });
  });

  it('createPosition — propaga erro 400 (validação)', () => {
    const body: CreatePositionRequest = { name: '', description: '' };
    let caught = false;

    service.createPosition(body).subscribe({
      error: err => {
        expect(err.status).toBe(400);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/positions').flush(
      { errors: ['O nome é obrigatório.'] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught).toBe(true);
  });

  it('deletePosition — envia DELETE para o id correto', () => {
    service.deletePosition('p1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/positions/p1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deletePosition — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.deletePosition('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/positions/inexistente').flush(
      { errors: ['Posição não encontrada.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('deletePosition — propaga erro 422 (posição em uso por pesquisadores)', () => {
    let caught = false;

    service.deletePosition('p1').subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/positions/p1').flush(
      { errors: ['Não é possível excluir uma posição em uso.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });
});
