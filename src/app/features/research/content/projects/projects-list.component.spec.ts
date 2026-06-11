import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';

import { ProjectsListComponent } from './projects-list.component';
import { ProjectsService } from '../../projects/projects.service';
import { PartnersService } from '../../partners/partners.service';
import { ResearchersService } from '../../researchers/researchers.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ProjectSummary } from '../../../../shared/models/research.model';
import { PagedResponse } from '../../../../shared/models/pagination.model';

const makeProject = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: 'pr1',
  title: 'Estudo de Arboviroses',
  partnerName: 'Universidade Federal',
  managerName: 'Ana Silva',
  status: 'Planned',
  createdAt: '2026-01-10T00:00:00Z',
  ...overrides,
});

const pagedResponse = (projects: ProjectSummary[]): PagedResponse<ProjectSummary> => ({
  data: projects,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: projects.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('ProjectsListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<ProjectsListComponent>;
  let component: ProjectsListComponent;
  let projectsServiceMock: Mocked<Pick<ProjectsService, 'getProjects' | 'getProjectById'>>;
  let partnersServiceMock: Mocked<Pick<PartnersService, 'getPartners'>>;
  let researchersServiceMock: Mocked<Pick<ResearchersService, 'getResearchers'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn>; currentUser: ReturnType<typeof signal> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: PartnersService, useValue: partnersServiceMock },
        { provide: ResearchersService, useValue: researchersServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    projectsServiceMock = {
      getProjects: vi.fn().mockReturnValue(of(pagedResponse([makeProject()]))),
      getProjectById: vi.fn(),
    };
    partnersServiceMock = {
      getPartners: vi.fn().mockReturnValue(of(pagedResponse([]) as any)),
    };
    researchersServiceMock = {
      getResearchers: vi.fn().mockReturnValue(of(pagedResponse([]) as any)),
    };
    authServiceMock = {
      hasPermission: vi.fn().mockReturnValue(true),
      currentUser: signal({ userId: 'u1', email: 'a@a.com', firstName: 'Ana', lastName: 'Silva', permissions: [] }),
    };
    confirmDialogServiceMock = { confirm: vi.fn() };
  });

  it('deve criar o componente e carregar os projetos ao inicializar', async () => {
    await setup();

    expect(component).toBeTruthy();
    expect(projectsServiceMock.getProjects).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 });
    expect((component as any).projects().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  it('trata erro ao carregar projetos sem travar o componente', async () => {
    projectsServiceMock.getProjects = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    await setup();

    expect((component as any).loading()).toBe(false);
    expect((component as any).projects()).toEqual([]);
  });

  describe('badges de status', () => {
    it('exibe o rótulo e a severidade corretos para cada status', async () => {
      await setup();

      expect((component as any).statusLabel('Planned')).toBe('Planejado');
      expect((component as any).statusSeverity('Planned')).toBe('info');
      expect((component as any).statusLabel('InProgress')).toBe('Em andamento');
      expect((component as any).statusSeverity('InProgress')).toBe('warn');
      expect((component as any).statusLabel('Completed')).toBe('Concluído');
      expect((component as any).statusSeverity('Completed')).toBe('success');
      expect((component as any).statusLabel('Canceled')).toBe('Cancelado');
      expect((component as any).statusSeverity('Canceled')).toBe('danger');
    });
  });

  describe('botão Novo Projeto e ações da tabela', () => {
    it('é exibido quando o usuário possui Research.Projects.Manage', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Novo Projeto');
    });

    it('é ocultado quando o usuário não possui Research.Projects.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Novo Projeto');
    });
  });

  describe('busca server-side', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('envia o termo de busca para getProjects após o debounce', async () => {
      await setup();
      projectsServiceMock.getProjects.mockClear();

      (component as any).onSearchInput({ target: { value: 'genético' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(projectsServiceMock.getProjects).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 10,
        search: 'genético',
      });
    });

    it('reseta para a primeira página ao buscar', async () => {
      await setup();
      (component as any).first.set(20);

      (component as any).onSearchInput({ target: { value: 'butantan' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect((component as any).first()).toBe(0);
    });

    it('não envia o parâmetro search quando a busca está vazia', async () => {
      await setup();
      projectsServiceMock.getProjects.mockClear();

      (component as any).onSearchInput({ target: { value: '' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(projectsServiceMock.getProjects).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 10,
        search: undefined,
      });
    });
  });

  describe('abrir diálogos', () => {
    it('openCreate abre o formulário em modo criação', async () => {
      await setup();

      (component as any).openCreate();

      expect((component as any).formVisible()).toBe(true);
      expect((component as any).editingProjectId()).toBeNull();
    });

    it('openEdit abre o formulário em modo edição com o id do projeto', async () => {
      await setup();

      (component as any).openEdit(makeProject({ id: 'pr2' }));

      expect((component as any).formVisible()).toBe(true);
      expect((component as any).editingProjectId()).toBe('pr2');
    });

    it('openDetail abre o modal de detalhes com o id do projeto selecionado', async () => {
      await setup();

      (component as any).openDetail(makeProject({ id: 'pr3' }));

      expect((component as any).detailVisible()).toBe(true);
      expect((component as any).selectedProjectId()).toBe('pr3');
    });
  });
});
