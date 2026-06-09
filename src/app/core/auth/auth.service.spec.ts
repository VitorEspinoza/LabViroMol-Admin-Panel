import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { AuthService } from './auth.service';
import { SessionUser } from './session.model';

const mockUser: SessionUser = {
  userId: 'user-1',
  email: 'ana@lab.com',
  firstName: 'Ana',
  lastName: 'Silva',
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
    it('deve popular o signal currentUser com os dados retornados pelo /me', () => {
      service.loadCurrentUser().subscribe();
      const req = controller.expectOne(r => r.url.includes('/users/me'));
      req.flush(mockUser);
      expect(service.currentUser()).toEqual(mockUser);
    });

    it('deve definir isAuthenticated como true após carregar usuário', () => {
      service.loadCurrentUser().subscribe();
      controller.expectOne(r => r.url.includes('/users/me')).flush(mockUser);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('hasPermission', () => {
    beforeEach(() => {
      service.currentUser.set(mockUser);
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
      service.currentUser.set(mockUser);
      service.logout().subscribe();
      controller.expectOne(r => r.url.includes('/users/logout') && r.method === 'POST').flush(null);
      expect(service.currentUser()).toBeNull();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('clearSession', () => {
    it('deve limpar o signal currentUser', () => {
      service.currentUser.set(mockUser);
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
