import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import {
  CreatedResponse,
  CreateEquipmentRequest,
  Equipment,
  UpdateEquipmentRequest,
} from '../../../shared/models/assets.model';

@Injectable({ providedIn: 'root' })
export class EquipmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/assets/equipments`;

  getEquipments(params: PagedRequest): Observable<PagedResponse<Equipment>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    return this.http.get<PagedResponse<Equipment>>(this.base, { params: httpParams });
  }

  getEquipmentById(id: string): Observable<Equipment> {
    return this.http.get<Equipment>(`${this.base}/${id}`);
  }

  createEquipment(body: CreateEquipmentRequest): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(this.base, body);
  }

  updateEquipment(id: string, body: UpdateEquipmentRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  uploadImage(id: string, file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<void>(`${this.base}/${id}/image`, formData);
  }

  deleteEquipment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
