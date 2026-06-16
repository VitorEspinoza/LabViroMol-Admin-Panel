export interface User {
  userId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactNumber?: string | null;
  roles?: string[];
  isActive: boolean;
  researchData?: ResearchRegistrationData | null;
}

export interface ResearchRegistrationData {
  positionId: string;
  degreeLevel: string;
  fieldOfStudy: string;
  lattesUrl?: string | null;
  citationName?: string | null;
  displayName?: string | null;
}

export interface UserInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactNumber: string | null;
  researchData: ResearchRegistrationData | null;
}

export interface CreateUserRequest {
  userData: UserInfo;
  email: string;
  roleIds: string[];
}

export interface CreateUserResponse {
  userId: string;
  resetToken: string;
}

export interface UpdateUserRequest {
  userData: UserInfo;
  roleIds: string[];
}

export interface UpdateProfileResearchData {
  degreeLevel: string;
  fieldOfStudy: string;
  lattesUrl?: string | null;
  citationName?: string | null;
  displayName?: string | null;
}

export interface UpdateProfileUserInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactNumber: string | null;
  researchData: UpdateProfileResearchData | null;
}

export interface UpdateProfileRequest {
  userData: UpdateProfileUserInfo;
}
