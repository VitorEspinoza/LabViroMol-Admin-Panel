import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { OrdersListComponent } from './orders-list.component';
import { OrdersService } from './orders.service';
import { MaterialsService } from '../materials/materials.service';
import { ProjectsService } from '../../research/projects/projects.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialogService, ConfirmOptions } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { OrderCreateFormComponent } from './order-create-form/order-create-form.component';
import { OrderReceiveDialogComponent } from './order-receive-dialog/order-receive-dialog.component';
import { Material, Order } from '../../../shared/models/inventory.model';
import { ProjectSummary } from '../../../shared/models/research.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: 'ord1',
  materialId: 'mat1',
  materialName: 'Álcool 70%',
  projectId: 'proj1',
  projectTitle: 'Estudo de Variantes Virais',
  requestedQuantity: 100,
  description: 'Reposição para experimento',
  status: 'Pending',
  processing: null,
  receipt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: null,
  ...overrides,
});

const pagedOrders = (orders: Order[]): PagedResponse<Order> => ({
  data: orders,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: orders.length,
});

const makeMaterial = (overrides: Partial<Material> = {}): Material => ({
  materialId: 'mat1',
  name: 'Álcool 70%',
  location: 'Armário A1',
  stockQuantity: 500,
  minStock: 100,
  unit: 'Milliliter',
  typeId: 'mt1',
  typeName: 'Reagentes',
  isLowStock: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: null,
  ...overrides,
});

const pagedMaterials = (materials: Material[]): PagedResponse<Material> => ({
  data: materials,
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: materials.length,
});

