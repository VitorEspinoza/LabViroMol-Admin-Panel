import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal, WritableSignal } from '@angular/core';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { MyPermissionsComponent } from './my-permissions.component';
import { AuthService } from '../../../auth/auth.service';
import { SessionUser } from '../../../auth/session.model';

const mockUser: SessionUser = {
  userId: 'u1',
  email: 'ana@lab.com',
  firstName: 'Ana',
  lastName: 'Silva',
  permissions: ['Research.Projects.View', 'Inventory.Materials.Manage'],
};

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MyPermissionsComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<MyPermissionsComponent>;
  let component: MyPermissionsComponent;
  let authMock: { currentUser: WritableSignal<SessionUser | null> };

  beforeEach(async () => {
    authMock = { currentUser: signal<SessionUser | null>(mockUser) };

    await TestBed.configureTestingModule({
      imports: [MyPermissionsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('permissionGroups', () => {
    it('agrupa permissões por módulo e recurso', () => {
      const groups = (component as any).permissionGroups();

      expect(groups).toEqual([
        {
          module: 'Research',
          label: 'Pesquisa',
          resources: [
            { key: 'Research.Projects', label: 'Projetos', actions: ['Visualizar'] },
          ],
        },
        {
          module: 'Inventory',
          label: 'Materiais e Estoque',
          resources: [
            { key: 'Inventory.Materials', label: 'Materiais', actions: ['Gerenciar'] },
          ],
        },
      ]);
    });

    it('retorna lista vazia quando não há usuário logado', () => {
      authMock.currentUser.set(null);
      expect((component as any).permissionGroups()).toEqual([]);
    });
  });

  describe('onClose', () => {
    it('fecha o diálogo', () => {
      fixture.componentRef.setInput('visible', true);
      (component as any).onClose();
      expect(component.visible()).toBe(false);
    });
  });
});
