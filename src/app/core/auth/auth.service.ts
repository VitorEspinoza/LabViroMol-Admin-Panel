import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionUser } from './session.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/api/identity/users`;

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
    return this.http.get<SessionUser>(`${this.base}/me`).pipe(
      tap(user => this.currentUser.set(user)),
      map(() => undefined),
    );
  }

  login(email: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.base}/login`, { email, password }).pipe(
      switchMap(() => this.loadCurrentUser()),
      tap(() => this.router.navigate(['/dashboard'])),
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/forgot-password`, { email });
  }

  resetPassword(email: string, token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/reset-password`, { email, token, newPassword });
  }

  refresh(): Observable<void> {
    return this.http.post<void>(`${this.base}/refresh`, {});
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, {}).pipe(
      tap(() => {
        this.clearSession();
        this.router.navigate(['/login']);
      }),
    );
  }

  clearSession(): void {
    this.currentUser.set(null);
  }
}
