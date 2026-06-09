import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let authMock: Mocked<Pick<AuthService, 'loadCurrentUser'>> & { isAuthenticated: ReturnType<typeof vi.fn> };
  let routerMock: Mocked<Pick<Router, 'navigate'>>;

  beforeEach(() => {
    authMock = { isAuthenticated: vi.fn(), loadCurrentUser: vi.fn() };
    routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('deve permitir acesso quando usuário já está autenticado', () => {
    authMock.isAuthenticated.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
    expect(authMock.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('deve carregar sessão via /me e permitir acesso quando cookie é válido', async () => {
    authMock.isAuthenticated.mockReturnValue(false);
    authMock.loadCurrentUser.mockReturnValue(of(undefined));

    const result$ = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as Observable<boolean>;
    const value = await firstValueFrom(result$);

    expect(value).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('deve redirecionar para /login quando sessão não existe', async () => {
    authMock.isAuthenticated.mockReturnValue(false);
    authMock.loadCurrentUser.mockReturnValue(throwError(() => ({ status: 401 })));

    const result$ = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as Observable<boolean>;
    const value = await firstValueFrom(result$);

    expect(value).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });
});
