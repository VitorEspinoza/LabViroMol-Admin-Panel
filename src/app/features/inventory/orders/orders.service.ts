import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import {
  CreatedResponse,
  CreateOrderRequest,
  Order,
  OrderStatus,
  ProcessOrderRequest,
  ReceiveOrderRequest,
  UpdateOrderRequest,
} from '../../../shared/models/inventory.model';

// Shape retornado pela API (GET /api/inventory/orders — OrderSummaryViewModel)
interface OrderSummaryApiResponse {
  id: string;
  materialId: string;
  projectId: string;
  projectName: string;
  materialName: string;
  materialUnit: string;
  quantityRequested: number;
  quantityReceived: number | null;
  status: OrderStatus;
  createdBy: string;
  createdOn: string;
}

function toOrder(raw: OrderSummaryApiResponse): Order {
  return {
    orderId: raw.id,
    materialId: raw.materialId,
    materialName: raw.materialName,
    projectId: raw.projectId,
    projectTitle: raw.projectName,
    requestedQuantity: raw.quantityRequested,
    description: null,
    status: raw.status,
    processing: null,
    receipt: null,
    createdAt: raw.createdOn,
    updatedAt: null,
  };
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/inventory/orders`;

  getOrders(params: PagedRequest): Observable<PagedResponse<Order>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    return this.http
      .get<PagedResponse<OrderSummaryApiResponse>>(this.base, { params: httpParams })
      .pipe(map(res => ({ ...res, data: res.data.map(toOrder) })));
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.base}/${id}`);
  }

  createOrder(body: CreateOrderRequest): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(this.base, body);
  }

  // PUT /api/inventory/orders/{id}/fix-details — apenas pedidos com status Pending
  updateOrder(id: string, body: UpdateOrderRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/fix-details`, body);
  }

  processOrder(id: string, body: ProcessOrderRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/process`, body);
  }

  receiveOrder(id: string, body: ReceiveOrderRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/receive`, body);
  }

  cancelOrder(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/cancel`, null);
  }
}
