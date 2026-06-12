import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrdersService } from './orders.service';
import {
  CreateOrderRequest,
  Order,
  ProcessOrderRequest,
  ReceiveOrderRequest,
  UpdateOrderRequest,
} from '../../../shared/models/inventory.model';

const mockOrder: Order = {
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
};

// Shape retornado pela API (camelCase de OrderSummaryViewModel)
const mockOrderSummaryApiResponse = {
  id: 'ord1',
  materialId: 'mat1',
  projectId: 'proj1',
  projectName: 'Estudo de Variantes Virais',
  materialName: 'Álcool 70%',
  materialUnit: 'Milliliter',
  quantityRequested: 100,
  quantityReceived: null,
  status: 'Pending',
  createdBy: 'Mock User',
  createdOn: '2024-01-01T00:00:00Z',
};

describe('OrdersService', () => {
  let service: OrdersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrdersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getOrders — mapeia PagedResponse corretamente', () => {
    const response = {
      data: [mockOrderSummaryApiResponse],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getOrders({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].orderId).toBe('ord1');
      expect(res.data[0].materialId).toBe('mat1');
      expect(res.data[0].projectId).toBe('proj1');
      expect(res.data[0].projectTitle).toBe('Estudo de Variantes Virais');
      expect(res.data[0].requestedQuantity).toBe(100);
      expect(res.data[0].createdAt).toBe('2024-01-01T00:00:00Z');
      expect(res.data[0].status).toBe('Pending');
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/inventory/orders');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getOrderById — retorna pedido com processing e receipt nulos', () => {
    service.getOrderById('ord1').subscribe(order => {
      expect(order.orderId).toBe('ord1');
      expect(order.processing).toBeNull();
      expect(order.receipt).toBeNull();
    });

    http.expectOne('http://localhost:5085/api/inventory/orders/ord1').flush(mockOrder);
  });

  it('getOrderById — propaga erro 404 (não encontrado)', () => {
    let caught = false;

    service.getOrderById('inexistente').subscribe({
      error: err => {
        expect(err.status).toBe(404);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/orders/inexistente').flush(
      { errors: ['Pedido não encontrado.'] },
      { status: 404, statusText: 'Not Found' },
    );
    expect(caught).toBe(true);
  });

  it('createOrder — envia POST com corpo correto', () => {
    const body: CreateOrderRequest = {
      materialId: 'mat1',
      projectId: 'proj1',
      quantity: 100,
      description: 'Reposição para experimento',
    };

    let response: { id: string } | undefined;
    service.createOrder(body).subscribe(res => (response = res));

    const req = http.expectOne('http://localhost:5085/api/inventory/orders');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'ord-novo' });

    expect(response).toEqual({ id: 'ord-novo' });
  });

  it('createOrder — propaga erro 422 (material ou projeto inválido)', () => {
    const body: CreateOrderRequest = {
      materialId: 'inexistente',
      projectId: 'proj1',
      quantity: 100,
      description: 'Reposição para experimento',
    };
    let caught = false;

    service.createOrder(body).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/orders').flush(
      { errors: ['Material informado não existe.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });

  it('updateOrder — envia PUT /fix-details com corpo correto', () => {
    const body: UpdateOrderRequest = { newProjectId: 'proj2', newQuantity: 150, description: 'Quantidade revisada' };

    service.updateOrder('ord1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/orders/ord1/fix-details');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('updateOrder — propaga erro 409 (pedido não está mais Pending)', () => {
    const body: UpdateOrderRequest = { newProjectId: 'proj2', newQuantity: 150, description: 'Quantidade revisada' };
    let caught = false;

    service.updateOrder('ord1', body).subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/orders/ord1/fix-details').flush(
      { errors: ['Apenas pedidos pendentes podem ser corrigidos.'] },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });

  it('processOrder — envia POST /process com corpo correto', () => {
    const body: ProcessOrderRequest = { notes: 'Em separação' };

    service.processOrder('ord1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/orders/ord1/process');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('receiveOrder — envia POST /receive com corpo correto', () => {
    const body: ReceiveOrderRequest = { quantityReceived: 95, notes: 'Recebido parcialmente' };

    service.receiveOrder('ord1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/orders/ord1/receive');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('receiveOrder — propaga erro 422 (pedido não está em processamento)', () => {
    const body: ReceiveOrderRequest = { quantityReceived: 95, notes: null };
    let caught = false;

    service.receiveOrder('ord1', body).subscribe({
      error: err => {
        expect(err.status).toBe(422);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/orders/ord1/receive').flush(
      { errors: ['Apenas pedidos em processamento podem ser recebidos.'] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(caught).toBe(true);
  });

  it('cancelOrder — envia POST /cancel', () => {
    service.cancelOrder('ord1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/inventory/orders/ord1/cancel');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('cancelOrder — propaga erro 409 (pedido já concluído)', () => {
    let caught = false;

    service.cancelOrder('ord1').subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/inventory/orders/ord1/cancel').flush(
      { errors: ['Pedido já foi concluído e não pode ser cancelado.'] },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });
});
