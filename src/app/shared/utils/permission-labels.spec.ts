import { describe, expect, it } from 'vitest';

import { translatePermissionLabel } from './permission-labels';

describe('translatePermissionLabel', () => {
  it('traduz permissões de visualização para português', () => {
    expect(translatePermissionLabel('Identity.Users.View')).toBe('Visualizar Usuários');
  });

  it('traduz permissões de gerenciamento para português', () => {
    expect(translatePermissionLabel('Scheduling.Schedules.Manage')).toBe('Gerenciar Agendamentos');
  });

  it('retorna a string original quando o formato é inesperado', () => {
    expect(translatePermissionLabel('PermissaoInvalida')).toBe('PermissaoInvalida');
  });

  it('usa o nome técnico do recurso como fallback quando não há tradução cadastrada', () => {
    expect(translatePermissionLabel('NewModule.NewResource.View')).toBe('Visualizar NewResource');
  });
});
