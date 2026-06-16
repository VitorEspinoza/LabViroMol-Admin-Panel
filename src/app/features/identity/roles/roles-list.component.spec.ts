import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError, Subject } from 'rxjs';

import { RolesListComponent } from './roles-list.component';
import { RolesService } from './roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Role } from '../../../shared/models/role.model';

const makeRole = (overrides: Partial<Role> = {}): Role => ({
  roleId: 'r1',
  name: 'Admin',
  permissions: ['Identity.Users.View', 'Identity.Users.Manage'],
  ...overrides,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('RolesListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<RolesListComponent>;
  let component: RolesListComponent;
  let rolesServiceMock: Mocked<Pick<RolesService, 'getRoles' | 'deleteRole'>>;
  let permissionsServiceMock: Mocked<Pick<PermissionsService, 'getPermissions'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [RolesListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: PermissionsService, useValue: permissionsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesListComponent);
    component = fixture.componentInstance;
  };

  beforeEach(() => {
    permissionsServiceMock = { getPermissions: vi.fn().mockReturnValue(of([])) };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
    confirmDialogServiceMock = { confirm: vi.fn() };
  });

  it('deve criar o componente e carregar os perfis ao inicializar', async () => {
    rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([makeRole()])), deleteRole: vi.fn() };
    await setup();
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(rolesServiceMock.getRoles).toHaveBeenCalled();
    expect((component as any).roles().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  it('exibe skeleton de cards enquanto carrega', async () => {
    const subject = new Subject<Role[]>();
    rolesServiceMock = { getRoles: vi.fn().mockReturnValue(subject.asObservable()), deleteRole: vi.fn() };
    await setup();
    fixture.detectChanges();

    expect((component as any).loading()).toBe(true);
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);

    subject.next([makeRole()]);
    subject.complete();
    fixture.detectChanges();

    expect((component as any).loading()).toBe(false);
    expect(compiled.querySelectorAll('p-skeleton').length).toBe(0);
  });

  it('exibe estado vazio quando não há perfis cadastrados', async () => {
    rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([])), deleteRole: vi.fn() };
    await setup();
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Nenhum perfil cadastrado.');
  });

  it('exibe os badges de permissões de cada perfil traduzidos para português', async () => {
    rolesServiceMock = {
      getRoles: vi.fn().mockReturnValue(of([makeRole({ permissions: ['Identity.Users.View', 'Identity.Roles.Manage'] })])),
      deleteRole: vi.fn(),
    };
    await setup();
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Visualizar Usuários');
    expect(compiled.textContent).toContain('Gerenciar Perfis');
    expect(compiled.textContent).not.toContain('Identity.Users.View');
    expect(compiled.textContent).not.toContain('Identity.Roles.Manage');
  });

  it('trata erro ao carregar perfis sem travar o componente', async () => {
    rolesServiceMock = { getRoles: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))), deleteRole: vi.fn() };
    await setup();
    fixture.detectChanges();

    expect((component as any).loading()).toBe(false);
    expect((component as any).roles()).toEqual([]);
  });

  describe('botão Novo Perfil', () => {
    it('é exibido quando o usuário possui Identity.Roles.Manage', async () => {
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([])), deleteRole: vi.fn() };
      authServiceMock.hasPermission.mockReturnValue(true);
      await setup();
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('p-button')).toBeTruthy();
    });

    it('é ocultado quando o usuário não possui Identity.Roles.Manage', async () => {
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([])), deleteRole: vi.fn() };
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('p-button')).toBeFalsy();
    });
  });

  describe('openCreate', () => {
    it('exibe o diálogo de criação de perfil', async () => {
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([])), deleteRole: vi.fn() };
      await setup();
      fixture.detectChanges();

      (component as any).openCreate();

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).selectedRole()).toBeNull();
    });

    it('limpa o perfil selecionado anteriormente', async () => {
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([])), deleteRole: vi.fn() };
      await setup();
      fixture.detectChanges();

      (component as any).openEdit(makeRole());
      (component as any).openCreate();

      expect((component as any).selectedRole()).toBeNull();
    });
  });

  describe('openEdit', () => {
    it('exibe o diálogo com o perfil selecionado', async () => {
      const role = makeRole();
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([role])), deleteRole: vi.fn() };
      await setup();
      fixture.detectChanges();

      (component as any).openEdit(role);

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).selectedRole()).toBe(role);
    });
  });

  describe('botão de editar perfil', () => {
    it('é exibido em cada card quando o usuário possui Identity.Roles.Manage', async () => {
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([makeRole()])), deleteRole: vi.fn() };
      authServiceMock.hasPermission.mockReturnValue(true);
      await setup();
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('p-card .pi-pencil')).toBeTruthy();
    });

    it('é ocultado quando o usuário não possui Identity.Roles.Manage', async () => {
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([makeRole()])), deleteRole: vi.fn() };
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('p-card .pi-pencil')).toBeFalsy();
    });
  });

  describe('onFormSaved', () => {
    it('recarrega a lista de perfis', async () => {
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([makeRole()])), deleteRole: vi.fn() };
      await setup();
      fixture.detectChanges();

      rolesServiceMock.getRoles.mockClear();
      (component as any).onFormSaved();

      expect(rolesServiceMock.getRoles).toHaveBeenCalled();
    });
  });

  describe('confirmDelete', () => {
    it('solicita confirmação antes de excluir', async () => {
      rolesServiceMock = { getRoles: vi.fn().mockReturnValue(of([makeRole()])), deleteRole: vi.fn() };
      await setup();
      fixture.detectChanges();

      (component as any).confirmDelete(makeRole());

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
      const args = confirmDialogServiceMock.confirm.mock.calls[0][0];
      expect(args.header).toBe('Excluir Perfil');
    });

    it('exclui o perfil e recarrega a lista ao confirmar', async () => {
      rolesServiceMock = {
        getRoles: vi.fn().mockReturnValue(of([makeRole()])),
        deleteRole: vi.fn().mockReturnValue(of(undefined)),
      };
      await setup();
      fixture.detectChanges();
      rolesServiceMock.getRoles.mockClear();

      (component as any).confirmDelete(makeRole());
      const args = confirmDialogServiceMock.confirm.mock.calls[0][0];
      args.accept();

      expect(rolesServiceMock.deleteRole).toHaveBeenCalledWith('r1');
      expect(rolesServiceMock.getRoles).toHaveBeenCalled();
    });

    it('trata erro ao excluir perfil', async () => {
      rolesServiceMock = {
        getRoles: vi.fn().mockReturnValue(of([makeRole()])),
        deleteRole: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
      };
      await setup();
      fixture.detectChanges();

      (component as any).confirmDelete(makeRole());
      const args = confirmDialogServiceMock.confirm.mock.calls[0][0];

      expect(() => args.accept()).not.toThrow();
    });
  });
});
