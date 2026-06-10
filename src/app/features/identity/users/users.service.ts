import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { User, CreateUserRequest, CreateUserResponse, UpdateUserRequest } from '../../../shared/models/user.model';

interface ApiUserSummary {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  roles: string[];
}

interface ApiUserProfile {
  id: string;
  userData: {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactNumber: string | null;
  };
  isActive: boolean;
  roles: string[];
}

function mapUserSummary(api: ApiUserSummary): User {
  return {
    userId: api.id,
    fullName: api.fullName,
    email: api.email,
    isActive: api.isActive,
    roles: api.roles,
  };
}

function mapUserProfile(api: ApiUserProfile): User {
  return {
    userId: api.id,
    fullName: `${api.userData.firstName} ${api.userData.lastName}`.trim(),
    firstName: api.userData.firstName,
    lastName: api.userData.lastName,
    // GetById não retorna e-mail; o chamador deve usar o e-mail já carregado na listagem.
    email: '',
    phoneNumber: api.userData.phoneNumber,
    emergencyContactName: api.userData.emergencyContactName,
    emergencyContactNumber: api.userData.emergencyContactNumber,
    roles: api.roles,
    isActive: api.isActive,
  };
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/identity/users`;

  getUsers(params: PagedRequest): Observable<PagedResponse<User>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<PagedResponse<ApiUserSummary>>(this.base, { params: httpParams }).pipe(
      map(res => ({ ...res, data: res.data.map(mapUserSummary) })),
    );
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<ApiUserProfile>(`${this.base}/${id}`).pipe(map(mapUserProfile));
  }

  createUser(body: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(this.base, body);
  }

  updateUser(id: string, body: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  deactivateUser(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/deactivate`, null);
  }

  reactivateUser(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/reactivate`, null);
  }
}
