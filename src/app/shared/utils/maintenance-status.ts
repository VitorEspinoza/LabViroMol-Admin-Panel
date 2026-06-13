import { MaintenanceStatus } from '../models/assets.model';

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  Requested: 'Solicitada',
  InProgress: 'Em Andamento',
  Done: 'Concluída',
  Cancelled: 'Cancelada',
};

export const MAINTENANCE_STATUS_SEVERITIES: Record<MaintenanceStatus, 'secondary' | 'info' | 'success' | 'danger'> = {
  Requested: 'secondary',
  InProgress: 'info',
  Done: 'success',
  Cancelled: 'danger',
};
