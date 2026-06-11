import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';

import { PublicationsListComponent } from './publications-list.component';
import { PublicationsService } from '../../publications/publications.service';
import { ResearchersService } from '../../researchers/researchers.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PublicationSummary } from '../../../../shared/models/research.model';
import { PagedResponse } from '../../../../shared/models/pagination.model';

const makePublication = (overrides: Partial<PublicationSummary> = {}): PublicationSummary => ({
  id: 'pub1',
  title: 'Estudo sobre Arboviroses Emergentes',
  doi: '10.1000/xyz123',
  publicationDate: '2026-01-10',
  citationName: 'Ana Silva',
  ...overrides,
});

const pagedResponse = (publications: PublicationSummary[]): PagedResponse<PublicationSummary> => ({
  data: publications,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: publications.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('PublicationsListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<PublicationsListComponent>;
  let component: PublicationsListComponent;
  let publicationsServiceMock: Mocked<
    Pick<PublicationsService, 'getPublications' | 'getPublicationById' | 'assignDoi' | 'deletePublication'>
  >;
  let researchersServiceMock: Mocked<Pick<ResearchersService, 'getResearchers'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn>; currentUser: ReturnType<typeof signal> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [PublicationsListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: PublicationsService, useValue: publicationsServiceMock },
        { provide: ResearchersService, useValue: researchersServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicationsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    publicationsServiceMock = {
      getPublications: vi.fn().mockReturnValue(of(pagedResponse([makePublication()]))),
      getPublicationById: vi.fn(),
      assignDoi: vi.fn().mockReturnValue(of(undefined)),
      deletePublication: vi.fn().mockReturnValue(of(undefined)),
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

  it('deve criar o componente e carregar as publicações ao inicializar', async () => {
    await setup();

    expect(component).toBeTruthy();
    expect(publicationsServiceMock.getPublications).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 });
    expect((component as any).publications().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  it('trata erro ao carregar publicações sem travar o componente', async () => {
    publicationsServiceMock.getPublications = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    await setup();

    expect((component as any).loading()).toBe(false);
    expect((component as any).publications()).toEqual([]);
  });

  describe('botão Nova Publicação', () => {
    it('é exibido quando o usuário possui Research.Publications.Manage', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Nova Publicação');
    });

    it('é ocultado quando o usuário não possui Research.Publications.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Nova Publicação');
    });
  });

  describe('filteredPublications', () => {
    const pub1 = makePublication({ id: 'pub1', title: 'Estudo sobre Arboviroses', doi: '10.1000/aaa', citationName: 'Ana Silva' });
    const pub2 = makePublication({ id: 'pub2', title: 'Mapeamento Genético de Vetores', doi: '10.2000/bbb', citationName: 'Carlos Souza' });

    beforeEach(async () => {
      publicationsServiceMock.getPublications = vi.fn().mockReturnValue(of(pagedResponse([pub1, pub2])));
      await setup();
    });

    it('retorna todas quando a busca está vazia', () => {
      (component as any).searchQuery.set('');
      expect((component as any).filteredPublications().length).toBe(2);
    });

    it('filtra por título', () => {
      (component as any).searchQuery.set('genético');
      expect((component as any).filteredPublications().length).toBe(1);
      expect((component as any).filteredPublications()[0].id).toBe('pub2');
    });

    it('filtra por autor/citationName', () => {
      (component as any).searchQuery.set('carlos');
      expect((component as any).filteredPublications().length).toBe(1);
      expect((component as any).filteredPublications()[0].id).toBe('pub2');
    });

    it('filtra por DOI', () => {
      (component as any).searchQuery.set('10.1000/aaa');
      expect((component as any).filteredPublications().length).toBe(1);
      expect((component as any).filteredPublications()[0].id).toBe('pub1');
    });

    it('retorna lista vazia quando não há correspondência', () => {
      (component as any).searchQuery.set('xyznotfound');
      expect((component as any).filteredPublications().length).toBe(0);
    });
  });

  describe('abrir diálogos', () => {
    it('openCreate abre o formulário em modo criação', async () => {
      await setup();

      (component as any).openCreate();

      expect((component as any).formVisible()).toBe(true);
      expect((component as any).editingPublicationId()).toBeNull();
    });

    it('openEdit abre o formulário em modo edição com o id da publicação', async () => {
      await setup();

      (component as any).openEdit(makePublication({ id: 'pub2' }));

      expect((component as any).formVisible()).toBe(true);
      expect((component as any).editingPublicationId()).toBe('pub2');
    });

    it('onPublicationSaved recarrega a lista de publicações', async () => {
      await setup();
      publicationsServiceMock.getPublications.mockClear();

      (component as any).onPublicationSaved();

      expect(publicationsServiceMock.getPublications).toHaveBeenCalled();
    });
  });

  describe('atribuir DOI', () => {
    it('openAssignDoi abre o diálogo e reseta o formulário de DOI', async () => {
      await setup();

      (component as any).openAssignDoi(makePublication({ id: 'pub3', doi: '' }));

      expect((component as any).doiDialogVisible()).toBe(true);
      expect((component as any).doiForm.value.doi).toBe('');
    });

    it('onAssignDoiCancel fecha o diálogo', async () => {
      await setup();
      (component as any).doiDialogVisible.set(true);

      (component as any).onAssignDoiCancel();

      expect((component as any).doiDialogVisible()).toBe(false);
    });

    it('onAssignDoiSave não envia quando o formulário é inválido', async () => {
      await setup();
      (component as any).openAssignDoi(makePublication({ id: 'pub3', doi: '' }));

      (component as any).onAssignDoiSave();

      expect(publicationsServiceMock.assignDoi).not.toHaveBeenCalled();
    });

    it('onAssignDoiSave atribui o DOI, fecha o diálogo e recarrega a lista', async () => {
      await setup();
      (component as any).openAssignDoi(makePublication({ id: 'pub3', doi: '' }));
      (component as any).doiForm.setValue({ doi: '10.9999/novo' });
      publicationsServiceMock.getPublications.mockClear();

      (component as any).onAssignDoiSave();

      expect(publicationsServiceMock.assignDoi).toHaveBeenCalledWith('pub3', { doi: '10.9999/novo' });
      expect((component as any).doiDialogVisible()).toBe(false);
      expect((component as any).doiSaving()).toBe(false);
      expect(publicationsServiceMock.getPublications).toHaveBeenCalled();
    });

    it('onAssignDoiSave trata erro ao atribuir o DOI', async () => {
      publicationsServiceMock.assignDoi = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
      await setup();
      (component as any).openAssignDoi(makePublication({ id: 'pub3', doi: '' }));
      (component as any).doiForm.setValue({ doi: '10.9999/novo' });

      (component as any).onAssignDoiSave();

      expect((component as any).doiSaving()).toBe(false);
      expect((component as any).doiDialogVisible()).toBe(true);
    });
  });

  describe('exclusão de publicação', () => {
    it('confirmDelete solicita confirmação antes de excluir', async () => {
      await setup();

      (component as any).confirmDelete(makePublication({ id: 'pub1' }));

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
      const args = confirmDialogServiceMock.confirm.mock.calls[0][0];
      expect(args.header).toBe('Excluir Publicação');
    });

    it('exclui a publicação e recarrega a lista ao confirmar', async () => {
      await setup();
      publicationsServiceMock.getPublications.mockClear();

      (component as any).confirmDelete(makePublication({ id: 'pub1' }));
      const args = confirmDialogServiceMock.confirm.mock.calls[0][0];
      args.accept();

      expect(publicationsServiceMock.deletePublication).toHaveBeenCalledWith('pub1');
      expect(publicationsServiceMock.getPublications).toHaveBeenCalled();
    });

    it('trata erro ao excluir publicação', async () => {
      publicationsServiceMock.deletePublication = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
      await setup();

      (component as any).confirmDelete(makePublication({ id: 'pub1' }));
      const args = confirmDialogServiceMock.confirm.mock.calls[0][0];

      expect(() => args.accept()).not.toThrow();
    });
  });
});
