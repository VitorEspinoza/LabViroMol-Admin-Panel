import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { PartnersListComponent } from './partners-list.component';
import { PartnersService } from './partners.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialogService, ConfirmOptions } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Partner } from '../../../shared/models/research.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const makePartner = (overrides: Partial<Partner> = {}): Partner => ({
  id: 'pa1',
  name: 'Universidade Federal',
  description: 'Parceria em pesquisa clínica.',
  ...overrides,
});

const pagedResponse = (partners: Partner[]): PagedResponse<Partner> => ({
  data: partners,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: partners.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('PartnersListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<PartnersListComponent>;
  let component: PartnersListComponent;
  let partnersServiceMock: Mocked<Pick<PartnersService, 'getPartners' | 'createPartner' | 'updatePartner' | 'deletePartner'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: PartnersService, useValue: partnersServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    partnersServiceMock = {
      getPartners: vi.fn().mockReturnValue(of(pagedResponse([makePartner()]))),
      createPartner: vi.fn().mockReturnValue(of(undefined)),
      updatePartner: vi.fn().mockReturnValue(of(undefined)),
      deletePartner: vi.fn().mockReturnValue(of(undefined)),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
    confirmDialogServiceMock = {
      confirm: vi.fn((options: ConfirmOptions) => options.accept()),
    };
  });

  it('deve criar o componente e carregar os parceiros ao inicializar', async () => {
    await setup();

    expect(component).toBeTruthy();
    expect(partnersServiceMock.getPartners).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 });
    expect((component as any).partners().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  it('trata erro ao carregar parceiros sem travar o componente', async () => {
    partnersServiceMock.getPartners = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    await setup();

    expect((component as any).loading()).toBe(false);
    expect((component as any).partners()).toEqual([]);
  });

  describe('botão Novo Parceiro', () => {
    it('é exibido quando o usuário possui Research.Partners.Manage', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Novo Parceiro');
    });

    it('é ocultado quando o usuário não possui Research.Partners.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Novo Parceiro');
    });
  });

  describe('busca server-side', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('envia o termo de busca para getPartners após o debounce', async () => {
      await setup();
      partnersServiceMock.getPartners.mockClear();

      (component as any).onSearchInput({ target: { value: 'tecnologia' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(partnersServiceMock.getPartners).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 10,
        search: 'tecnologia',
      });
    });

    it('reseta para a primeira página ao buscar', async () => {
      await setup();
      (component as any).first.set(20);

      (component as any).onSearchInput({ target: { value: 'clínica' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect((component as any).first()).toBe(0);
    });

    it('não envia o parâmetro search quando a busca está vazia', async () => {
      await setup();
      partnersServiceMock.getPartners.mockClear();

      (component as any).onSearchInput({ target: { value: '' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(partnersServiceMock.getPartners).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 10,
        search: undefined,
      });
    });
  });

  describe('openCreate / onSave (criação)', () => {
    it('abre o diálogo de criação com formulário limpo', async () => {
      await setup();

      (component as any).openCreate();

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).editingPartner()).toBeNull();
      expect((component as any).form.value.name).toBe('');
      expect((component as any).form.value.description).toBe('');
      expect((component as any).dialogTitle()).toBe('Novo Parceiro');
    });

    it('não envia o formulário inválido (nome obrigatório)', async () => {
      await setup();
      (component as any).openCreate();

      (component as any).onSave();

      expect(partnersServiceMock.createPartner).not.toHaveBeenCalled();
      expect((component as any).form.touched).toBe(true);
    });

    it('cria o parceiro, exibe toast de sucesso, fecha o diálogo e recarrega a lista', async () => {
      await setup();
      (component as any).openCreate();
      (component as any).form.setValue({ name: 'Instituto de Tecnologia', description: 'Apoio laboratorial.' });

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');
      partnersServiceMock.getPartners.mockClear();

      (component as any).onSave();

      expect(partnersServiceMock.createPartner).toHaveBeenCalledWith({
        name: 'Instituto de Tecnologia',
        description: 'Apoio laboratorial.',
      });
      expect((component as any).dialogVisible()).toBe(false);
      expect(partnersServiceMock.getPartners).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('exibe toast de erro do servidor quando a criação falha', async () => {
      partnersServiceMock.createPartner = vi.fn().mockReturnValue(
        throwError(() => ({ status: 400, error: { errors: ['Nome já cadastrado.'] } })),
      );
      await setup();
      (component as any).openCreate();
      (component as any).form.setValue({ name: 'Instituto de Tecnologia', description: '' });

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).onSave();

      expect((component as any).saving()).toBe(false);
      expect((component as any).dialogVisible()).toBe(true);
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Nome já cadastrado.' }),
      );
    });
  });

  describe('openEdit / onSave (edição)', () => {
    it('abre o diálogo de edição com o formulário preenchido', async () => {
      await setup();
      const partner = makePartner();

      (component as any).openEdit(partner);

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).editingPartner()).toEqual(partner);
      expect((component as any).form.value.name).toBe(partner.name);
      expect((component as any).form.value.description).toBe(partner.description);
      expect((component as any).dialogTitle()).toBe('Editar Parceiro');
    });

    it('atualiza o parceiro, exibe toast de sucesso, fecha o diálogo e recarrega a lista', async () => {
      await setup();
      const partner = makePartner();
      (component as any).openEdit(partner);
      (component as any).form.setValue({ name: 'Universidade Federal Atualizada', description: 'Nova descrição.' });

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');
      partnersServiceMock.getPartners.mockClear();

      (component as any).onSave();

      expect(partnersServiceMock.updatePartner).toHaveBeenCalledWith('pa1', {
        name: 'Universidade Federal Atualizada',
        description: 'Nova descrição.',
      });
      expect((component as any).dialogVisible()).toBe(false);
      expect(partnersServiceMock.getPartners).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('exibe toast de erro do servidor quando a atualização falha', async () => {
      partnersServiceMock.updatePartner = vi.fn().mockReturnValue(
        throwError(() => ({ status: 400, error: { errors: ['Nome já cadastrado.'] } })),
      );
      await setup();
      (component as any).openEdit(makePartner());

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).onSave();

      expect((component as any).saving()).toBe(false);
      expect((component as any).dialogVisible()).toBe(true);
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Nome já cadastrado.' }),
      );
    });
  });

  describe('confirmDelete', () => {
    it('exclui o parceiro após confirmação e exibe toast de sucesso', async () => {
      await setup();

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).confirmDelete(makePartner());

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
      expect(partnersServiceMock.deletePartner).toHaveBeenCalledWith('pa1');
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('exibe toast de erro do servidor ao excluir parceiro vinculado a projeto ativo (422)', async () => {
      partnersServiceMock.deletePartner = vi.fn().mockReturnValue(
        throwError(() => ({ status: 422, error: { errors: ['Não é possível excluir um parceiro vinculado a um projeto ativo.'] } })),
      );
      await setup();

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).confirmDelete(makePartner());

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Não é possível excluir um parceiro vinculado a um projeto ativo.' }),
      );
    });
  });
});
