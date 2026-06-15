import { ScheduleStatus } from '../models/scheduling.model';

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  PENDING: 'Pendente',
  SCHEDULED: 'Aprovado',
  REFUSED: 'Rejeitado',
  CANCELED: 'Cancelado',
};

export const SCHEDULE_STATUS_SEVERITIES: Record<ScheduleStatus, 'secondary' | 'warn' | 'success' | 'danger'> = {
  PENDING: 'warn',
  SCHEDULED: 'success',
  REFUSED: 'danger',
  CANCELED: 'secondary',
};
