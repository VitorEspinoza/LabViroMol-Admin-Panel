import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-topbar',
  imports: [Button, Menu, Avatar],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  readonly sidebarCollapsed = input<boolean>(false);

  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  private readonly userMenuRef = viewChild.required<Menu>('userMenu');

  protected readonly pageTitle = signal('');

  protected readonly headerClasses = computed(() => {
    const leftClass = this.sidebarCollapsed() ? 'left-16' : 'left-16 md:left-64';
    return `fixed top-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 ${leftClass} md:px-6 z-20 transition-all duration-300 ease-in-out`;
  });

  protected readonly userInitials = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '?';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  });

  protected readonly userFullName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`;
  });

  protected readonly menuItems = computed<MenuItem[]>(() => [
    { label: 'Minha Conta', icon: 'pi pi-user' },
    { label: 'Perfil', icon: 'pi pi-id-card' },
    { separator: true },
    {
      label: 'Sair',
      icon: 'pi pi-sign-out',
      styleClass: 'text-red-500',
      command: () => this.signOut(),
    },
  ]);

  constructor() {
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.pageTitle.set(this.resolvePageTitle()));

    this.pageTitle.set(this.resolvePageTitle());
  }

  protected openUserMenu(event: Event): void {
    this.userMenuRef().toggle(event);
  }

  protected signOut(): void {
    this.auth.logout().subscribe();
  }

  private resolvePageTitle(): string {
    let state = this.router.routerState.snapshot.root;
    while (state.firstChild) state = state.firstChild;
    return (state.data['title'] as string) ?? '';
  }
}
