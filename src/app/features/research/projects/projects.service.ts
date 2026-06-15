import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import {
  AddProjectMemberRequest,
  ChangeMemberRoleRequest,
  CreatedResponse,
  CreateProjectRequest,
  Project,
  ProjectSummary,
  ResearcherIdRequest,
  TransferLeadershipRequest,
  UpdateProjectRequest,
} from '../../../shared/models/research.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/research/projects`;

  getProjects(params: PagedRequest): Observable<PagedResponse<ProjectSummary>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    return this.http.get<PagedResponse<ProjectSummary>>(this.base, { params: httpParams });
  }

  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.base}/${id}`);
  }

  createProject(body: CreateProjectRequest): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(this.base, body);
  }

  updateProject(id: string, body: UpdateProjectRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  startProject(id: string, researcherId: string): Observable<void> {
    const body: ResearcherIdRequest = { researcherId };
    return this.http.post<void>(`${this.base}/${id}/start`, body);
  }

  completeProject(id: string, researcherId: string): Observable<void> {
    const body: ResearcherIdRequest = { researcherId };
    return this.http.post<void>(`${this.base}/${id}/complete`, body);
  }

  cancelProject(id: string, researcherId: string): Observable<void> {
    const body: ResearcherIdRequest = { researcherId };
    return this.http.post<void>(`${this.base}/${id}/cancel`, body);
  }

  addMember(id: string, body: AddProjectMemberRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/members`, body);
  }

  changeMemberRole(projectId: string, researcherId: string, body: ChangeMemberRoleRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${projectId}/members/${researcherId}/role`, body);
  }

  removeMember(projectId: string, researcherId: string, requestedById: string): Observable<void> {
    const params = new HttpParams().set('requestedById', requestedById);
    return this.http.delete<void>(`${this.base}/${projectId}/members/${researcherId}`, { params });
  }

  transferLeadership(id: string, body: TransferLeadershipRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/transfer-leadership`, body);
  }
}
