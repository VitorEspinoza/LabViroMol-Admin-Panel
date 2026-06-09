import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/identity/permissions';

  getPermissions(): Observable<string[]> {
    return this.http.get<string[]>(this.base);
  }
}
