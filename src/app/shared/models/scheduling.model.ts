export type ScheduleStatus = 'PENDING' | 'SCHEDULED' | 'REFUSED' | 'CANCELED';

export interface SchedulerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface SchedulingInfo {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
}

export interface ScheduleEquipment {
  equipmentId: string;
  equipmentName: string;
}

export interface Schedule {
  scheduleId: string;
  scheduler: SchedulerInfo;
  scheduling: SchedulingInfo;
  acceptTerm: boolean;
  advisorProfessor: string;
  projectTitle: string;
  description: string | null;
  equipments: ScheduleEquipment[];
  status: ScheduleStatus;
  termUrl: string | null; // relativo: "/images/schedule-terms/{filename}"
  createdAt: string;
}

export interface CreateScheduleRequest {
  scheduler: SchedulerInfo;
  scheduling: SchedulingInfo;
  acceptTerm: boolean;
  advisorProfessor: string;
  projectTitle: string;
  description?: string;
  equipments: { equipmentId: string; equipmentName: string }[];
}

export interface RefuseScheduleRequest {
  justification: string;
}
