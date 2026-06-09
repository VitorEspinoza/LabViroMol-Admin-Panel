import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Role, CreateRoleRequest } from '../../../shared/models/role.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/identity/roles';

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.base);
  }

  createRole(body: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(this.base, body);
  }
}
