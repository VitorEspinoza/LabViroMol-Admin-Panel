import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';

import { RolesService } from '../roles.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { CreateRoleRequest, Role } from '../../../../shared/models/role.model';
import {
  PERMISSION_ACTION_LABELS,
  PERMISSION_ACTION_ORDER,
  PERMISSION_MODULE_LABELS,
  PERMISSION_RESOURCE_LABELS,
} from '../../../../shared/utils/permission-labels';

interface PermissionCheckbox {
  value: string;
  action: string;
  label: string;
  index: number;
}

interface PermissionResourceGroup {
  key: string;
  label: string;
  items: PermissionCheckbox[];
  viewIndex: number | null;
  manageIndex: number | null;
}

interface PermissionModuleGroup {
  module: string;
  label: string;
  resources: PermissionResourceGroup[];
}

@Component({
  selector: 'app-role-form',
  imports: [ReactiveFormsModule, Dialog, Button, InputText, Checkbox],
  templateUrl: './role-form.component.html',
})
export class RoleFormComponent {
  readonly visible = model(false);
  readonly role = input<Role | null>(null);
  readonly saved = output<void>();

  private readonly rolesService = inject(RolesService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly loadingPermissions = signal(false);
  protected readonly permissionGroups = signal<PermissionModuleGroup[]>([]);
  protected readonly isEditing = computed(() => this.role() !== null);
  protected readonly dialogHeader = computed(() => (this.isEditing() ? 'Editar Perfil' : 'Novo Perfil'));

  private allPermissions: string[] = [];
  private cascadeSubscriptions = new Subscription();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    permissions: this.fb.array<FormControl<boolean>>([]),
  });

  protected get permissionsArray(): FormArray<FormControl<boolean>> {
    return this.form.controls.permissions;
  }

  protected onDialogShow(): void {
    const role = this.role();
    if (role) {
      this.form.controls.name.setValue(role.name);
      this.form.controls.name.disable();
    } else {
      this.form.controls.name.reset('');
      this.form.controls.name.enable();
    }
    this.loadPermissions();
  }

  private loadPermissions(): void {
    if (this.allPermissions.length > 0) {
      this.resetPermissionValues();
      this.applyRolePermissions();
      return;
    }
    this.loadingPermissions.set(true);
    this.permissionsService.getPermissions().subscribe({
      next: permissions => {
        this.allPermissions = permissions;
        this.permissionGroups.set(this.groupPermissions(permissions));
        this.buildPermissionControls();
        this.setupCascade();
        this.applyRolePermissions();
        this.loadingPermissions.set(false);
      },
      error: () => {
        this.loadingPermissions.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar as permissões.',
        });
      },
    });
  }

  /** Pré-seleciona, no FormArray, as permissões já atribuídas ao perfil em edição. */
  private applyRolePermissions(): void {
    const role = this.role();
    if (!role) return;

    this.permissionsArray.controls.forEach((control, index) => {
      if (role.permissions.includes(this.allPermissions[index])) {
        control.setValue(true);
      }
    });
  }

  /** Cria os controles do FormArray uma única vez, na primeira abertura do diálogo. */
  private buildPermissionControls(): void {
    const array = this.permissionsArray;
    array.clear();
    this.allPermissions.forEach(() => array.push(this.fb.nonNullable.control(false)));
  }

  /**
   * Reseta os valores dos controles existentes para reabrir o diálogo "limpo",
   * sem recriar as instâncias de FormControl (que invalidaria o binding dos
   * checkboxes e a cascata de Gerenciar -> Visualizar).
   */
  private resetPermissionValues(): void {
    this.permissionsArray.controls.forEach(control => {
      control.enable({ emitEvent: false });
      control.setValue(false, { emitEvent: false });
    });
  }

  /** Conecta, uma única vez, a cascata: marcar Gerenciar marca e trava Visualizar. */
  private setupCascade(): void {
    const array = this.permissionsArray;

    this.cascadeSubscriptions.unsubscribe();
    this.cascadeSubscriptions = new Subscription();

    for (const group of this.permissionGroups()) {
      for (const resource of group.resources) {
        if (resource.viewIndex === null || resource.manageIndex === null) continue;

        const viewControl = array.at(resource.viewIndex);
        const manageControl = array.at(resource.manageIndex);

        this.cascadeSubscriptions.add(
          manageControl.valueChanges.subscribe(checked => {
            if (checked) {
              viewControl.setValue(true, { emitEvent: false });
              viewControl.disable({ emitEvent: false });
            } else {
              viewControl.enable({ emitEvent: false });
            }
          }),
        );
      }
    }
  }

  private groupPermissions(permissions: string[]): PermissionModuleGroup[] {
    const moduleMap = new Map<string, Map<string, PermissionCheckbox[]>>();

    permissions.forEach((permission, index) => {
      const [moduleName, resourceName, actionName] = permission.split('.');
      const resourceKey = `${moduleName}.${resourceName}`;

      if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, new Map());
      const resourceMap = moduleMap.get(moduleName)!;
      if (!resourceMap.has(resourceKey)) resourceMap.set(resourceKey, []);
      resourceMap.get(resourceKey)!.push({
        value: permission,
        action: actionName,
        label: PERMISSION_ACTION_LABELS[actionName] ?? actionName ?? permission,
        index,
      });
    });

    return Array.from(moduleMap.entries()).map(([module, resourceMap]) => ({
      module,
      label: PERMISSION_MODULE_LABELS[module] ?? module,
      resources: Array.from(resourceMap.entries()).map(([key, items]) => {
        const sortedItems = [...items].sort(
          (a, b) => PERMISSION_ACTION_ORDER.indexOf(a.action) - PERMISSION_ACTION_ORDER.indexOf(b.action),
        );

        return {
          key,
          label: PERMISSION_RESOURCE_LABELS[key] ?? key.split('.')[1] ?? key,
          items: sortedItems,
          viewIndex: sortedItems.find(item => item.action === 'View')?.index ?? null,
          manageIndex: sortedItems.find(item => item.action === 'Manage')?.index ?? null,
        };
      }),
    }));
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const selectedPermissions = this.allPermissions.filter((_, i) => value.permissions[i]);
    const role = this.role();

    if (role) {
      this.saving.set(true);
      this.rolesService.updateRolePermissions(role.roleId, selectedPermissions).subscribe({
        next: () => {
          this.saving.set(false);
          this.visible.set(false);
          this.saved.emit();
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Permissões do perfil atualizadas com sucesso.',
          });
        },
        error: err => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: err.error?.error ?? 'Erro inesperado.',
          });
        },
      });
      return;
    }

    const body: CreateRoleRequest = {
      name: value.name,
      permissions: selectedPermissions,
    };

    this.saving.set(true);
    this.rolesService.createRole(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Perfil criado com sucesso.',
        });
      },
      error: err => {
        this.saving.set(false);
        if (err.status === 400) this.handleValidationErrors(err.error?.errors ?? {});
        else
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: err.error?.error ?? 'Erro inesperado.',
          });
      },
    });
  }

  protected onCancel(): void {
    this.visible.set(false);
  }

  private handleValidationErrors(errors: Record<string, string[]>): void {
    Object.entries(errors).forEach(([field, msgs]) => {
      this.form.get(field)?.setErrors({ serverError: msgs[0] });
    });
  }
}
