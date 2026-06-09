import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMeResponse, ApiRoleResponse, SessionUser } from './session.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly usersBase = `${environment.apiUrl}/api/identity/users`;
  private readonly rolesBase = `${environment.apiUrl}/api/identity/roles`;

  readonly currentUser = signal<SessionUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  private readonly permissionsSet = computed(
    () => new Set(this.currentUser()?.permissions ?? []),
  );

  hasPermission(permission: string): boolean {
    const parts = permission.split('.');
    if (parts.length === 3 && parts[2] === 'View') {
      const manageKey = `${parts[0]}.${parts[1]}.Manage`;
      if (this.permissionsSet().has(manageKey)) return true;
    }
    return this.permissionsSet().has(permission);
  }

  loadCurrentUser(): Observable<void> {
    return this.http.get<ApiMeResponse>(`${this.usersBase}/me`).pipe(
      switchMap(me =>
        this.http.get<ApiRoleResponse[]>(this.rolesBase).pipe(
          map(roles => {
            const userRoleSet = new Set(me.roles);
            const permissions = [
              ...new Set(
                roles
                  .filter(r => userRoleSet.has(r.name))
                  .flatMap(r => r.permissions),
              ),
            ];
            return this.mapSessionUser(me, permissions);
          }),
          catchError(() => of(this.mapSessionUser(me, []))),
        ),
      ),
      tap(user => this.currentUser.set(user)),
      map(() => undefined),
    );
  }

  login(email: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.usersBase}/login`, { email, password }).pipe(
      switchMap(() => this.loadCurrentUser()),
      tap(() => this.router.navigate(['/dashboard'])),
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.usersBase}/forgot-password`, { email });
  }

  resetPassword(email: string, token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.usersBase}/reset-password`, { email, token, newPassword });
  }

  refresh(): Observable<void> {
    return this.http.post<void>(`${this.usersBase}/refresh`, {});
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.usersBase}/logout`, {}).pipe(
      tap(() => {
        this.clearSession();
        this.router.navigate(['/login']);
      }),
    );
  }

  clearSession(): void {
    this.currentUser.set(null);
  }

  private mapSessionUser(me: ApiMeResponse, permissions: string[]): SessionUser {
    return {
      userId: me.id,
      firstName: me.userData.firstName,
      lastName: me.userData.lastName,
      email: '',
      permissions,
    };
  }
}
