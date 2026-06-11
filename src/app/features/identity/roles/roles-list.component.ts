import { Component, inject, signal } from '@angular/core';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Skeleton } from 'primeng/skeleton';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { RolesService } from './roles.service';
import { Role } from '../../../shared/models/role.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { translatePermissionLabel } from '../../../shared/utils/permission-labels';
import { RoleFormComponent } from './role-form/role-form.component';

@Component({
  selector: 'app-roles-list',
  imports: [
    Card, Tag, Skeleton, Button, Toast,
    PageHeaderComponent,
    RoleFormComponent,
  ],
  templateUrl: './roles-list.component.html',
  providers: [MessageService],
})
export class RolesListComponent {
  private readonly rolesService = inject(RolesService);
  private readonly messageService = inject(MessageService);
  protected readonly auth = inject(AuthService);

  protected readonly roles = signal<Role[]>([]);
  protected readonly loading = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly selectedRole = signal<Role | null>(null);

  protected readonly skeletonCards = Array.from({ length: 6 });
  protected readonly translatePermissionLabel = translatePermissionLabel;

  constructor() {
    this.loadRoles();
  }

  protected loadRoles(): void {
    this.loading.set(true);
    this.rolesService.getRoles().subscribe({
      next: roles => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os perfis.',
        });
      },
    });
  }

  protected openCreate(): void {
    this.selectedRole.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(role: Role): void {
    this.selectedRole.set(role);
    this.dialogVisible.set(true);
  }

  protected onFormSaved(): void {
    this.loadRoles();
  }
}
