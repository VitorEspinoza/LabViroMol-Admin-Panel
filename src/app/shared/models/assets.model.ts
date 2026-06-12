export interface CreatedResponse {
  id: string;
}

// Equipamentos

export interface Equipment {
  equipmentId: string;
  name: string;
  brand: string;
  model: string;
  code: string; // código de patrimônio
  description: string | null;
  imageUrl: string | null; // relativo: "/images/equipments/{filename}"
  location: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateEquipmentRequest {
  name: string;
  brand: string;
  model: string;
  code: string;
  description: string;
}

export interface UpdateEquipmentRequest {
  name: string;
  brand: string;
  model: string;
  code: string;
  description: string;
  location: string | null;
}

// Solicitações de Manutenção

export type MaintenanceStatus = 'Requested' | 'InProgress' | 'Done' | 'Cancelled';

export interface MaintenanceRequest {
  maintenanceRequestId: string;
  equipmentId: string;
  equipmentName: string;
  description: string;
  problemDescription: string;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateMaintenanceRequest {
  equipmentId: string;
  description: string;
  problemDescription: string;
}
