import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { debounceTime, filter, fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../../environments/environment';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon: string;
  items: NavItem[];
}

interface VisibleNavGroup extends NavGroup {
  visibleItems: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly collapsed = input<boolean>(false);
  readonly toggleCollapse = output<void>();

  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly version = environment.version;

  private readonly hovering = signal(false);
  private readonly windowWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);

  private readonly effectivelyCollapsed = computed(
    () => this.collapsed() && !this.hovering(),
  );

  protected readonly displayCollapsed = computed(
    () => this.effectivelyCollapsed() || (this.windowWidth() < 768 && this.collapsed()),
  );

  protected readonly navClasses = computed(() => {
    const widthClass = this.displayCollapsed() ? 'w-16' : 'w-64';
    return `fixed left-0 top-0 h-screen ${widthClass} bg-sidebar border-r border-sidebar-border flex flex-col z-30 transition-all duration-300 ease-in-out`;
  });

  protected readonly navGroups: NavGroup[] = [
    {
      key: 'agendamentos',
      label: 'Agendamentos',
      icon: 'pi pi-calendar',
      items: [
        { label: 'Calendário / Reservas', icon: 'pi pi-calendar-plus', route: '/scheduling/calendario', permission: 'Scheduling.Schedules.View' },
        { label: 'Solicitações', icon: 'pi pi-list', route: '/scheduling/solicitacoes', permission: 'Scheduling.Schedules.View' },
      ],
    },
    {
      key: 'materiais',
      label: 'Materiais',
      icon: 'pi pi-box',
      items: [
        { label: 'Estoque', icon: 'pi pi-chart-bar', route: '/inventory/estoque', permission: 'Inventory.Stock.View' },
        { label: 'Materiais', icon: 'pi pi-database', route: '/inventory/materiais', permission: 'Inventory.Materials.View' },
        { label: 'Pedidos', icon: 'pi pi-shopping-cart', route: '/inventory/pedidos', permission: 'Inventory.Orders.View' },
        { label: 'Tipos de Materiais', icon: 'pi pi-tags', route: '/inventory/tipos', permission: 'Inventory.Materials.View' },
      ],
    },
    {
      key: 'pesquisa',
      label: 'Pesquisa',
      icon: 'pi pi-graduation-cap',
      items: [
        { label: 'Pessoas', icon: 'pi pi-users', route: '/identity/pessoas', permission: 'Identity.Users.View' },
        { label: 'Perfis', icon: 'pi pi-shield', route: '/identity/perfis', permission: 'Identity.Roles.View' },
        { label: 'Posições no Laboratório', icon: 'pi pi-id-card', route: '/research/posicoes', permission: 'Research.Positions.View' },
        { label: 'Parceiros', icon: 'pi pi-building', route: '/research/parceiros', permission: 'Research.Partners.View' },
        { label: 'Projetos', icon: 'pi pi-folder-open', route: '/research/projetos', permission: 'Research.Projects.View' },
        { label: 'Publicações', icon: 'pi pi-book', route: '/research/publicacoes', permission: 'Research.Publications.View' },
      ],
    },
    {
      key: 'infraestrutura',
      label: 'Infraestrutura',
      icon: 'pi pi-cog',
      items: [
        { label: 'Equipamentos', icon: 'pi pi-desktop', route: '/assets/equipamentos', permission: 'Assets.Equipments.View' },
      ],
    },
  ];

  protected readonly groupOpen = signal<Record<string, boolean>>(
    this.buildInitialGroupState(),
  );

  protected readonly visibleGroups = computed<VisibleNavGroup[]>(() => {
    const permissions = new Set(this.auth.currentUser()?.permissions ?? []);
    const hasPermission = (p: string): boolean => {
      const parts = p.split('.');
      if (parts.length === 3 && parts[2] === 'View') {
        if (permissions.has(`${parts[0]}.${parts[1]}.Manage`)) return true;
      }
      return permissions.has(p);
    };
    return this.navGroups
      .map(group => ({
        ...group,
        visibleItems: group.items.filter(item => hasPermission(item.permission)),
      }))
      .filter(group => group.visibleItems.length > 0);
  });

  constructor() {
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.openActiveGroup());

    if (typeof window !== 'undefined') {
      fromEvent(window, 'resize')
        .pipe(debounceTime(50), takeUntilDestroyed())
        .subscribe(() => this.windowWidth.set(window.innerWidth));
    }
  }

  protected startHover(): void {
    this.hovering.set(true);
  }

  protected endHover(): void {
    this.hovering.set(false);
  }

  protected onToggleCollapseClick(): void {
    this.hovering.set(false);
    this.toggleCollapse.emit();
  }

  protected toggleGroup(key: string): void {
    if (this.displayCollapsed()) {
      this.toggleCollapse.emit();
      this.groupOpen.update(state => ({ ...state, [key]: true }));
      return;
    }
    this.groupOpen.update(state => ({ ...state, [key]: !state[key] }));
  }

  private buildInitialGroupState(): Record<string, boolean> {
    const state: Record<string, boolean> = {
      agendamentos: false,
      materiais: false,
      pesquisa: false,
      infraestrutura: false,
    };
    const activeKey = this.findActiveGroupKey(this.router.url);
    if (activeKey) state[activeKey] = true;
    return state;
  }

  private openActiveGroup(): void {
    const activeKey = this.findActiveGroupKey(this.router.url);
    if (activeKey) {
      this.groupOpen.update(s => ({ ...s, [activeKey]: true }));
    }
  }

  private findActiveGroupKey(url: string): string | null {
    for (const group of this.navGroups) {
      if (group.items.some(item => url.startsWith(item.route))) {
        return group.key;
      }
    }
    return null;
  }
}
