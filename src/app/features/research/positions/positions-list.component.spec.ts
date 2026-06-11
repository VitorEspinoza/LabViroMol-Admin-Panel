import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { PositionsListComponent } from './positions-list.component';
import { PositionsService } from './positions.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialogService, ConfirmOptions } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Position } from '../../../shared/models/research.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  id: 'p1',
  name: 'Pesquisador Sênior',
  description: 'Lidera projetos de pesquisa.',
  ...overrides,
});

const pagedResponse = (positions: Position[]): PagedResponse<Position> => ({
  data: positions,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: positions.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('PositionsListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<PositionsListComponent>;
  let component: PositionsListComponent;
  let positionsServiceMock: Mocked<Pick<PositionsService, 'getPositions' | 'createPosition' | 'deletePosition'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [PositionsListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: PositionsService, useValue: positionsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PositionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    positionsServiceMock = {
      getPositions: vi.fn().mockReturnValue(of(pagedResponse([makePosition()]))),
      createPosition: vi.fn().mockReturnValue(of(undefined)),
      deletePosition: vi.fn().mockReturnValue(of(undefined)),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
    confirmDialogServiceMock = {
      confirm: vi.fn((options: ConfirmOptions) => options.accept()),
    };
  });

  it('deve criar o componente e carregar as posições ao inicializar', async () => {
    await setup();

    expect(component).toBeTruthy();
    expect(positionsServiceMock.getPositions).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 });
    expect((component as any).positions().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  it('trata erro ao carregar posições sem travar o componente', async () => {
    positionsServiceMock.getPositions = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    await setup();

    expect((component as any).loading()).toBe(false);
    expect((component as any).positions()).toEqual([]);
  });

  describe('botão Nova Posição', () => {
    it('é exibido quando o usuário possui Research.Positions.Manage', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Nova Posição');
    });

    it('é ocultado quando o usuário não possui Research.Positions.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Nova Posição');
    });
  });

  describe('busca server-side', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('envia o termo de busca para getPositions após o debounce', async () => {
      await setup();
      positionsServiceMock.getPositions.mockClear();

      (component as any).onSearchInput({ target: { value: 'sênior' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(positionsServiceMock.getPositions).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 10,
        search: 'sênior',
      });
    });

    it('reseta para a primeira página ao buscar', async () => {
      await setup();
      (component as any).first.set(20);

      (component as any).onSearchInput({ target: { value: 'estagiário' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect((component as any).first()).toBe(0);
    });

    it('não envia o parâmetro search quando a busca está vazia', async () => {
      await setup();
      positionsServiceMock.getPositions.mockClear();

      (component as any).onSearchInput({ target: { value: '' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(positionsServiceMock.getPositions).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 10,
        search: undefined,
      });
    });
  });

  describe('openCreate / onSave', () => {
    it('abre o diálogo de criação com formulário limpo', async () => {
      await setup();

      (component as any).openCreate();

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).form.value.name).toBe('');
      expect((component as any).form.value.description).toBe('');
    });

    it('não envia o formulário inválido (nome obrigatório)', async () => {
      await setup();
      (component as any).openCreate();

      (component as any).onSave();

      expect(positionsServiceMock.createPosition).not.toHaveBeenCalled();
      expect((component as any).form.touched).toBe(true);
    });

    it('cria a posição, exibe toast de sucesso, fecha o diálogo e recarrega a lista', async () => {
      await setup();
      (component as any).openCreate();
      (component as any).form.setValue({ name: 'Estagiário', description: 'Apoio a projetos.' });

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');
      positionsServiceMock.getPositions.mockClear();

      (component as any).onSave();

      expect(positionsServiceMock.createPosition).toHaveBeenCalledWith({
        name: 'Estagiário',
        description: 'Apoio a projetos.',
      });
      expect((component as any).dialogVisible()).toBe(false);
      expect(positionsServiceMock.getPositions).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('exibe toast de erro do servidor quando a criação falha', async () => {
      positionsServiceMock.createPosition = vi.fn().mockReturnValue(
        throwError(() => ({ status: 400, error: { errors: ['Nome já cadastrado.'] } })),
      );
      await setup();
      (component as any).openCreate();
      (component as any).form.setValue({ name: 'Estagiário', description: '' });

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
    it('exclui a posição após confirmação e exibe toast de sucesso', async () => {
      await setup();

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).confirmDelete(makePosition());

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
      expect(positionsServiceMock.deletePosition).toHaveBeenCalledWith('p1');
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('exibe toast de erro do servidor ao excluir posição vinculada a pesquisador (422)', async () => {
      positionsServiceMock.deletePosition = vi.fn().mockReturnValue(
        throwError(() => ({ status: 422, error: { errors: ['Não é possível excluir uma posição em uso.'] } })),
      );
      await setup();

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).confirmDelete(makePosition());

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Não é possível excluir uma posição em uso.' }),
      );
    });
  });
});
