import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { CreatedResponse, CreateMaterialRequest, Material, UpdateMaterialRequest } from '../../../shared/models/inventory.model';

@Injectable({ providedIn: 'root' })
export class MaterialsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/inventory/materials`;

  getMaterials(params: PagedRequest): Observable<PagedResponse<Material>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    return this.http.get<PagedResponse<Material>>(this.base, { params: httpParams });
  }

  getMaterialById(id: string): Observable<Material> {
    return this.http.get<Material>(`${this.base}/${id}`);
  }

  createMaterial(body: CreateMaterialRequest): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(this.base, body);
  }

  updateMaterial(id: string, body: UpdateMaterialRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }
}
