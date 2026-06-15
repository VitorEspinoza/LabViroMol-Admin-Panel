import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { CreatedResponse, CreateMaterialTypeRequest, MaterialType } from '../../../shared/models/inventory.model';

@Injectable({ providedIn: 'root' })
export class MaterialTypesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/inventory/types`;

  getTypes(params: PagedRequest): Observable<PagedResponse<MaterialType>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    return this.http.get<PagedResponse<MaterialType>>(this.base, { params: httpParams });
  }

  createType(body: CreateMaterialTypeRequest): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(this.base, body);
  }

  activateType(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/activate`, null);
  }

  deactivateType(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/deactivate`, null);
  }
}
