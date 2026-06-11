import { Component, computed, inject, model } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

import { AuthService } from '../../../auth/auth.service';
import {
  PERMISSION_ACTION_LABELS,
  PERMISSION_MODULE_LABELS,
  PERMISSION_RESOURCE_LABELS,
} from '../../../../shared/utils/permission-labels';

interface PermissionGroup {
  module: string;
  label: string;
  resources: { key: string; label: string; actions: string[] }[];
}

@Component({
  selector: 'app-my-permissions',
  imports: [Dialog, Button, Tag],
  templateUrl: './my-permissions.component.html',
})
export class MyPermissionsComponent {
  readonly visible = model(false);

  private readonly auth = inject(AuthService);

  protected readonly permissionGroups = computed<PermissionGroup[]>(() => {
    const permissions = this.auth.currentUser()?.permissions ?? [];
    const moduleMap = new Map<string, Map<string, string[]>>();

    for (const permission of permissions) {
      const [moduleName, resourceName, actionName] = permission.split('.');
      if (!moduleName || !resourceName || !actionName) continue;

      const resourceKey = `${moduleName}.${resourceName}`;
      if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, new Map());
      const resourceMap = moduleMap.get(moduleName)!;
      if (!resourceMap.has(resourceKey)) resourceMap.set(resourceKey, []);
      resourceMap.get(resourceKey)!.push(PERMISSION_ACTION_LABELS[actionName] ?? actionName);
    }

    return Array.from(moduleMap.entries()).map(([moduleName, resourceMap]) => ({
      module: moduleName,
      label: PERMISSION_MODULE_LABELS[moduleName] ?? moduleName,
      resources: Array.from(resourceMap.entries()).map(([key, actions]) => ({
        key,
        label: PERMISSION_RESOURCE_LABELS[key] ?? key.split('.')[1] ?? key,
        actions,
      })),
    }));
  });

  protected onClose(): void {
    this.visible.set(false);
  }
}
