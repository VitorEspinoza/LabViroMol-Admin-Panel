import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ConsumeForProjectRequest, RemoveStockRequest, StockExceptionRequest } from '../../../shared/models/inventory.model';

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/inventory/materials`;

  // POST /api/inventory/materials/{id}/add-stock — entrada manual de estoque
  stockException(materialId: string, body: StockExceptionRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${materialId}/add-stock`, body);
  }

  // POST /api/inventory/materials/{id}/write-off (com projectId) — baixa para projeto
  consumeForProject(materialId: string, body: ConsumeForProjectRequest): Observable<void> {
    const payload = { quantity: body.quantity, projectId: body.projectId, reason: body.reason ?? null };
    return this.http.post<void>(`${this.base}/${materialId}/write-off`, payload);
  }

  // POST /api/inventory/materials/{id}/write-off (sem projectId) — remoção com justificativa
  removeException(materialId: string, body: RemoveStockRequest): Observable<void> {
    const payload = { quantity: body.quantity, projectId: null, reason: body.reason };
    return this.http.post<void>(`${this.base}/${materialId}/write-off`, payload);
  }
}
