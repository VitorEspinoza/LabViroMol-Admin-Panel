import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Role, CreateRoleRequest } from '../../../shared/models/role.model';

interface ApiRole {
  id: string;
  name: string;
  permissions: string[];
}

function mapRole(api: ApiRole): Role {
  return { roleId: api.id, name: api.name, permissions: api.permissions };
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/identity/roles`;

  getRoles(): Observable<Role[]> {
    return this.http.get<ApiRole[]>(this.base).pipe(map(roles => roles.map(mapRole)));
  }

  createRole(body: CreateRoleRequest): Observable<Role> {
    return this.http.post<ApiRole>(this.base, body).pipe(map(mapRole));
  }

  updateRolePermissions(roleId: string, permissions: string[]): Observable<void> {
    return this.http.put<void>(`${this.base}/${roleId}/permissions`, { permissions });
  }

  deleteRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${roleId}`);
  }
}
