import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { ProjectDetailComponent } from './project-detail.component';
import { ProjectsService } from '../../../projects/projects.service';
import { ResearchersService } from '../../../researchers/researchers.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ConfirmDialogService, ConfirmOptions } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Project, Researcher } from '../../../../../shared/models/research.model';
import { PagedResponse } from '../../../../../shared/models/pagination.model';

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'pr1',
  title: 'Estudo de Arboviroses',
  description: 'Pesquisa sobre arboviroses na região.',
  status: 'Planned',
  partnerId: 'pa1',
  partnerName: 'Universidade Federal',
  members: [
    { researcherId: 'r1', researcherName: 'Ana Silva', role: 'ResearchLead' },
    { researcherId: 'r2', researcherName: 'Carlos Souza', role: 'Collaborator' },
  ],
  createdAt: '2026-01-10T00:00:00Z',
  ...overrides,
});

const makeResearchers = (): Researcher[] => [
  { id: 'r1', displayName: 'Ana Silva', degreeLevel: 'Doctorate', position: 'Pesquisador Sênior', lattesUrl: null },
  { id: 'r2', displayName: 'Carlos Souza', degreeLevel: 'Masters', position: 'Pesquisador', lattesUrl: null },
  { id: 'r3', displayName: 'Beatriz Lima', degreeLevel: 'Doctorate', position: 'Pesquisador Sênior', lattesUrl: null },
];

