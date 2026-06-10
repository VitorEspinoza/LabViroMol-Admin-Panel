import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import {
  AddPublicationResearcherRequest,
  AssignDoiRequest,
  CreatePublicationRequest,
  Publication,
  PublicationSummary,
  ReorderPublicationResearchersRequest,
  UpdatePublicationRequest,
} from '../../../shared/models/research.model';

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/research/publications`;

  getPublications(params: PagedRequest): Observable<PagedResponse<PublicationSummary>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<PagedResponse<PublicationSummary>>(this.base, { params: httpParams });
  }

  getPublicationById(id: string): Observable<Publication> {
    return this.http.get<Publication>(`${this.base}/${id}`);
  }

  createPublication(body: CreatePublicationRequest): Observable<void> {
    return this.http.post<void>(this.base, body);
  }

  updatePublication(id: string, body: UpdatePublicationRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  assignDoi(id: string, body: AssignDoiRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/doi`, body);
  }

  addResearcher(id: string, body: AddPublicationResearcherRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/researchers`, body);
  }

  removeResearcher(id: string, researcherId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/researchers/${researcherId}`);
  }

  reorderResearchers(id: string, body: ReorderPublicationResearchersRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/researchers/order`, body);
  }

  deletePublication(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
