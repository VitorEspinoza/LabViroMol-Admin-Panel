import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { Partner, PartnerRequest } from '../../../shared/models/research.model';

@Injectable({ providedIn: 'root' })
export class PartnersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/research/partners`;

  getPartners(params: PagedRequest): Observable<PagedResponse<Partner>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<PagedResponse<Partner>>(this.base, { params: httpParams });
  }

  getPartnerById(id: string): Observable<Partner> {
    return this.http.get<Partner>(`${this.base}/${id}`);
  }

  createPartner(body: PartnerRequest): Observable<void> {
    return this.http.post<void>(this.base, body);
  }

  updatePartner(id: string, body: PartnerRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  deletePartner(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
