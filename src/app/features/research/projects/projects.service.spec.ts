import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ProjectsService } from './projects.service';
import {
  AddProjectMemberRequest,
  ChangeMemberRoleRequest,
  CreateProjectRequest,
  Project,
  ProjectSummary,
  TransferLeadershipRequest,
  UpdateProjectRequest,
} from '../../../shared/models/research.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const mockProjectSummary: ProjectSummary = {
  id: 'proj1',
  title: 'Estudo de Variantes Virais',
  partnerName: 'Instituto Butantan',
  managerName: 'Ana Silva',
  status: 'InProgress',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockProject: Project = {
  id: 'proj1',
  title: 'Estudo de Variantes Virais',
  description: 'Pesquisa sobre variantes emergentes.',
  status: 'Planned',
  partnerId: 'pt1',
  partnerName: 'Instituto Butantan',
  members: [{ researcherId: 'r1', researcherName: 'Ana Silva', role: 'ResearchLead' }],
  createdAt: '2024-01-01T00:00:00Z',
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getProjects — mapeia PagedResponse corretamente', () => {
    const response: PagedResponse<ProjectSummary> = {
      data: [mockProjectSummary],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getProjects({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('proj1');
      expect(res.data[0].status).toBe('InProgress');
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/research/projects');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getProjectById — mapeia projeto com membros', () => {
    service.getProjectById('proj1').subscribe(project => {
      expect(project.id).toBe('proj1');
      expect(project.members.length).toBe(1);
      expect(project.members[0].role).toBe('ResearchLead');
    });

    http.expectOne('http://localhost:5085/api/research/projects/proj1').flush(mockProject);
  });

  it('getProjectById — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.getProjectById('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/projects/inexistente').flush(
      { errors: ['Projeto não encontrado.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('createProject — envia POST com corpo correto', () => {
    const body: CreateProjectRequest = {
      principalInvestigatorId: 'r1',
      title: 'Novo Projeto',
      description: 'Descrição do projeto.',
      partnerId: 'pt1',
    };

    let response: { id: string } | undefined;
    service.createProject(body).subscribe(res => (response = res));

    const req = http.expectOne('http://localhost:5085/api/research/projects');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'pr-novo' }, { status: 201, statusText: 'Created' });

    expect(response).toEqual({ id: 'pr-novo' });
  });

  it('createProject — propaga erro 422 (parceiro inválido)', () => {
    const body: CreateProjectRequest = {
      principalInvestigatorId: 'r1',
      title: 'Novo Projeto',
      description: 'Descrição do projeto.',
      partnerId: 'inexistente',
    };
    let caught = false;

    service.createProject(body).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/projects').flush(
      { errors: ['Parceiro informado não existe.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });

  it('updateProject — envia PUT com corpo correto', () => {
    const body: UpdateProjectRequest = {
      title: 'Título atualizado',
      description: 'Descrição atualizada.',
      requestedById: 'u1',
    };

    service.updateProject('proj1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/projects/proj1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('startProject — envia POST /start com researcherId', () => {
    service.startProject('proj1', 'r1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/projects/proj1/start');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ researcherId: 'r1' });
    req.flush(null);
  });

  it('startProject — propaga erro 422 (transição inválida)', () => {
    let caught = false;

    service.startProject('proj1', 'r1').subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/projects/proj1/start').flush(
      { errors: ['Apenas projetos planejados podem ser iniciados.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });

  it('completeProject — envia POST /complete com researcherId', () => {
    service.completeProject('proj1', 'r1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/projects/proj1/complete');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ researcherId: 'r1' });
    req.flush(null);
  });

  it('cancelProject — envia POST /cancel com researcherId', () => {
    service.cancelProject('proj1', 'r1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/projects/proj1/cancel');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ researcherId: 'r1' });
    req.flush(null);
  });

  it('addMember — envia POST /members com corpo correto', () => {
    const body: AddProjectMemberRequest = { researcherId: 'r2', role: 'Collaborator', requestedById: 'u1' };

    service.addMember('proj1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/projects/proj1/members');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('addMember — propaga erro 409 (pesquisador já é membro)', () => {
    const body: AddProjectMemberRequest = { researcherId: 'r1', role: 'Collaborator', requestedById: 'u1' };
    let caught = false;

    service.addMember('proj1', body).subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/research/projects/proj1/members').flush(
      { errors: ['Pesquisador já é membro do projeto.'] },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });

  it('changeMemberRole — envia PUT /members/{researcherId}/role com corpo correto', () => {
    const body: ChangeMemberRoleRequest = { newRole: 'Manager', requestedById: 'u1' };

    service.changeMemberRole('proj1', 'r1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/projects/proj1/members/r1/role');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('removeMember — envia DELETE com requestedById como query param', () => {
    service.removeMember('proj1', 'r1', 'u1').subscribe();

    const req = http.expectOne(
      r => r.url === 'http://localhost:5085/api/research/projects/proj1/members/r1' && r.method === 'DELETE',
    );
    expect(req.request.params.get('requestedById')).toBe('u1');
    req.flush(null);
  });

  it('transferLeadership — envia POST /transfer-leadership com corpo correto', () => {
    const body: TransferLeadershipRequest = { newLeadResearcherId: 'r2', requestedById: 'u1' };

    service.transferLeadership('proj1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/research/projects/proj1/transfer-leadership');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });
});
