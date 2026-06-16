import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { AddStockEntryRequest, CreatedResponse, CreateMaterialRequest, Material, MaterialUnit, UpdateMaterialRequest } from '../../../shared/models/inventory.model';

// Shape retornado pela API (GET /api/inventory/materials e /materials/{id})
interface MaterialApiResponse {
  id: string;
  name: string;
  materialType: string;
  minStock: number;
  stockQuantity: number;
  unit: MaterialUnit;
  location: string;
}

function toMaterial(raw: MaterialApiResponse): Material {
  return {
    materialId: raw.id,
    name: raw.name,
    location: raw.location,
    stockQuantity: raw.stockQuantity,
    minStock: raw.minStock,
    unit: raw.unit,
    typeName: raw.materialType,
    isLowStock: raw.stockQuantity <= raw.minStock,
  };
}

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
    return this.http
      .get<PagedResponse<MaterialApiResponse>>(this.base, { params: httpParams })
      .pipe(map(res => ({ ...res, data: res.data.map(toMaterial) })));
  }

  getMaterialById(id: string): Observable<Material> {
    return this.http.get<MaterialApiResponse>(`${this.base}/${id}`).pipe(map(toMaterial));
  }

  createMaterial(body: CreateMaterialRequest): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(this.base, body);
  }

  updateMaterial(id: string, body: UpdateMaterialRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  addStockEntry(materialId: string, body: AddStockEntryRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${materialId}/add-stock`, body);
  }
}
