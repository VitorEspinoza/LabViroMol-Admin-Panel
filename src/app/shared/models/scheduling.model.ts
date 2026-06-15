export type ScheduleStatus = 'PENDING' | 'SCHEDULED' | 'REFUSED' | 'CANCELED';

export interface SchedulerInfo {
  name: string;
  course: string;
  email: string;
}

export interface SchedulingInfo {
  date: string; // "YYYY-MM-DD"
  startDateHour: string; // ISO datetime
  endDateHour: string; // ISO datetime
}

export interface ScheduleEquipment {
  equipmentId: string;
  name: string;
}

export interface Schedule {
  id: string;
  scheduler: SchedulerInfo;
  scheduling: SchedulingInfo;
  projectTitle: string;
  description: string;
  advisorProfessor: string;
  status: ScheduleStatus;
  termUrl: string | null; // relativo: "/images/schedule-terms/{filename}"
  equipments: ScheduleEquipment[];
}

export interface CreateScheduleRequest {
  scheduler: SchedulerInfo;
  scheduling: { date: string; start: string; end: string };
  acceptTerm: boolean;
  advisorProfessor: string;
  projectTitle: string;
  description: string;
  equipments: { equipmentId: string; name: string }[];
}

export interface RefuseScheduleRequest {
  justification: string;
}