const emptyProjectsResponse: PagedResponse<ProjectSummary> = {
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

describe('OrdersListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<OrdersListComponent>;
  let component: OrdersListComponent;
  let ordersServiceMock: Mocked<Pick<OrdersService, 'getOrders' | 'createOrder' | 'processOrder' | 'receiveOrder' | 'cancelOrder'>>;
  let materialsServiceMock: Mocked<Pick<MaterialsService, 'getMaterials'>>;
  let projectsServiceMock: Mocked<Pick<ProjectsService, 'getProjects'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: OrdersService, useValue: ordersServiceMock },
        { provide: MaterialsService, useValue: materialsServiceMock },
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    ordersServiceMock = {
      getOrders: vi.fn().mockReturnValue(of(pagedOrders([makeOrder()]))),
      createOrder: vi.fn(),
      processOrder: vi.fn(),
      receiveOrder: vi.fn(),
      cancelOrder: vi.fn().mockReturnValue(of(undefined)),
    };
    materialsServiceMock = {
      getMaterials: vi.fn().mockReturnValue(of(pagedMaterials([makeMaterial()]))),
    };
    projectsServiceMock = {
      getProjects: vi.fn().mockReturnValue(of(emptyProjectsResponse)),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
    confirmDialogServiceMock = {
      confirm: vi.fn((options: ConfirmOptions) => options.accept()),
    };
  });

  it('deve criar o componente e carregar os pedidos ao inicializar', async () => {
    await setup();

    expect(ordersServiceMock.getOrders).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10, search: undefined });
    expect((component as any).orders().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  it('exibe quantidade com a unidade do material correspondente', async () => {
    await setup();

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('100 Mililitro');
  });

  describe('botão Novo Pedido', () => {
    it('é exibido quando o usuário possui Inventory.Orders.Manage', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Novo Pedido');
    });

    it('é ocultado quando o usuário não possui Inventory.Orders.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Novo Pedido');
    });
  });

  describe('ações contextuais por status', () => {
    it('exibe apenas "Processar" para pedidos Pending', async () => {
      await setup();
      (component as any).orders.set([makeOrder({ status: 'Pending' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Processar');
      expect(compiled.textContent).not.toContain('Receber');
      expect(compiled.textContent).not.toContain('Cancelar');
    });

    it('exibe "Receber" e "Cancelar" para pedidos Processing', async () => {
      await setup();
      (component as any).orders.set([makeOrder({ status: 'Processing' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Receber');
      expect(compiled.textContent).toContain('Cancelar');
      expect(compiled.textContent).not.toContain('Processar');
    });

    it('não exibe ações para pedidos Completed ou Canceled', async () => {
      await setup();
      (component as any).orders.set([makeOrder({ status: 'Completed' })]);
      fixture.detectChanges();

      let compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Processar');
      expect(compiled.textContent).not.toContain('Receber');
      expect(compiled.textContent).not.toContain('Cancelar');

      (component as any).orders.set([makeOrder({ status: 'Canceled' })]);
      fixture.detectChanges();

      compiled = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Processar');
      expect(compiled.textContent).not.toContain('Receber');
      expect(compiled.textContent).not.toContain('Cancelar');
    });

    it('não exibe nenhuma ação quando o usuário não possui Inventory.Orders.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();
      (component as any).orders.set([makeOrder({ status: 'Pending' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Processar');
    });
  });

  describe('cancelamento de pedido', () => {
    it('abre dialog de confirmação e cancela o pedido ao confirmar', async () => {
      await setup();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');
      ordersServiceMock.getOrders.mockClear();

      (component as any).confirmCancel(makeOrder({ status: 'Processing' }));

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Cancelar Pedido' }),
      );
      expect(ordersServiceMock.cancelOrder).toHaveBeenCalledWith('ord1');
      expect(ordersServiceMock.getOrders).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Pedido cancelado.' }));
    });

    it('exibe toast de erro do servidor quando o cancelamento falha', async () => {
      ordersServiceMock.cancelOrder = vi.fn().mockReturnValue(
        throwError(() => ({ status: 409, error: { errors: ['Pedido já foi concluído e não pode ser cancelado.'] } })),
      );
      await setup();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).confirmCancel(makeOrder({ status: 'Completed' }));

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Pedido já foi concluído e não pode ser cancelado.' }),
      );
    });
  });

  describe('OrderCreateFormComponent', () => {
    it('não cria o pedido quando a descrição está vazia', async () => {
      await setup();
      const createForm = fixture.debugElement.query(By.directive(OrderCreateFormComponent))
        .componentInstance as OrderCreateFormComponent;

      (createForm as any).onDialogShow();
      (createForm as any).form.patchValue({
        materialId: 'mat1',
        projectId: 'proj1',
        quantity: 10,
        description: '',
      });

      (createForm as any).onSave();

      expect(ordersServiceMock.createOrder).not.toHaveBeenCalled();
      expect((createForm as any).form.get('description').touched).toBe(true);
    });

    it('cria o pedido, exibe toast "Pedido registrado." e recarrega a lista', async () => {
      ordersServiceMock.createOrder.mockReturnValue(of({ id: 'ord-novo' }));
      await setup();
      ordersServiceMock.getOrders.mockClear();

      const createForm = fixture.debugElement.query(By.directive(OrderCreateFormComponent))
        .componentInstance as OrderCreateFormComponent;
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (createForm as any).onDialogShow();
      (createForm as any).form.patchValue({
        materialId: 'mat1',
        projectId: 'proj1',
        quantity: 10,
        description: 'Reposição de estoque',
      });

      (createForm as any).onSave();

      expect(ordersServiceMock.createOrder).toHaveBeenCalledWith({
        materialId: 'mat1',
        projectId: 'proj1',
        quantity: 10,
        description: 'Reposição de estoque',
      });
      expect((createForm as any).visible()).toBe(false);
      expect(ordersServiceMock.getOrders).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Pedido registrado.' }));
    });
  });

  describe('OrderReceiveDialogComponent', () => {
    it('pré-preenche a quantidade recebida com a quantidade solicitada', async () => {
      await setup();
      (component as any).selectedOrder.set(makeOrder({ requestedQuantity: 100 }));
      fixture.detectChanges();

      const receiveDialog = fixture.debugElement.query(By.directive(OrderReceiveDialogComponent))
        .componentInstance as OrderReceiveDialogComponent;

      (receiveDialog as any).onDialogShow();

      expect((receiveDialog as any).form.value.quantityReceived).toBe(100);
    });

    it('aceita quantidade recebida diferente da solicitada e envia ao backend', async () => {
      ordersServiceMock.receiveOrder.mockReturnValue(of(undefined));
      await setup();
      (component as any).selectedOrder.set(makeOrder({ orderId: 'ord1', requestedQuantity: 100 }));
      fixture.detectChanges();

      const receiveDialog = fixture.debugElement.query(By.directive(OrderReceiveDialogComponent))
        .componentInstance as OrderReceiveDialogComponent;

      (receiveDialog as any).onDialogShow();
      (receiveDialog as any).form.patchValue({ quantityReceived: 80, notes: 'Entrega parcial' });

      (receiveDialog as any).onReceive();

      expect(ordersServiceMock.receiveOrder).toHaveBeenCalledWith('ord1', {
        quantityReceived: 80,
        notes: 'Entrega parcial',
      });
      expect((receiveDialog as any).visible()).toBe(false);
    });

    it('exibe toast de recebimento com quantidade, unidade e material', async () => {
      await setup();
      ordersServiceMock.getOrders.mockClear();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      (component as any).selectedOrder.set(makeOrder({ materialId: 'mat1', materialName: 'Álcool 70%' }));

      (component as any).onOrderReceived(80);

      expect(ordersServiceMock.getOrders).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          detail: 'Pedido concluído — 80 Mililitro de Álcool 70% adicionados ao estoque.',
        }),
      );
    });
  });
});
