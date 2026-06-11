export interface Role {
  roleId: string;
  name: string;
  permissions: string[];
}

export interface CreateRoleRequest {
  name: string;
  permissions: string[];
}
