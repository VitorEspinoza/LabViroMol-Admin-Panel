import { ResearchRegistrationData } from '../../shared/models/user.model';

export interface SessionUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  permissions: string[];
}

export interface ApiMeResponse {
  id: string;
  userData: {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactNumber: string | null;
    researchData?: ResearchRegistrationData | null;
  };
  isActive: boolean;
  roles: string[];
}

export interface ApiRoleResponse {
  id: string;
  name: string;
  permissions: string[];
}
