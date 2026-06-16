import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { CreateKitRequest, Kit, KitItem, MaterialUnit, UpdateKitRequest } from '../../../shared/models/inventory.model';

// Shape retornado pela API (GET /api/inventory/kits e /kits/{id})
interface KitItemApiResponse {
  materialId: string;
  name: string;
  quantity: number;
  unit: MaterialUnit;
}

interface KitApiResponse {
  id: string;
  name: string;
  description: string | null;
  items: KitItemApiResponse[];
}

function toKitItem(raw: KitItemApiResponse): KitItem {
  return {
    materialId: raw.materialId,
    materialName: raw.name,
    quantity: raw.quantity,
    unit: raw.unit,
  };
}

function toKit(raw: KitApiResponse): Kit {
  return {
    kitId: raw.id,
    name: raw.name,
    description: raw.description,
    materials: raw.items.map(toKitItem),
  };
}

@Injectable({ providedIn: 'root' })
export class KitsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/inventory/kits`;

  getKits(params: PagedRequest): Observable<PagedResponse<Kit>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    return this.http
      .get<PagedResponse<KitApiResponse>>(this.base, { params: httpParams })
      .pipe(map(res => ({ ...res, data: res.data.map(toKit) })));
  }

  getKitById(id: string): Observable<Kit> {
    return this.http.get<KitApiResponse>(`${this.base}/${id}`).pipe(map(toKit));
  }

  createKit(body: CreateKitRequest): Observable<void> {
    return this.http.post<void>(this.base, body);
  }

  updateKit(id: string, body: UpdateKitRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }
}
