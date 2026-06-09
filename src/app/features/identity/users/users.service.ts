import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PagedRequest, PagedResponse } from '../../../shared/models/pagination.model';
import { User, CreateUserRequest, CreateUserResponse, UpdateUserRequest } from '../../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/identity/users';

  getUsers(params: PagedRequest): Observable<PagedResponse<User>> {
    let httpParams = new HttpParams();
    if (params.pageNumber != null) httpParams = httpParams.set('pageNumber', params.pageNumber);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<PagedResponse<User>>(this.base, { params: httpParams });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
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
