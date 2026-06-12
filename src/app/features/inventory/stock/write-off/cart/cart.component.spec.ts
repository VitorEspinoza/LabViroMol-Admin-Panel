import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { CartComponent } from './cart.component';
import { CartService, CartItem } from './cart.service';
import { StockService } from '../../stock.service';
import { ProjectsService } from '../../../../research/projects/projects.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ProjectSummary } from '../../../../../shared/models/research.model';
import { PagedResponse } from '../../../../../shared/models/pagination.model';

const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  materialId: 'mat1',
  materialName: 'Álcool 70%',
  unit: 'Milliliter',
  maxQuantity: 10,
  quantity: 2,
  ...overrides,
});

const pagedProjects = (data: ProjectSummary[]): PagedResponse<ProjectSummary> => ({
  data,
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: data.length,
});

const makeProject = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: 'proj1',
  title: 'Estudo de Variantes Virais',
  partnerName: 'Parceiro X',
  managerName: 'Pesquisador X',
  status: 'InProgress',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('CartComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<CartComponent>;
  let component: CartComponent;
  let cartService: CartService;
  let stockServiceMock: Mocked<Pick<StockService, 'consumeForProject' | 'removeException'>>;
  let projectsServiceMock: Mocked<Pick<ProjectsService, 'getProjects'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        CartService,
        MessageService,
        { provide: StockService, useValue: stockServiceMock },
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    cartService = fixture.debugElement.injector.get(CartService);
    fixture.detectChanges();
  };

  beforeEach(() => {
    stockServiceMock = {
      consumeForProject: vi.fn().mockReturnValue(of(undefined)),
      removeException: vi.fn().mockReturnValue(of(undefined)),
    };
    projectsServiceMock = {
      getProjects: vi.fn().mockReturnValue(of(pagedProjects([makeProject()]))),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
  });

  it('exibe "Vazio." quando o carrinho não possui itens', async () => {
    await setup();

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Vazio.');
  });

  it('exibe os itens do carrinho com nome, unidade e quantidade', async () => {
    await setup();
    cartService.items.set([makeCartItem(), makeCartItem({ materialId: 'mat2', materialName: 'Luvas', unit: 'Piece', quantity: 1 })]);
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Álcool 70%');
    expect(compiled.textContent).toContain('Luvas');
    expect(compiled.textContent).not.toContain('Vazio.');
  });

  describe('botões de ação', () => {
    it('exibe "Confirmar Baixa" quando o usuário possui Inventory.Stock.Manage', async () => {
      await setup();
      cartService.items.set([makeCartItem()]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Confirmar Baixa');
    });

    it('oculta "Confirmar Baixa" quando o usuário não possui Inventory.Stock.Manage', async () => {
      authServiceMock.hasPermission.mockImplementation((p: string) => p !== 'Inventory.Stock.Manage');
      await setup();
      cartService.items.set([makeCartItem()]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Confirmar Baixa');
    });

    it('exibe "Salvar como Kit" quando o usuário possui Inventory.Kits.Manage', async () => {
      await setup();
      cartService.items.set([makeCartItem()]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Salvar como Kit');
    });
  });

  describe('increment / decrement / remove', () => {
    it('increment aumenta a quantidade respeitando o estoque', async () => {
      await setup();
      cartService.items.set([makeCartItem({ quantity: 1, maxQuantity: 2 })]);

      (component as any).increment('mat1');

      expect(cartService.items()[0].quantity).toBe(2);
    });

    it('decrement não reduz abaixo de 1', async () => {
      await setup();
      cartService.items.set([makeCartItem({ quantity: 1 })]);

      (component as any).decrement('mat1');

      expect(cartService.items()[0].quantity).toBe(1);
    });

    it('remove retira o item do carrinho', async () => {
      await setup();
      cartService.items.set([makeCartItem({ materialId: 'mat1' }), makeCartItem({ materialId: 'mat2' })]);

      (component as any).remove('mat1');

      expect(cartService.items().map(i => i.materialId)).toEqual(['mat2']);
    });
  });

  describe('confirmWriteOff', () => {
    it('confirma a baixa de todos os itens, esvazia o carrinho e fecha o dialog', async () => {
      await setup();
      cartService.items.set([makeCartItem({ materialId: 'mat1', quantity: 2 }), makeCartItem({ materialId: 'mat2', materialName: 'Luvas', quantity: 1 })]);
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).openConfirmDialog();
      (component as any).confirmForm.patchValue({ projectId: 'proj1' });
      (component as any).confirmWriteOff();

      expect(stockServiceMock.consumeForProject).toHaveBeenCalledWith('mat1', { quantity: 2, projectId: 'proj1' });
      expect(stockServiceMock.consumeForProject).toHaveBeenCalledWith('mat2', { quantity: 1, projectId: 'proj1' });
      expect(cartService.items()).toEqual([]);
      expect((component as any).confirmDialogVisible()).toBe(false);
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('mantém itens com erro no carrinho e exibe toast de erro por item', async () => {
      await setup();
      cartService.items.set([makeCartItem({ materialId: 'mat1', quantity: 2 }), makeCartItem({ materialId: 'mat2', materialName: 'Luvas', quantity: 1 })]);
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      stockServiceMock.consumeForProject.mockImplementation((materialId: string) =>
        materialId === 'mat1'
          ? of(undefined)
          : throwError(() => ({ status: 422, error: { errors: ['Estoque insuficiente para a baixa solicitada.'] } })),
      );

      (component as any).openConfirmDialog();
      (component as any).confirmForm.patchValue({ projectId: 'proj1' });
      (component as any).confirmWriteOff();

      expect(cartService.items().map(i => i.materialId)).toEqual(['mat2']);
      expect((component as any).confirmDialogVisible()).toBe(true);
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Estoque insuficiente para a baixa solicitada.' }),
      );
    });

    it('não confirma quando o projeto não é selecionado', async () => {
      await setup();
      cartService.items.set([makeCartItem()]);

      (component as any).openConfirmDialog();
      (component as any).confirmWriteOff();

      expect(stockServiceMock.consumeForProject).not.toHaveBeenCalled();
      expect((component as any).confirmForm.get('projectId').touched).toBe(true);
    });

    it('não confirma baixa sem projeto quando a justificativa está vazia ou é muito curta', async () => {
      await setup();
      cartService.items.set([makeCartItem()]);

      (component as any).openConfirmDialog();
      (component as any).toggleWithoutProject(true);
      (component as any).confirmWriteOff();

      expect(stockServiceMock.removeException).not.toHaveBeenCalled();
      expect((component as any).confirmForm.get('reason').touched).toBe(true);

      (component as any).confirmForm.patchValue({ reason: 'curta' });
      (component as any).confirmWriteOff();

      expect(stockServiceMock.removeException).not.toHaveBeenCalled();
    });

    it('confirma baixa sem projeto enviando a justificativa como reason', async () => {
      await setup();
      cartService.items.set([makeCartItem({ materialId: 'mat1', quantity: 2 })]);
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).openConfirmDialog();
      (component as any).toggleWithoutProject(true);
      (component as any).confirmForm.patchValue({ reason: 'Material danificado no laboratório' });
      (component as any).confirmWriteOff();

      expect(stockServiceMock.removeException).toHaveBeenCalledWith('mat1', {
        quantity: 2,
        reason: 'Material danificado no laboratório',
      });
      expect(stockServiceMock.consumeForProject).not.toHaveBeenCalled();
      expect(cartService.items()).toEqual([]);
      expect((component as any).confirmDialogVisible()).toBe(false);
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('toggleWithoutProject volta a exigir projeto ao desmarcar a opção', async () => {
      await setup();
      cartService.items.set([makeCartItem()]);

      (component as any).openConfirmDialog();
      (component as any).toggleWithoutProject(true);
      (component as any).toggleWithoutProject(false);
      (component as any).confirmWriteOff();

      expect(stockServiceMock.removeException).not.toHaveBeenCalled();
      expect((component as any).confirmForm.get('projectId').touched).toBe(true);
    });
  });
});
