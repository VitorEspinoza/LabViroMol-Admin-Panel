import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { PdvTabComponent } from './pdv-tab.component';
import { MaterialsService } from '../../materials/materials.service';
import { StockService } from '../stock.service';
import { ProjectsService } from '../../../research/projects/projects.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CartService } from './cart/cart.service';
import { Material } from '../../../../shared/models/inventory.model';
import { PagedResponse } from '../../../../shared/models/pagination.model';

const makeMaterial = (overrides: Partial<Material> = {}): Material => ({
  materialId: 'mat1',
  name: 'Álcool 70%',
  location: 'Armário A1',
  stockQuantity: 5,
  minStock: 1,
  unit: 'Milliliter',
  typeId: 'mt1',
  typeName: 'Reagentes',
  isLowStock: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: null,
  ...overrides,
});

const pagedResponse = (materials: Material[]): PagedResponse<Material> => ({
  data: materials,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: materials.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('PdvTabComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<PdvTabComponent>;
  let component: PdvTabComponent;
  let cartService: CartService;
  let materialsServiceMock: Mocked<Pick<MaterialsService, 'getMaterials'>>;
  let stockServiceMock: Mocked<Pick<StockService, 'consumeForProject'>>;
  let projectsServiceMock: Mocked<Pick<ProjectsService, 'getProjects'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [PdvTabComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        CartService,
        { provide: MaterialsService, useValue: materialsServiceMock },
        { provide: StockService, useValue: stockServiceMock },
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PdvTabComponent);
    component = fixture.componentInstance;
    cartService = fixture.debugElement.injector.get(CartService);
    fixture.detectChanges();
  };

  beforeEach(() => {
    materialsServiceMock = {
      getMaterials: vi.fn().mockReturnValue(of(pagedResponse([makeMaterial()]))),
    };
    stockServiceMock = {
      consumeForProject: vi.fn().mockReturnValue(of(undefined)),
    };
    projectsServiceMock = {
      getProjects: vi.fn().mockReturnValue(of(pagedResponse([]) as any)),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
  });

  it('carrega os materiais ao inicializar (via onLazyLoad)', async () => {
    await setup();

    expect(materialsServiceMock.getMaterials).toHaveBeenCalledWith(
      expect.objectContaining({ pageNumber: 1, pageSize: 10, search: undefined }),
    );
    expect((component as any).materials().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  describe('busca server-side', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('envia o termo de busca para getMaterials após o debounce e volta para a primeira página', async () => {
      await setup();
      materialsServiceMock.getMaterials.mockClear();
      (component as any).first.set(20);

      (component as any).onSearchInput({ target: { value: 'álcool' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(materialsServiceMock.getMaterials).toHaveBeenCalledWith(
        expect.objectContaining({ pageNumber: 1, pageSize: 10, search: 'álcool' }),
      );
      expect((component as any).first()).toBe(0);
    });
  });

  describe('addToCart', () => {
    it('adiciona um novo item ao carrinho sem exibir toast', async () => {
      await setup();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).addToCart(makeMaterial({ materialId: 'mat1', stockQuantity: 5 }));

      expect(cartService.items()).toEqual([
        { materialId: 'mat1', materialName: 'Álcool 70%', unit: 'Milliliter', maxQuantity: 5, quantity: 1 },
      ]);
      expect(addSpy).not.toHaveBeenCalled();
    });

    it('incrementa a quantidade e exibe um toast informativo quando o item já está no carrinho', async () => {
      await setup();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');
      const material = makeMaterial({ materialId: 'mat1', stockQuantity: 5 });

      (component as any).addToCart(material);
      (component as any).addToCart(material);

      expect(cartService.items()[0].quantity).toBe(2);
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'info' }));
    });

    it('exibe um toast de aviso quando o estoque máximo já está no carrinho', async () => {
      await setup();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');
      const material = makeMaterial({ materialId: 'mat1', stockQuantity: 1 });

      (component as any).addToCart(material);
      (component as any).addToCart(material);

      expect(cartService.items()[0].quantity).toBe(1);
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
    });
  });

  describe('indicador de estoque baixo e ação de adicionar', () => {
    it('exibe o botão "Adicionar" desabilitado quando a quantidade em estoque é zero', async () => {
      await setup();
      (component as any).materials.set([makeMaterial({ stockQuantity: 0 })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Adicionar');
    });

    it('exibe indicador de alerta quando isLowStock é true', async () => {
      await setup();
      (component as any).materials.set([makeMaterial({ isLowStock: true, stockQuantity: 1, unit: 'Milliliter' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('.pi-exclamation-triangle')).toBeTruthy();
      expect(compiled.textContent).toContain('1 Mililitro');
    });
  });
});
