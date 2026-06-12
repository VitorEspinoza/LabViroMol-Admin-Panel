import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { CreatedResponse, CreateKitRequest, Kit, UpdateKitRequest } from '../../../shared/models/inventory.model';

@Injectable({ providedIn: 'root' })
export class KitsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/inventory/kits`;

  getKits(params: PagedRequest): Observable<PagedResponse<Kit>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<PagedResponse<Kit>>(this.base, { params: httpParams });
  }

  getKitById(id: string): Observable<Kit> {
    return this.http.get<Kit>(`${this.base}/${id}`);
  }

  createKit(body: CreateKitRequest): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(this.base, body);
  }

  updateKit(id: string, body: UpdateKitRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }
}
