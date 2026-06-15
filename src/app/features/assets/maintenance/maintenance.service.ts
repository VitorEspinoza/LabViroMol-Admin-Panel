import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import {
  CreatedResponse,
  CreateMaintenanceRequest,
  MaintenanceRequest,
} from '../../../shared/models/assets.model';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/assets/maintenance-requests`;

  getMaintenanceRequests(params: PagedRequest): Observable<PagedResponse<MaintenanceRequest>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    return this.http.get<PagedResponse<MaintenanceRequest>>(this.base, { params: httpParams });
  }

  getMaintenanceRequestById(id: string): Observable<MaintenanceRequest> {
    return this.http.get<MaintenanceRequest>(`${this.base}/${id}`);
  }

  createMaintenanceRequest(body: CreateMaintenanceRequest): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(this.base, body);
  }

  startMaintenance(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/start`, null);
  }

  completeMaintenance(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/done`, null);
  }

  cancelMaintenance(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/cancel`, null);
  }
}
