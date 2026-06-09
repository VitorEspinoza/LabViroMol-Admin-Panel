import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { AuthService } from './auth.service';
import { ApiMeResponse, ApiRoleResponse, SessionUser } from './session.model';

const mockMeResponse: ApiMeResponse = {
  id: 'user-1',
  userData: { firstName: 'Ana', lastName: 'Silva', phoneNumber: null, emergencyContactNumber: null },
  isActive: true,
  roles: ['Admin'],
};

const mockRoles: ApiRoleResponse[] = [
  { id: 'role-1', name: 'Admin', permissions: ['Research.Projects.View', 'Inventory.Materials.Manage'] },
];

const expectedUser: SessionUser = {
  userId: 'user-1',
  firstName: 'Ana',
  lastName: 'Silva',
  email: '',
  permissions: ['Research.Projects.View', 'Inventory.Materials.Manage'],
};

describe('AuthService', () => {
  let service: AuthService;
  let controller: HttpTestingController;
  let routerMock: Mocked<Pick<Router, 'navigate'>>;

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerMock },
      ],
    });
    service = TestBed.inject(AuthService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('loadCurrentUser', () => {
    it('deve popular o signal currentUser com os dados mapeados de /me e /roles', () => {
      service.loadCurrentUser().subscribe();

      controller.expectOne(r => r.url.includes('/users/me')).flush(mockMeResponse);
      controller.expectOne(r => r.url.includes('/roles')).flush(mockRoles);

      expect(service.currentUser()).toEqual(expectedUser);
    });

    it('deve definir isAuthenticated como true após carregar usuário', () => {
      service.loadCurrentUser().subscribe();
      controller.expectOne(r => r.url.includes('/users/me')).flush(mockMeResponse);
      controller.expectOne(r => r.url.includes('/roles')).flush(mockRoles);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('deve popular permissões vazias quando /roles falha', () => {
      service.loadCurrentUser().subscribe();
      controller.expectOne(r => r.url.includes('/users/me')).flush(mockMeResponse);
      controller.expectOne(r => r.url.includes('/roles')).flush('', { status: 403, statusText: 'Forbidden' });

      expect(service.currentUser()?.permissions).toEqual([]);
      expect(service.currentUser()?.firstName).toBe('Ana');
    });
  });

  describe('hasPermission', () => {
    beforeEach(() => {
      service.currentUser.set(expectedUser);
    });

    it('deve retornar true para permissão diretamente atribuída', () => {
      expect(service.hasPermission('Research.Projects.View')).toBe(true);
    });

    it('deve retornar false para permissão não atribuída', () => {
      expect(service.hasPermission('Identity.Users.View')).toBe(false);
    });

    it('deve retornar true para View quando usuário tem Manage do mesmo recurso', () => {
      expect(service.hasPermission('Inventory.Materials.View')).toBe(true);
    });

    it('não deve conceder Manage a quem tem apenas View', () => {
      expect(service.hasPermission('Research.Projects.Manage')).toBe(false);
    });

    it('deve retornar false quando currentUser é null', () => {
      service.currentUser.set(null);
      expect(service.hasPermission('Research.Projects.View')).toBe(false);
    });
  });

  describe('logout', () => {
    it('deve chamar POST /logout, limpar sessão e redirecionar para /login', () => {
      service.currentUser.set(expectedUser);
      service.logout().subscribe();
      controller.expectOne(r => r.url.includes('/users/logout') && r.method === 'POST').flush(null);
      expect(service.currentUser()).toBeNull();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('clearSession', () => {
    it('deve limpar o signal currentUser', () => {
      service.currentUser.set(expectedUser);
      service.clearSession();
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('refresh', () => {
    it('deve chamar POST /refresh', () => {
      service.refresh().subscribe();
      const req = controller.expectOne(r => r.url.includes('/users/refresh') && r.method === 'POST');
      expect(req.request.body).toEqual({});
      req.flush(null);
    });
  });
});
