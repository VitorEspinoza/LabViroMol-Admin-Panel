import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { Researcher } from '../../../shared/models/research.model';

@Injectable({ providedIn: 'root' })
export class ResearchersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/research/researchers`;

  getResearchers(params: PagedRequest): Observable<PagedResponse<Researcher>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<PagedResponse<Researcher>>(this.base, { params: httpParams });
  }
}
