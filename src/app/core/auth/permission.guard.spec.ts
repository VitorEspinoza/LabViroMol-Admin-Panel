import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { permissionGuard } from './permission.guard';
import { AuthService } from './auth.service';

describe('permissionGuard', () => {
  let authMock: Mocked<Pick<AuthService, 'hasPermission'>>;
  let routerMock: Mocked<Pick<Router, 'navigate'>>;

  beforeEach(() => {
    authMock = { hasPermission: vi.fn() };
    routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('deve permitir acesso quando usuário tem a permissão', () => {
    authMock.hasPermission.mockReturnValue(true);
    const guard = TestBed.runInInjectionContext(() =>
      permissionGuard('Research.Projects.View'),
    );
    expect(guard({} as any, {} as any)).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('deve bloquear e redirecionar para /unauthorized quando sem permissão', () => {
    authMock.hasPermission.mockReturnValue(false);
    const guard = TestBed.runInInjectionContext(() =>
      permissionGuard('Research.Projects.Manage'),
    );
    expect(guard({} as any, {} as any)).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/unauthorized']);
  });

  it('deve passar a permissão correta para hasPermission', () => {
    authMock.hasPermission.mockReturnValue(true);
    const guard = TestBed.runInInjectionContext(() =>
      permissionGuard('Inventory.Materials.Manage'),
    );
    guard({} as any, {} as any);
    expect(authMock.hasPermission).toHaveBeenCalledWith('Inventory.Materials.Manage');
  });
});
