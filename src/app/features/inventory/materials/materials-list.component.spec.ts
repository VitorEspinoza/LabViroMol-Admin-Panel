import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of } from 'rxjs';

import { MaterialsListComponent } from './materials-list.component';
import { MaterialsService } from './materials.service';
import { MaterialTypesService } from '../material-types/material-types.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Material } from '../../../shared/models/inventory.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const makeMaterial = (overrides: Partial<Material> = {}): Material => ({
  materialId: 'mat1',
  name: 'Álcool 70%',
  location: 'Armário A1',
  stockQuantity: 500,
  minStock: 100,
  unit: 'Milliliter',
  typeName: 'Reagentes',
  isLowStock: false,
  ...overrides,
});

const pagedResponse = (materials: Material[]): PagedResponse<Material> => ({
  data: materials,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: materials.length,
});

const emptyTypesResponse = {
  data: [],
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: 0,
};

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MaterialsListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<MaterialsListComponent>;
  let component: MaterialsListComponent;
  let materialsServiceMock: Mocked<Pick<MaterialsService, 'getMaterials' | 'getMaterialById' | 'createMaterial' | 'updateMaterial'>>;
  let materialTypesServiceMock: Mocked<Pick<MaterialTypesService, 'getTypes'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialsListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MaterialsService, useValue: materialsServiceMock },
        { provide: MaterialTypesService, useValue: materialTypesServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    materialsServiceMock = {
      getMaterials: vi.fn().mockReturnValue(of(pagedResponse([makeMaterial()]))),
      getMaterialById: vi.fn().mockReturnValue(of(makeMaterial())),
      createMaterial: vi.fn(),
      updateMaterial: vi.fn(),
    };
    materialTypesServiceMock = {
      getTypes: vi.fn().mockReturnValue(of(emptyTypesResponse)),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
  });

  it('deve criar o componente e carregar os materiais ao inicializar (via onLazyLoad)', async () => {
    await setup();

    expect(materialsServiceMock.getMaterials).toHaveBeenCalledWith({
      pageNumber: 1,
      pageSize: 10,
      search: undefined,
      sortBy: undefined,
      sortDirection: undefined,
    });
    expect((component as any).materials().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  describe('botão Novo Material', () => {
    it('é exibido quando o usuário possui Inventory.Materials.Manage', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Novo Material');
    });

    it('é ocultado quando o usuário não possui Inventory.Materials.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Novo Material');
    });
  });

  describe('busca server-side', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('envia o termo de busca para getMaterials após o debounce', async () => {
      await setup();
      materialsServiceMock.getMaterials.mockClear();

      (component as any).onSearchInput({ target: { value: 'álcool' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(materialsServiceMock.getMaterials).toHaveBeenCalledWith(
        expect.objectContaining({ pageNumber: 1, pageSize: 10, search: 'álcool' }),
      );
    });

    it('reseta para a primeira página ao buscar', async () => {
      await setup();
      (component as any).first.set(20);

      (component as any).onSearchInput({ target: { value: 'luvas' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect((component as any).first()).toBe(0);
    });
  });

  describe('ordenação server-side', () => {
    it('envia sortBy e sortDirection=asc quando sortOrder é 1', async () => {
      await setup();
      materialsServiceMock.getMaterials.mockClear();

      (component as any).loadMaterials({ first: 0, rows: 10, sortField: 'name', sortOrder: 1 });

      expect(materialsServiceMock.getMaterials).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'name', sortDirection: 'asc' }),
      );
    });

    it('envia sortDirection=desc quando sortOrder é -1', async () => {
      await setup();
      materialsServiceMock.getMaterials.mockClear();

      (component as any).loadMaterials({ first: 0, rows: 10, sortField: 'location', sortOrder: -1 });

      expect(materialsServiceMock.getMaterials).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'location', sortDirection: 'desc' }),
      );
    });
  });

  describe('indicador de estoque baixo', () => {
    it('exibe quantidade em vermelho com ícone de alerta quando isLowStock é true', async () => {
      await setup();
      (component as any).materials.set([makeMaterial({ isLowStock: true, stockQuantity: 10, unit: 'Milliliter' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('.pi-exclamation-triangle')).toBeTruthy();
      expect(compiled.querySelector('.text-red-600')).toBeTruthy();
      expect(compiled.textContent).toContain('10 Mililitro');
    });

    it('não exibe indicador de alerta quando isLowStock é false', async () => {
      await setup();
      (component as any).materials.set([makeMaterial({ isLowStock: false, stockQuantity: 500, unit: 'Gram' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('.pi-exclamation-triangle')).toBeFalsy();
      expect(compiled.textContent).toContain('500 Grama');
    });
  });

  describe('coluna Unidade', () => {
    it('traduz a unidade usando o MaterialUnitLabelPipe', async () => {
      await setup();
      (component as any).materials.set([makeMaterial({ unit: 'Piece' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Peça');
    });
  });

  describe('ações da tabela', () => {
    it('abre o diálogo de edição com o material selecionado', async () => {
      await setup();
      const material = makeMaterial();
      (component as any).openEdit(material);

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).selectedMaterial()).toEqual(material);
    });

    it('abre o diálogo de criação sem material selecionado', async () => {
      await setup();
      (component as any).openCreate();

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).selectedMaterial()).toBeNull();
    });

    it('recarrega a lista após salvar o formulário', async () => {
      await setup();
      materialsServiceMock.getMaterials.mockClear();

      (component as any).onFormSaved();

      expect(materialsServiceMock.getMaterials).toHaveBeenCalled();
    });
  });

  describe('destaque a partir de notificação (query param highlight)', () => {
    it('busca o material, filtra pelo nome e aplica destaque temporário na linha', async () => {
      vi.useFakeTimers();

      await TestBed.configureTestingModule({
        imports: [MaterialsListComponent],
        providers: [
          provideNoopAnimations(),
          provideRouter([]),
          {
            provide: ActivatedRoute,
            useValue: { queryParamMap: of(convertToParamMap({ highlight: 'mat1' })) },
          },
          { provide: MaterialsService, useValue: materialsServiceMock },
          { provide: MaterialTypesService, useValue: materialTypesServiceMock },
          { provide: AuthService, useValue: authServiceMock },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(MaterialsListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(materialsServiceMock.getMaterialById).toHaveBeenCalledWith('mat1');
      expect((component as any).highlightedMaterialId()).toBe('mat1');
      expect((component as any).searchQuery()).toBe('Álcool 70%');
      expect(materialsServiceMock.getMaterials).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Álcool 70%' }),
      );

      vi.advanceTimersByTime(3000);
      expect((component as any).highlightedMaterialId()).toBeNull();

      vi.useRealTimers();
    });
  });
});
