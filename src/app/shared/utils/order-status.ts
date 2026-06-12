import { OrderStatus } from '../models/inventory.model';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: 'Pendente',
  Processing: 'Em Processamento',
  Completed: 'Concluído',
  Canceled: 'Cancelado',
};

export const ORDER_STATUS_SEVERITIES: Record<OrderStatus, 'secondary' | 'info' | 'success' | 'danger'> = {
  Pending: 'secondary',
  Processing: 'info',
  Completed: 'success',
  Canceled: 'danger',
};
