import { Component, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent } from 'primeng/table';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { User } from '../../../shared/models/user.model';
import { Role } from '../../../shared/models/role.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UserFormComponent } from './user-form/user-form.component';
import { DataTableContainerComponent } from '../../../shared/components/data-table-container/data-table-container.component';

@Component({
  selector: 'app-people-list',
  imports: [
    FormsModule,
    TableModule, Button, ToggleSwitch, Tag, Toast, InputText, IconField, InputIcon,
    PageHeaderComponent,
    UserFormComponent,
    DataTableContainerComponent,
  ],
  templateUrl: './people-list.component.html',
  providers: [MessageService],
})
export class PeopleListComponent {
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly messageService = inject(MessageService);
  protected readonly auth = inject(AuthService);

  protected readonly users = signal<User[]>([]);
  protected readonly roles = signal<Role[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly dialogVisible = signal(false);
  protected readonly selectedUser = signal<User | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  private readonly searchSubject = new Subject<string>();
  private rolesLoaded = false;

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadUsers();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadUsers(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);
    this.loading.set(true);
    this.usersService.getUsers({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined }).subscribe({
      next: res => {
        this.users.set(res.data);
        this.totalRecords.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os usuários.',
        });
      },
    });
  }

  private loadRolesIfNeeded(): void {
    if (this.rolesLoaded) return;
    this.rolesLoaded = true;
    this.rolesService.getRoles().subscribe({
      next: roles => this.roles.set(roles),
    });
  }

  protected openCreate(): void {
    this.loadRolesIfNeeded();
    this.selectedUser.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(user: User): void {
    this.loadRolesIfNeeded();
    this.selectedUser.set({ ...user });
    this.dialogVisible.set(true);
  }

  protected onFormSaved(): void {
    this.loadUsers();
  }

  protected toggleActive(user: User): void {
    const wasActive = user.isActive;
    this.users.update(list =>
      list.map(u => (u.userId === user.userId ? { ...u, isActive: !wasActive } : u)),
    );
    const action$ = wasActive
      ? this.usersService.deactivateUser(user.userId)
      : this.usersService.reactivateUser(user.userId);

    action$.subscribe({
      next: () => this.loadUsers(),
      error: () => {
        this.users.update(list =>
          list.map(u => (u.userId === user.userId ? { ...u, isActive: wasActive } : u)),
        );
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: `Não foi possível ${wasActive ? 'desativar' : 'reativar'} o usuário.`,
        });
      },
    });
  }
}
