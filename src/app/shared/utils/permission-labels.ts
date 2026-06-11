/**
 * Tradução de permissões `Module.Resource.Action` (formato técnico do backend) para
 * rótulos amigáveis em português, usados em telas de gerenciamento de perfis/permissões.
 * As strings técnicas continuam sendo usadas internamente no payload enviado ao backend.
 */

export const PERMISSION_MODULE_LABELS: Record<string, string> = {
  Identity: 'Identidade e Acesso',
  Research: 'Pesquisa',
  Inventory: 'Materiais e Estoque',
  Assets: 'Infraestrutura',
  Scheduling: 'Agendamentos',
};

export const PERMISSION_RESOURCE_LABELS: Record<string, string> = {
  'Identity.Users': 'Usuários',
  'Identity.Roles': 'Perfis',
  'Research.Projects': 'Projetos',
  'Research.Researchers': 'Pesquisadores',
  'Research.Publications': 'Publicações',
  'Research.Partners': 'Parceiros',
  'Research.Positions': 'Posições',
  'Inventory.Materials': 'Materiais',
  'Inventory.Stock': 'Estoque',
  'Inventory.Orders': 'Pedidos',
  'Inventory.Kits': 'Kits',
  'Assets.Equipments': 'Equipamentos',
  'Assets.Maintenance': 'Manutenções',
  'Scheduling.Schedules': 'Agendamentos',
};

export const PERMISSION_ACTION_LABELS: Record<string, string> = {
  View: 'Visualizar',
  Manage: 'Gerenciar',
};

/** Ordem padrão de exibição das ações de uma permissão, sempre Visualizar antes de Gerenciar. */
export const PERMISSION_ACTION_ORDER: string[] = ['View', 'Manage'];

/**
 * Converte uma permissão técnica (ex: `Scheduling.Schedules.Manage`) em um rótulo
 * legível em português (ex: `Gerenciar Agendamentos`).
 */
export function translatePermissionLabel(permission: string): string {
  const [moduleName, resourceName, actionName] = permission.split('.');
  if (!moduleName || !resourceName || !actionName) return permission;

  const resourceKey = `${moduleName}.${resourceName}`;
  const action = PERMISSION_ACTION_LABELS[actionName] ?? actionName;
  const resource = PERMISSION_RESOURCE_LABELS[resourceKey] ?? resourceName;

  return `${action} ${resource}`;
}
