import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';

import { MaterialTypesListComponent } from './material-types-list.component';
import { MaterialTypesService } from './material-types.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CreatedResponse, MaterialType } from '../../../shared/models/inventory.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const makeType = (overrides: Partial<MaterialType> = {}): MaterialType => ({
  materialTypeId: 'mt1',
  name: 'Reagentes',
  active: true,
  ...overrides,
});

const pagedResponse = (types: MaterialType[]): PagedResponse<MaterialType> => ({
  data: types,
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: types.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MaterialTypesListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<MaterialTypesListComponent>;
  let component: MaterialTypesListComponent;
  let materialTypesServiceMock: Mocked<
    Pick<MaterialTypesService, 'getTypes' | 'createType' | 'activateType' | 'deactivateType'>
  >;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialTypesListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MaterialTypesService, useValue: materialTypesServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialTypesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    materialTypesServiceMock = {
      getTypes: vi.fn().mockReturnValue(of(pagedResponse([makeType()]))),
      createType: vi.fn().mockReturnValue(of<CreatedResponse>({ id: 'mt-novo' })),
      activateType: vi.fn().mockReturnValue(of(undefined)),
      deactivateType: vi.fn().mockReturnValue(of(undefined)),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
  });

  it('deve criar o componente e carregar os tipos ao inicializar', async () => {
    await setup();

    expect(component).toBeTruthy();
    expect(materialTypesServiceMock.getTypes).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 100 });
    expect((component as any).types().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  it('trata erro ao carregar tipos sem travar o componente', async () => {
    materialTypesServiceMock.getTypes = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    await setup();

    expect((component as any).loading()).toBe(false);
    expect((component as any).types()).toEqual([]);
  });

  describe('botão Novo Tipo', () => {
    it('é exibido quando o usuário possui Inventory.Materials.Manage', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Novo Tipo');
    });

    it('é ocultado quando o usuário não possui Inventory.Materials.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Novo Tipo');
    });
  });

  describe('busca local', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('filtra os tipos localmente por nome após o debounce', async () => {
      materialTypesServiceMock.getTypes = vi.fn().mockReturnValue(
        of(pagedResponse([makeType({ materialTypeId: 'mt1', name: 'Reagentes' }), makeType({ materialTypeId: 'mt2', name: 'Vidrarias' })])),
      );
      await setup();

      (component as any).onSearchInput({ target: { value: 'vidr' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      const filtered = (component as any).filteredTypes() as MaterialType[];
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Vidrarias');
      expect(materialTypesServiceMock.getTypes).toHaveBeenCalledTimes(1);
    });

    it('retorna todos os tipos quando a busca está vazia', async () => {
      materialTypesServiceMock.getTypes = vi.fn().mockReturnValue(
        of(pagedResponse([makeType({ materialTypeId: 'mt1', name: 'Reagentes' }), makeType({ materialTypeId: 'mt2', name: 'Vidrarias' })])),
      );
      await setup();

      (component as any).onSearchInput({ target: { value: '' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect((component as any).filteredTypes().length).toBe(2);
    });
  });

  describe('openCreate / onSave', () => {
    it('abre o diálogo de criação com formulário resetado e ativo ligado por padrão', async () => {
      await setup();

      (component as any).openCreate();

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).form.value.name).toBe('');
      expect((component as any).form.value.active).toBe(true);
    });

    it('não envia o formulário inválido (nome obrigatório)', async () => {
      await setup();
      (component as any).openCreate();

      (component as any).onSave();

      expect(materialTypesServiceMock.createType).not.toHaveBeenCalled();
      expect((component as any).form.touched).toBe(true);
    });

    it('cria o tipo ativo, exibe toast de sucesso, fecha o diálogo e recarrega a lista', async () => {
      await setup();
      (component as any).openCreate();
      (component as any).form.setValue({ name: 'Vidrarias', active: true });

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');
      materialTypesServiceMock.getTypes.mockClear();

      (component as any).onSave();

      expect(materialTypesServiceMock.createType).toHaveBeenCalledWith({ name: 'Vidrarias' });
      expect(materialTypesServiceMock.deactivateType).not.toHaveBeenCalled();
      expect((component as any).dialogVisible()).toBe(false);
      expect(materialTypesServiceMock.getTypes).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('cria o tipo inativo e desativa o tipo recém-criado', async () => {
      await setup();
      (component as any).openCreate();
      (component as any).form.setValue({ name: 'Vidrarias', active: false });

      (component as any).onSave();

      expect(materialTypesServiceMock.createType).toHaveBeenCalledWith({ name: 'Vidrarias' });
      expect(materialTypesServiceMock.deactivateType).toHaveBeenCalledWith('mt-novo');
      expect((component as any).dialogVisible()).toBe(false);
    });

    it('exibe toast de erro do servidor quando a criação falha', async () => {
      materialTypesServiceMock.createType = vi.fn().mockReturnValue(
        throwError(() => ({ status: 400, error: { errors: ['O nome é obrigatório.'] } })),
      );
      await setup();
      (component as any).openCreate();
      (component as any).form.setValue({ name: 'Vidrarias', active: true });

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).onSave();

      expect((component as any).saving()).toBe(false);
      expect((component as any).dialogVisible()).toBe(true);
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'O nome é obrigatório.' }),
      );
    });
  });

  describe('toggleActive', () => {
    it('atualiza o signal local imediatamente, antes da resposta do servidor', async () => {
      const subject = new Subject<void>();
      materialTypesServiceMock.deactivateType = vi.fn().mockReturnValue(subject.asObservable());
      await setup();

      (component as any).toggleActive(makeType({ materialTypeId: 'mt1', active: true }));

      expect((component as any).types()[0].active).toBe(false);
      expect(materialTypesServiceMock.deactivateType).toHaveBeenCalledWith('mt1');

      subject.next();
      subject.complete();
      expect((component as any).types()[0].active).toBe(false);
    });

    it('chama activateType quando o tipo está inativo', async () => {
      materialTypesServiceMock.getTypes = vi.fn().mockReturnValue(
        of(pagedResponse([makeType({ materialTypeId: 'mt1', active: false })])),
      );
      await setup();

      (component as any).toggleActive(makeType({ materialTypeId: 'mt1', active: false }));

      expect((component as any).types()[0].active).toBe(true);
      expect(materialTypesServiceMock.activateType).toHaveBeenCalledWith('mt1');
    });

    it('reverte o signal e exibe toast de erro quando a chamada falha', async () => {
      materialTypesServiceMock.deactivateType = vi.fn().mockReturnValue(
        throwError(() => ({ status: 409, error: { errors: ['Tipo de material possui materiais vinculados.'] } })),
      );
      await setup();

      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).toggleActive(makeType({ materialTypeId: 'mt1', active: true }));

      expect((component as any).types()[0].active).toBe(true);
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Tipo de material possui materiais vinculados.' }),
      );
    });
  });
});
