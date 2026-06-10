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
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
}

export interface CreateUserResponse {
  userId: string;
  resetToken: string;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  roleIds: string[];
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
}
