import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { RefuseScheduleRequest, Schedule } from '../../../shared/models/scheduling.model';

@Injectable({ providedIn: 'root' })
export class SchedulesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/scheduling/schedules`;

  getSchedules(params: PagedRequest): Observable<PagedResponse<Schedule>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    return this.http.get<PagedResponse<Schedule>>(this.base, { params: httpParams });
  }

  getPendingSchedules(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${this.base}/pending`);
  }

  getScheduleById(id: string): Observable<Schedule> {
    return this.http.get<Schedule>(`${this.base}/${id}`);
  }

  approveSchedule(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/approve`, null);
  }

  refuseSchedule(id: string, body: RefuseScheduleRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/refuse`, body);
  }

  attachTerm(id: string, file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<void>(`${this.base}/${id}/term`, formData);
  }
}
