import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PartnersService } from './partners.service';
import { Partner, PartnerRequest } from '../../../shared/models/research.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const mockPartner: Partner = {
  id: 'pt1',
  name: 'Instituto Butantan',
  description: 'Parceiro institucional em pesquisas de imunologia.',
};

describe('PartnersService', () => {
  let service: PartnersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PartnersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getPartners — mapeia PagedResponse corretamente', () => {
    const response: PagedResponse<Partner> = {
      data: [mockPartner],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getPartners({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('pt1');
      expect(res.data[0].name).toBe('Instituto Butantan');
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/research/partners');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getPartnerById — retorna parceiro com createdAt', () => {
    const detail: Partner = { ...mockPartner, createdAt: '2024-01-01T00:00:00Z' };

    service.getPartnerById('pt1').subscribe(partner => {
      expect(partner.id).toBe('pt1');
      expect(partner.createdAt).toBe('2024-01-01T00:00:00Z');
    });

    http.expectOne('http://localhost:5085/api/research/partners/pt1').flush(detail);
  });

  it('getPartnerById — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.getPartnerById('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/partners/inexistente').flush(
      { errors: ['Parceiro não encontrado.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('createPartner — envia POST com corpo correto', () => {
    const body: PartnerRequest = { name: 'Fiocruz', description: null };

    service.createPartner(body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/partners');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null, { status: 201, statusText: 'Created' });
  });

  it('createPartner — propaga erro 400 (validação)', () => {
    const body: PartnerRequest = { name: '', description: null };
    let caught = false;

    service.createPartner(body).subscribe({
      error: err => {
        expect(err.status).toBe(400);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/partners').flush(
      { errors: ['O nome é obrigatório.'] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught).toBe(true);
  });

  it('updatePartner — envia PUT com corpo correto', () => {
    const body: PartnerRequest = { name: 'Instituto Butantan', description: 'Descrição atualizada.' };

    service.updatePartner('pt1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/partners/pt1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('updatePartner — propaga erro 404 (não encontrado)', () => {
    const body: PartnerRequest = { name: 'Inexistente', description: null };
    let caught = false;

    service.updatePartner('inexistente', body).subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/partners/inexistente').flush(
      { errors: ['Parceiro não encontrado.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('deletePartner — envia DELETE para o id correto', () => {
    service.deletePartner('pt1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/partners/pt1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deletePartner — propaga erro 409 (parceiro vinculado a projetos)', () => {
    let caught = false;

    service.deletePartner('pt1').subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/partners/pt1').flush(
      { errors: ['Parceiro possui projetos vinculados.'] },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });
});
