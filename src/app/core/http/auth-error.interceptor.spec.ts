import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { authErrorInterceptor } from './auth-error.interceptor';

describe('authErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let authMock: Mocked<Pick<AuthService, 'refresh' | 'clearSession'>> & { isAuthenticated: ReturnType<typeof vi.fn> };
  let routerMock: Mocked<Pick<Router, 'navigate'>>;

  beforeEach(() => {
    authMock = { refresh: vi.fn(), clearSession: vi.fn(), isAuthenticated: vi.fn() };
    routerMock = { navigate: vi.fn() };
    authMock.refresh.mockReturnValue(of(undefined));
    authMock.isAuthenticated.mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('deve tentar refresh e retentar a request original em 401', () => {
    let responseData: unknown;
    http.get('/api/recurso').subscribe(data => (responseData = data));

    const firstReq = controller.expectOne('/api/recurso');
    firstReq.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authMock.refresh).toHaveBeenCalledOnce();

    const retryReq = controller.expectOne('/api/recurso');
    expect(retryReq.request.withCredentials).toBe(true);
    retryReq.flush({ data: 'ok' });

    expect(responseData).toEqual({ data: 'ok' });
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('deve redirecionar para /login quando refresh falha após 401', () => {
    authMock.refresh.mockReturnValue(throwError(() => new Error('refresh failed')));

    http.get('/api/recurso').subscribe({ error: () => {} });

    const req = controller.expectOne('/api/recurso');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authMock.refresh).toHaveBeenCalledOnce();
    expect(authMock.clearSession).toHaveBeenCalledOnce();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('não deve tentar refresh quando a URL contém /users/refresh', () => {
    http.post('/api/identity/users/refresh', {}).subscribe({ error: () => {} });

    const req = controller.expectOne('/api/identity/users/refresh');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authMock.refresh).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('deve redirecionar para /unauthorized em 403', () => {
    http.get('/api/admin-recurso').subscribe({ error: () => {} });

    const req = controller.expectOne('/api/admin-recurso');
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/unauthorized']);
    expect(authMock.refresh).not.toHaveBeenCalled();
  });

  it('não deve tentar refresh quando usuário não está autenticado em 401', () => {
    authMock.isAuthenticated.mockReturnValue(false);

    let caughtError: unknown;
    http.get('/api/recurso').subscribe({ error: err => (caughtError = err) });

    const req = controller.expectOne('/api/recurso');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authMock.refresh).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect((caughtError as { status: number }).status).toBe(401);
  });

  it('deve propagar outros erros HTTP sem intervenção', () => {
    let caughtError: unknown;
    http.get('/api/recurso').subscribe({ error: err => (caughtError = err) });

    const req = controller.expectOne('/api/recurso');
    req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });

    expect(authMock.refresh).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect((caughtError as { status: number }).status).toBe(404);
  });
});
