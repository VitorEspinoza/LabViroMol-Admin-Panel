import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PublicationsService } from './publications.service';
import {
  AddPublicationResearcherRequest,
  CreatePublicationRequest,
  Publication,
  PublicationSummary,
  ReorderPublicationResearchersRequest,
  UpdatePublicationRequest,
} from '../../../shared/models/research.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const mockPublicationSummary: PublicationSummary = {
  id: 'pub1',
  title: 'Variantes Emergentes do SARS-CoV-2',
  doi: '10.1000/xyz123',
  publicationDate: '2024-01-01T00:00:00Z',
  authors: [{ researcherId: 'researcher1', name: 'Silva, A. et al.', order: 1 }],
};

const mockPublication: Publication = {
  id: 'pub1',
  title: 'Variantes Emergentes do SARS-CoV-2',
  description: 'Estudo sobre variantes emergentes.',
  doi: '10.1000/xyz123',
  publicationDate: '2024-01-01T00:00:00Z',
  publishedOn: 'Nature',
  publishUrl: 'https://nature.com/articles/xyz123',
  authors: [{ researcherId: 'researcher1', name: 'Ana Silva', order: 1 }],
  createdAt: '2024-01-01T00:00:00Z',
};

describe('PublicationsService', () => {
  let service: PublicationsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getPublications — mapeia PagedResponse corretamente', () => {
    const response: PagedResponse<PublicationSummary> = {
      data: [mockPublicationSummary],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getPublications({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('pub1');
      expect(res.data[0].doi).toBe('10.1000/xyz123');
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/research/publications');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getPublicationById — mapeia publicação com autores', () => {
    service.getPublicationById('pub1').subscribe(publication => {
      expect(publication.id).toBe('pub1');
      expect(publication.authors.length).toBe(1);
      expect(publication.authors[0].name).toBe('Ana Silva');
      expect(publication.authors[0].order).toBe(1);
    });

    http.expectOne('http://localhost:5085/api/research/publications/pub1').flush(mockPublication);
  });

  it('getPublicationById — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.getPublicationById('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/publications/inexistente').flush(
      { errors: ['Publicação não encontrada.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('createPublication — envia POST com corpo correto', () => {
    const body: CreatePublicationRequest = {
      title: 'Nova Publicação',
      description: 'Descrição da publicação.',
      doi: '10.1000/abc456',
      publicationDate: '2024-06-01T00:00:00Z',
      publishedOn: 'Science',
      publishUrl: 'https://science.org/articles/abc456',
    };

    let response: { id: string } | undefined;
    service.createPublication(body).subscribe(res => (response = res));

    const req = http.expectOne('http://localhost:5085/api/research/publications');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'pub-novo' }, { status: 201, statusText: 'Created' });

    expect(response).toEqual({ id: 'pub-novo' });
  });

  it('createPublication — propaga erro 400 (validação)', () => {
    const body: CreatePublicationRequest = {
      title: '',
      description: 'Descrição da publicação.',
      doi: '10.1000/abc456',
      publicationDate: '2024-06-01T00:00:00Z',
      publishedOn: 'Science',
      publishUrl: 'https://science.org/articles/abc456',
    };
    let caught = false;

    service.createPublication(body).subscribe({
      error: err => {
        expect(err.status).toBe(400);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/publications').flush(
      { errors: ['O título é obrigatório.'] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught).toBe(true);
  });

  it('updatePublication — envia PUT com corpo correto', () => {
    const body: UpdatePublicationRequest = {
      title: 'Título atualizado',
      description: 'Descrição atualizada.',
      publishedOn: 'Nature',
      publishUrl: 'https://nature.com/articles/xyz123-v2',
    };

    service.updatePublication('pub1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/publications/pub1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('updatePublication — propaga erro 404 (não encontrado)', () => {
    const body: UpdatePublicationRequest = {
      title: 'Título atualizado',
      description: 'Descrição atualizada.',
      publishedOn: 'Nature',
      publishUrl: 'https://nature.com/articles/xyz123-v2',
    };
    let caught = false;

    service.updatePublication('inexistente', body).subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/publications/inexistente').flush(
      { errors: ['Publicação não encontrada.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('addResearcher — envia POST /researchers com corpo correto', () => {
    const body: AddPublicationResearcherRequest = { researcherId: 'r1' };

    service.addResearcher('pub1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/publications/pub1/researchers');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('addResearcher — propaga erro 422 (pesquisador inválido)', () => {
    const body: AddPublicationResearcherRequest = { researcherId: 'inexistente' };
    let caught = false;

    service.addResearcher('pub1', body).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/publications/pub1/researchers').flush(
      { errors: ['Pesquisador informado não existe.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });

  it('removeResearcher — envia DELETE para /researchers/{researcherId}', () => {
    service.removeResearcher('pub1', 'r1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/publications/pub1/researchers/r1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('reorderResearchers — envia PUT /researchers/order com corpo correto', () => {
    const body: ReorderPublicationResearchersRequest = { researcherIds: ['r2', 'r1'] };

    service.reorderResearchers('pub1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/publications/pub1/researchers/order');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('deletePublication — envia DELETE para o id correto', () => {
    service.deletePublication('pub1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/publications/pub1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deletePublication — propaga erro 409 (publicação vinculada)', () => {
    let caught = false;

    service.deletePublication('pub1').subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/publications/pub1').flush(
      { errors: ['Publicação não pode ser removida.'] },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });
});