const pagedResearchers = (researchers: Researcher[]): PagedResponse<Researcher> => ({
  data: researchers,
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: researchers.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('ProjectDetailComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<ProjectDetailComponent>;
  let component: ProjectDetailComponent;
  let projectsServiceMock: Mocked<
    Pick<
      ProjectsService,
      | 'getProjectById'
      | 'startProject'
      | 'completeProject'
      | 'cancelProject'
      | 'addMember'
      | 'changeMemberRole'
      | 'removeMember'
      | 'transferLeadership'
    >
  >;
  let researchersServiceMock: Mocked<Pick<ResearchersService, 'getResearchers'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn>; currentUser: ReturnType<typeof signal> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async (project: Project = makeProject()) => {
    projectsServiceMock.getProjectById = vi.fn().mockReturnValue(of(project));

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: ResearchersService, useValue: researchersServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('projectId', project.id);
    fixture.detectChanges();

    (component as any).onDialogShow();
  };

  beforeEach(() => {
    projectsServiceMock = {
      getProjectById: vi.fn().mockReturnValue(of(makeProject())),
      startProject: vi.fn().mockReturnValue(of(undefined)),
      completeProject: vi.fn().mockReturnValue(of(undefined)),
      cancelProject: vi.fn().mockReturnValue(of(undefined)),
      addMember: vi.fn().mockReturnValue(of(undefined)),
      changeMemberRole: vi.fn().mockReturnValue(of(undefined)),
      removeMember: vi.fn().mockReturnValue(of(undefined)),
      transferLeadership: vi.fn().mockReturnValue(of(undefined)),
    };
    researchersServiceMock = {
      getResearchers: vi.fn().mockReturnValue(of(pagedResearchers(makeResearchers()))),
    };
    authServiceMock = {
      hasPermission: vi.fn().mockReturnValue(true),
      currentUser: signal({ userId: 'u1', email: 'a@a.com', firstName: 'Ana', lastName: 'Silva', permissions: [] }),
    };
    confirmDialogServiceMock = {
      confirm: vi.fn((options: ConfirmOptions) => options.accept()),
    };
  });

  it('carrega o projeto e os pesquisadores ao abrir o diálogo', async () => {
    await setup();

    expect(projectsServiceMock.getProjectById).toHaveBeenCalledWith('pr1');
    expect((component as any).project()?.id).toBe('pr1');
    expect((component as any).researcherOptions().length).toBe(3);
  });

  describe('botões de ciclo de vida por status', () => {
    it('exibe "Iniciar Projeto" quando o status é Planned', async () => {
      await setup(makeProject({ status: 'Planned' }));
      (component as any).visible.set(true);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Iniciar Projeto');
      expect(compiled.textContent).toContain('Cancelar Projeto');
      expect(compiled.textContent).not.toContain('Concluir Projeto');
    });

    it('exibe "Concluir Projeto" e "Cancelar Projeto" quando o status é InProgress', async () => {
      await setup(makeProject({ status: 'InProgress' }));
      (component as any).visible.set(true);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Concluir Projeto');
      expect(compiled.textContent).toContain('Cancelar Projeto');
      expect(compiled.textContent).not.toContain('Iniciar Projeto');
    });

    it('não exibe botões de lifecycle quando o status é Completed', async () => {
      await setup(makeProject({ status: 'Completed' }));
      (component as any).visible.set(true);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Iniciar Projeto');
      expect(compiled.textContent).not.toContain('Concluir Projeto');
      expect(compiled.textContent).not.toContain('Cancelar Projeto');
    });

    it('oculta os botões de gestão quando o usuário não possui Research.Projects.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup(makeProject({ status: 'Planned' }));
      (component as any).visible.set(true);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Iniciar Projeto');
      expect(compiled.textContent).not.toContain('Adicionar Membro');
      expect(compiled.textContent).not.toContain('Transferir Liderança');
    });
  });

  describe('ações de ciclo de vida', () => {
    it('startProject envia o userId do usuário logado como researcherId', async () => {
      await setup(makeProject({ status: 'Planned' }));

      (component as any).startProject();

      expect(projectsServiceMock.startProject).toHaveBeenCalledWith('pr1', 'u1');
    });

    it('confirmComplete pede confirmação e chama completeProject', async () => {
      await setup(makeProject({ status: 'InProgress' }));

      (component as any).confirmComplete();

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
      expect(projectsServiceMock.completeProject).toHaveBeenCalledWith('pr1', 'u1');
    });

    it('confirmCancel pede confirmação e chama cancelProject', async () => {
      await setup(makeProject({ status: 'InProgress' }));

      (component as any).confirmCancel();

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
      expect(projectsServiceMock.cancelProject).toHaveBeenCalledWith('pr1', 'u1');
    });

    it('exibe toast de erro quando uma ação de ciclo de vida falha', async () => {
      projectsServiceMock.startProject = vi.fn().mockReturnValue(
        throwError(() => ({ status: 422, error: { errors: ['Projeto não pode ser iniciado.'] } })),
      );
      await setup(makeProject({ status: 'Planned' }));

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).startProject();

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Projeto não pode ser iniciado.' }),
      );
    });
  });

  describe('gestão de membros', () => {
    it('availableResearchersForAdd exclui pesquisadores que já são membros', async () => {
      await setup();

      const available = (component as any).availableResearchersForAdd();
      expect(available.map((r: any) => r.value)).toEqual(['r3']);
    });

    it('availableResearchersForTransfer exclui o líder atual', async () => {
      await setup();

      const available = (component as any).availableResearchersForTransfer();
      expect(available.map((r: any) => r.value)).toEqual(['r2', 'r3']);
    });

    it('onAddMemberSave adiciona o membro com requestedById do usuário logado', async () => {
      await setup();

      (component as any).openAddMember();
      (component as any).addMemberForm.setValue({ researcherId: 'r3', role: 'Collaborator' });

      (component as any).onAddMemberSave();

      expect(projectsServiceMock.addMember).toHaveBeenCalledWith('pr1', {
        researcherId: 'r3',
        role: 'Collaborator',
        requestedById: 'u1',
      });
      expect((component as any).addMemberVisible()).toBe(false);
    });

    it('não envia o formulário de adicionar membro inválido', async () => {
      await setup();

      (component as any).openAddMember();
      (component as any).addMemberForm.patchValue({ researcherId: '' });

      (component as any).onAddMemberSave();

      expect(projectsServiceMock.addMember).not.toHaveBeenCalled();
    });

    it('onChangeMemberRole atualiza a função do membro', async () => {
      await setup();

      (component as any).onChangeMemberRole('r2', 'Manager');

      expect(projectsServiceMock.changeMemberRole).toHaveBeenCalledWith('pr1', 'r2', {
        newRole: 'Manager',
        requestedById: 'u1',
      });
    });

    it('confirmRemoveMember pede confirmação e remove o membro', async () => {
      await setup();

      (component as any).confirmRemoveMember('r2', 'Carlos Souza');

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
      expect(projectsServiceMock.removeMember).toHaveBeenCalledWith('pr1', 'r2', 'u1');
    });

    it('onTransferSave transfere a liderança com requestedById do usuário logado', async () => {
      await setup();

      (component as any).openTransfer();
      (component as any).transferForm.setValue({ newLeadResearcherId: 'r2' });

      (component as any).onTransferSave();

      expect(projectsServiceMock.transferLeadership).toHaveBeenCalledWith('pr1', {
        newLeadResearcherId: 'r2',
        requestedById: 'u1',
      });
      expect((component as any).transferVisible()).toBe(false);
    });
  });
});
