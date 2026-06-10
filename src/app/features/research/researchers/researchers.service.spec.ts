import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ResearchersService } from './researchers.service';
import { Researcher } from '../../../shared/models/research.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const mockResearcher: Researcher = {
  id: 'r1',
  displayName: 'Ana Silva',
  degreeLevel: 'Doctorate',
  position: 'Pesquisador Sênior',
  lattesUrl: 'http://lattes.cnpq.br/123456',
};

describe('ResearchersService', () => {
  let service: ResearchersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ResearchersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getResearchers — mapeia PagedResponse corretamente', () => {
    const response: PagedResponse<Researcher> = {
      data: [mockResearcher],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getResearchers({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('r1');
      expect(res.data[0].displayName).toBe('Ana Silva');
      expect(res.data[0].degreeLevel).toBe('Doctorate');
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/research/researchers');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getResearchers — mapeia lattesUrl nulo corretamente', () => {
    const response: PagedResponse<Researcher> = {
      data: [{ ...mockResearcher, lattesUrl: null }],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getResearchers({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data[0].lattesUrl).toBeNull();
    });

    http.expectOne(r => r.url === 'http://localhost:5085/api/research/researchers').flush(response);
  });

  it('getResearchers — retorna lista vazia sem erro', () => {
    const response: PagedResponse<Researcher> = {
      data: [],
      currentPage: 1,
      pageSize: 10,
      totalPages: 0,
      totalCount: 0,
    };

    service.getResearchers({ pageNumber: 1, pageSize: 10 }).subscribe(res => expect(res.data).toEqual([]));

    http.expectOne(r => r.url === 'http://localhost:5085/api/research/researchers').flush(response);
  });
});
