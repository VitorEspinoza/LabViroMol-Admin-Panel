import { ProjectRole, ProjectStatus } from '../models/research.model';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  Planned: 'Planejado',
  InProgress: 'Em andamento',
  Completed: 'Concluído',
  Canceled: 'Cancelado',
};

export const PROJECT_STATUS_SEVERITIES: Record<ProjectStatus, 'info' | 'warn' | 'success' | 'danger'> = {
  Planned: 'info',
  InProgress: 'warn',
  Completed: 'success',
  Canceled: 'danger',
};

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  ResearchLead: 'Líder de Pesquisa',
  Manager: 'Gestor',
  Collaborator: 'Colaborador',
};

export const PROJECT_ROLE_OPTIONS: { label: string; value: ProjectRole }[] = (
  Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[]
).map(value => ({ label: PROJECT_ROLE_LABELS[value], value }));
