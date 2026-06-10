import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { CreatePositionRequest, Position } from '../../../shared/models/research.model';

@Injectable({ providedIn: 'root' })
export class PositionsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/research/positions`;

  getPositions(params: PagedRequest): Observable<PagedResponse<Position>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<PagedResponse<Position>>(this.base, { params: httpParams });
  }

  createPosition(body: CreatePositionRequest): Observable<void> {
    return this.http.post<void>(this.base, body);
  }

  deletePosition(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
