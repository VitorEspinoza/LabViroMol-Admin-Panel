import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { RoleFormComponent } from './role-form.component';
import { RolesService } from '../roles.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { Role } from '../../../../shared/models/role.model';

const makeRole = (overrides: Partial<Role> = {}): Role => ({
  roleId: 'r1',
  name: 'Coordenador',
  permissions: [],
  ...overrides,
});

// "Identity.Users" propositalmente retorna Manage antes de View, simulando a ordem
// inconsistente do backend e validando que a tela sempre exibe Visualizar primeiro.
const mockPermissions = [
  'Identity.Users.Manage',
  'Identity.Users.View',
  'Identity.Roles.View',
  'Identity.Roles.Manage',
  'Research.Projects.View',
  'Research.Projects.Manage',
];

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('RoleFormComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<RoleFormComponent>;
  let component: RoleFormComponent;
  let rolesServiceMock: Mocked<Pick<RolesService, 'createRole' | 'updateRolePermissions'>>;
  let permissionsServiceMock: Mocked<Pick<PermissionsService, 'getPermissions'>>;
  let messageServiceMock: Mocked<Pick<MessageService, 'add'>>;

  beforeEach(async () => {
    rolesServiceMock = { createRole: vi.fn(), updateRolePermissions: vi.fn() };
    permissionsServiceMock = { getPermissions: vi.fn().mockReturnValue(of(mockPermissions)) };
    messageServiceMock = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RoleFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: PermissionsService, useValue: permissionsServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('onDialogShow', () => {
    it('carrega as permissões do PermissionsService', () => {
      (component as any).onDialogShow();

      expect(permissionsServiceMock.getPermissions).toHaveBeenCalled();
    });

    it('agrupa as permissões por módulo', () => {
      (component as any).onDialogShow();

      const groups = (component as any).permissionGroups();
      const moduleNames = groups.map((g: any) => g.module);
      expect(moduleNames).toEqual(expect.arrayContaining(['Identity', 'Research']));
    });

    it('agrupa as permissões de um módulo por recurso (Module.Resource)', () => {
      (component as any).onDialogShow();

      const groups = (component as any).permissionGroups();
      const identityGroup = groups.find((g: any) => g.module === 'Identity');
      const resourceKeys = identityGroup.resources.map((r: any) => r.key);
      expect(resourceKeys).toEqual(expect.arrayContaining(['Identity.Users', 'Identity.Roles']));
    });

    it('cria um FormArray com um controle por permissão recebida', () => {
      (component as any).onDialogShow();

      expect((component as any).permissionsArray.length).toBe(mockPermissions.length);
    });

    it('reseta o formulário ao reabrir o diálogo', () => {
      const form = (component as any).form;
      form.patchValue({ name: 'Antigo' });

      (component as any).onDialogShow();

      expect(form.get('name').value).toBe('');
    });
  });

  describe('rótulos e ordenação em português', () => {
    beforeEach(() => {
      (component as any).onDialogShow();
    });

    it('traduz nomes de módulos e recursos para português', () => {
      const groups = (component as any).permissionGroups();
      const identityGroup = groups.find((g: any) => g.module === 'Identity');
      const researchGroup = groups.find((g: any) => g.module === 'Research');

      expect(identityGroup.label).toBe('Identidade e Acesso');
      expect(researchGroup.label).toBe('Pesquisa');

      const usersResource = identityGroup.resources.find((r: any) => r.key === 'Identity.Users');
      const rolesResource = identityGroup.resources.find((r: any) => r.key === 'Identity.Roles');
      expect(usersResource.label).toBe('Usuários');
      expect(rolesResource.label).toBe('Perfis');
    });

    it('sempre exibe Visualizar antes de Gerenciar, mesmo quando o backend retorna a ordem invertida', () => {
      const groups = (component as any).permissionGroups();
      const identityGroup = groups.find((g: any) => g.module === 'Identity');
      const usersResource = identityGroup.resources.find((r: any) => r.key === 'Identity.Users');
      const rolesResource = identityGroup.resources.find((r: any) => r.key === 'Identity.Roles');

      expect(usersResource.items.map((i: any) => i.action)).toEqual(['View', 'Manage']);
      expect(usersResource.items.map((i: any) => i.label)).toEqual(['Visualizar', 'Gerenciar']);
      expect(rolesResource.items.map((i: any) => i.action)).toEqual(['View', 'Manage']);
    });
  });

  describe('seleção de permissões', () => {
    beforeEach(() => {
      (component as any).onDialogShow();
    });

    it('reflete a seleção de checkboxes no FormArray', () => {
      const array = (component as any).permissionsArray;

      array.at(2).setValue(true);

      expect(array.at(2).value).toBe(true);
      expect(array.at(3).value).toBe(false);
    });
  });

  describe('cascata Gerenciar -> Visualizar', () => {
    beforeEach(() => {
      (component as any).onDialogShow();
    });

    const findUsersResource = () => {
      const groups = (component as any).permissionGroups();
      return groups.find((g: any) => g.module === 'Identity').resources.find((r: any) => r.key === 'Identity.Users');
    };

    it('marcar Gerenciar marca e desabilita Visualizar automaticamente', () => {
      const array = (component as any).permissionsArray;
      const { viewIndex, manageIndex } = findUsersResource();

      array.at(manageIndex).setValue(true);

      expect(array.at(viewIndex).value).toBe(true);
      expect(array.at(viewIndex).disabled).toBe(true);
    });

    it('desmarcar Gerenciar reabilita Visualizar mantendo o valor marcado', () => {
      const array = (component as any).permissionsArray;
      const { viewIndex, manageIndex } = findUsersResource();

      array.at(manageIndex).setValue(true);
      array.at(manageIndex).setValue(false);

      expect(array.at(viewIndex).disabled).toBe(false);
      expect(array.at(viewIndex).value).toBe(true);
    });

    it('mantém as instâncias de FormControl e a cascata ao reabrir o diálogo novamente', () => {
      const array = (component as any).permissionsArray;
      const { viewIndex, manageIndex } = findUsersResource();
      const manageControlBeforeReopen = array.at(manageIndex);
      const viewControlBeforeReopen = array.at(viewIndex);

      array.at(manageIndex).setValue(true);
      expect(array.at(viewIndex).value).toBe(true);

      (component as any).onDialogShow();

      expect(array.at(manageIndex)).toBe(manageControlBeforeReopen);
      expect(array.at(viewIndex)).toBe(viewControlBeforeReopen);
      expect(array.at(manageIndex).value).toBe(false);
      expect(array.at(viewIndex).value).toBe(false);
      expect(array.at(viewIndex).disabled).toBe(false);

      array.at(manageIndex).setValue(true);

      expect(array.at(viewIndex).value).toBe(true);
      expect(array.at(viewIndex).disabled).toBe(true);
    });
  });

  describe('validação', () => {
    beforeEach(() => {
      (component as any).onDialogShow();
    });

    it('não chama createRole quando o nome está vazio', () => {
      (component as any).onSave();

      expect(rolesServiceMock.createRole).not.toHaveBeenCalled();
    });

    it('marca o campo nome como touched ao salvar formulário inválido', () => {
      (component as any).onSave();

      expect((component as any).form.get('name').touched).toBe(true);
    });
  });

  describe('onSave', () => {
    beforeEach(() => {
      (component as any).onDialogShow();
    });

    it('envia apenas as permissões selecionadas, agrupadas em módulos diferentes', () => {
      const created: Role = { roleId: 'r1', name: 'Coordenador', permissions: ['Identity.Roles.View', 'Research.Projects.View'] };
      rolesServiceMock.createRole.mockReturnValue(of(created));

      const form = (component as any).form;
      form.patchValue({ name: 'Coordenador' });

      const array = (component as any).permissionsArray;
      array.at(2).setValue(true); // Identity.Roles.View
      array.at(4).setValue(true); // Research.Projects.View

      (component as any).onSave();

      expect(rolesServiceMock.createRole).toHaveBeenCalledWith({
        name: 'Coordenador',
        permissions: ['Identity.Roles.View', 'Research.Projects.View'],
      });
    });

    it('inclui a permissão de Visualizar implícita ao marcar Gerenciar', () => {
      const created: Role = { roleId: 'r1', name: 'Gestor', permissions: [] };
      rolesServiceMock.createRole.mockReturnValue(of(created));

      const form = (component as any).form;
      form.patchValue({ name: 'Gestor' });

      const array = (component as any).permissionsArray;
      const groups = (component as any).permissionGroups();
      const usersResource = groups.find((g: any) => g.module === 'Identity').resources.find((r: any) => r.key === 'Identity.Users');
      array.at(usersResource.manageIndex).setValue(true);

      (component as any).onSave();

      expect(rolesServiceMock.createRole).toHaveBeenCalledWith({
        name: 'Gestor',
        permissions: expect.arrayContaining(['Identity.Users.Manage', 'Identity.Users.View']),
      });
    });

    it('exibe mensagem de sucesso e fecha o diálogo após criar', () => {
      const created: Role = { roleId: 'r1', name: 'Coordenador', permissions: [] };
      rolesServiceMock.createRole.mockReturnValue(of(created));

      const form = (component as any).form;
      form.patchValue({ name: 'Coordenador' });

      (component as any).onSave();

      expect((component as any).visible()).toBe(false);
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('emite saved após criar com sucesso', () => {
      const created: Role = { roleId: 'r1', name: 'Coordenador', permissions: [] };
      rolesServiceMock.createRole.mockReturnValue(of(created));
      const savedSpy = vi.fn();
      (component as any).saved.subscribe(savedSpy);

      const form = (component as any).form;
      form.patchValue({ name: 'Coordenador' });

      (component as any).onSave();

      expect(savedSpy).toHaveBeenCalled();
    });

    it('trata erro 400 atribuindo serverError ao campo correspondente', () => {
      rolesServiceMock.createRole.mockReturnValue(
        throwError(() => ({ status: 400, error: { errors: { name: ['Nome já está em uso.'] } } })),
      );

      const form = (component as any).form;
      form.patchValue({ name: 'Duplicado' });

      (component as any).onSave();

      expect(form.get('name').errors?.['serverError']).toBe('Nome já está em uso.');
    });

    it('exibe toast de erro genérico para falhas inesperadas', () => {
      rolesServiceMock.createRole.mockReturnValue(
        throwError(() => ({ status: 500, error: { error: 'Erro interno.' } })),
      );

      const form = (component as any).form;
      form.patchValue({ name: 'Coordenador' });

      (component as any).onSave();

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Erro interno.' }),
      );
    });
  });

  describe('onCancel', () => {
    it('fecha o diálogo sem salvar', () => {
      (component as any).visible.set(true);

      (component as any).onCancel();

      expect((component as any).visible()).toBe(false);
      expect(rolesServiceMock.createRole).not.toHaveBeenCalled();
    });
  });

  describe('modo edição', () => {
    const editingRole = makeRole({
      roleId: 'r1',
      name: 'Coordenador',
      permissions: ['Identity.Users.View', 'Identity.Roles.View', 'Identity.Roles.Manage'],
    });

    beforeEach(() => {
      fixture.componentRef.setInput('role', editingRole);
      fixture.detectChanges();
    });

    it('exibe o cabeçalho "Editar Perfil"', () => {
      expect((component as any).dialogHeader()).toBe('Editar Perfil');
    });

    it('preenche e desabilita o campo nome com o nome do perfil', () => {
      (component as any).onDialogShow();

      const nameControl = (component as any).form.controls.name;
      expect(nameControl.value).toBe('Coordenador');
      expect(nameControl.disabled).toBe(true);
    });

    it('pré-seleciona no FormArray as permissões já atribuídas ao perfil', () => {
      (component as any).onDialogShow();

      const array = (component as any).permissionsArray;
      const allPermissions: string[] = (component as any).allPermissions;

      editingRole.permissions.forEach(permission => {
        const index = allPermissions.indexOf(permission);
        expect(array.at(index).value).toBe(true);
      });

      // Identity.Users.Manage não estava atribuída e deve permanecer desmarcada.
      const manageIndex = allPermissions.indexOf('Identity.Users.Manage');
      expect(array.at(manageIndex).value).toBe(false);
    });

    it('aplica a cascata Gerenciar -> Visualizar nas permissões pré-selecionadas', () => {
      (component as any).onDialogShow();

      const array = (component as any).permissionsArray;
      const allPermissions: string[] = (component as any).allPermissions;
      const rolesViewIndex = allPermissions.indexOf('Identity.Roles.View');

      expect(array.at(rolesViewIndex).disabled).toBe(true);
    });

    it('onSave chama updateRolePermissions com as permissões selecionadas', () => {
      rolesServiceMock.updateRolePermissions.mockReturnValue(of(undefined));
      (component as any).onDialogShow();

      (component as any).onSave();

      expect(rolesServiceMock.updateRolePermissions).toHaveBeenCalledWith(
        'r1',
        expect.arrayContaining(['Identity.Users.View', 'Identity.Roles.View', 'Identity.Roles.Manage']),
      );
      expect(rolesServiceMock.createRole).not.toHaveBeenCalled();
    });

    it('onSave exibe sucesso e fecha o diálogo após atualizar permissões', () => {
      rolesServiceMock.updateRolePermissions.mockReturnValue(of(undefined));
      (component as any).onDialogShow();

      (component as any).onSave();

      expect((component as any).visible()).toBe(false);
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('onSave exibe erro genérico quando updateRolePermissions falha', () => {
      rolesServiceMock.updateRolePermissions.mockReturnValue(
        throwError(() => ({ status: 500, error: { error: 'Erro interno.' } })),
      );
      (component as any).onDialogShow();

      (component as any).onSave();

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Erro interno.' }),
      );
    });
  });
});
