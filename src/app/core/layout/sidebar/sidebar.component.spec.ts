import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../auth/auth.service';
import { SessionUser } from '../../auth/session.model';

const allPermissions: string[] = [
  'Scheduling.Schedules.View',
  'Inventory.Stock.View',
  'Inventory.Materials.View',
  'Inventory.Orders.View',
  'Identity.Users.View',
  'Identity.Roles.View',
  'Research.Positions.View',
  'Research.Partners.View',
  'Research.Projects.View',
  'Assets.Equipments.View',
];

const adminUser: SessionUser = {
  userId: 'u1',
  email: 'admin@lab.com',
  firstName: 'Admin',
  lastName: 'User',
  permissions: allPermissions,
};

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;
  let currentUser: WritableSignal<SessionUser | null>;

  beforeEach(async () => {
    currentUser = signal<SessionUser | null>(adminUser);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { currentUser },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleGroup', () => {
    it('deve expandir um grupo colapsado', () => {
      (component as any).groupOpen.set({
        agendamentos: false,
        materiais: false,
        pesquisa: false,
        infraestrutura: false,
      });

      (component as any).toggleGroup('agendamentos');

      expect((component as any).groupOpen()['agendamentos']).toBe(true);
    });

    it('deve colapsar um grupo expandido', () => {
      (component as any).groupOpen.set({
        agendamentos: true,
        materiais: false,
        pesquisa: false,
        infraestrutura: false,
      });

      (component as any).toggleGroup('agendamentos');

      expect((component as any).groupOpen()['agendamentos']).toBe(false);
    });

    it('deve manter o estado dos outros grupos ao alternar um', () => {
      (component as any).groupOpen.set({
        agendamentos: true,
        materiais: true,
        pesquisa: false,
        infraestrutura: false,
      });

      (component as any).toggleGroup('pesquisa');

      const state = (component as any).groupOpen();
      expect(state['agendamentos']).toBe(true);
      expect(state['materiais']).toBe(true);
      expect(state['pesquisa']).toBe(true);
    });
  });

  describe('visibleGroups (permissões)', () => {
    it('deve exibir todos os grupos quando o usuário tem todas as permissões', () => {
      const groups = (component as any).visibleGroups();
      expect(groups.length).toBe(4);
    });

    it('deve excluir todos os grupos quando o usuário não tem permissão', () => {
      currentUser.set({ ...adminUser, permissions: [] });
      fixture.detectChanges();

      const groups = (component as any).visibleGroups();
      expect(groups.length).toBe(0);
    });

    it('deve exibir apenas o grupo de agendamentos com 2 itens para a permissão de schedules', () => {
      currentUser.set({ ...adminUser, permissions: ['Scheduling.Schedules.View'] });
      fixture.detectChanges();

      const groups = (component as any).visibleGroups() as { key: string; visibleItems: unknown[] }[];

      expect(groups.length).toBe(1);
      expect(groups[0].key).toBe('agendamentos');
      expect(groups[0].visibleItems.length).toBe(2);
    });

    it('deve exibir os itens corretos de Agendamentos (Calendário/Reservas e Solicitações)', () => {
      currentUser.set({ ...adminUser, permissions: ['Scheduling.Schedules.View'] });
      fixture.detectChanges();

      const groups = (component as any).visibleGroups() as { key: string; visibleItems: { label: string }[] }[];
      const labels = groups[0].visibleItems.map(i => i.label);

      expect(labels).toContain('Calendário / Reservas');
      expect(labels).toContain('Solicitações');
    });

    it('deve exibir 4 itens no grupo Materiais com permissões completas', () => {
      const groups = (component as any).visibleGroups() as { key: string; visibleItems: unknown[] }[];
      const materiais = groups.find(g => g.key === 'materiais');
      expect(materiais?.visibleItems.length).toBe(4);
    });

    it('deve exibir label "Estoque" (sem nome técnico interno)', () => {
      const groups = (component as any).visibleGroups() as { key: string; visibleItems: { label: string }[] }[];
      const materiais = groups.find(g => g.key === 'materiais');
      const estoque = materiais?.visibleItems.find(i => i.label.toLowerCase().includes('estoque'));
      expect(estoque?.label).toBe('Estoque');
    });

    it('deve exibir "Tipos de Materiais" no grupo Materiais', () => {
      const groups = (component as any).visibleGroups() as { key: string; visibleItems: { label: string }[] }[];
      const materiais = groups.find(g => g.key === 'materiais');
      const labels = materiais?.visibleItems.map(i => i.label) ?? [];
      expect(labels).toContain('Tipos de Materiais');
    });

    it('deve exibir Pessoas e Perfis no grupo Pesquisa', () => {
      const groups = (component as any).visibleGroups() as { key: string; visibleItems: { label: string }[] }[];
      const pesquisa = groups.find(g => g.key === 'pesquisa');
      const labels = pesquisa?.visibleItems.map(i => i.label) ?? [];
      expect(labels).toContain('Pessoas');
      expect(labels).toContain('Perfis');
    });

    it('deve exibir apenas Equipamentos no grupo Infraestrutura', () => {
      const groups = (component as any).visibleGroups() as { key: string; visibleItems: { label: string }[] }[];
      const infra = groups.find(g => g.key === 'infraestrutura');
      expect(infra?.visibleItems.length).toBe(1);
      expect(infra?.visibleItems[0].label).toBe('Equipamentos');
    });

    it('deve conceder acesso a Materiais e Tipos de Materiais quando usuário tem Inventory.Materials.Manage', () => {
      currentUser.set({ ...adminUser, permissions: ['Inventory.Materials.Manage'] });
      fixture.detectChanges();

      const groups = (component as any).visibleGroups() as { key: string; visibleItems: { label: string }[] }[];
      const materiais = groups.find(g => g.key === 'materiais');

      expect(materiais).toBeDefined();
      const visibleLabels = materiais!.visibleItems.map(i => i.label);
      expect(visibleLabels).toContain('Materiais');
      expect(visibleLabels).toContain('Tipos de Materiais');
      expect(visibleLabels).not.toContain('Estoque');
    });
  });

  describe('toggleGroup (collapsed)', () => {
    it('deve emitir toggleCollapse e abrir o grupo ao clicar com sidebar colapsada', () => {
      fixture.componentRef.setInput('collapsed', true);
      fixture.detectChanges();

      const collapseSpy = vi.fn();
      component.toggleCollapse.subscribe(collapseSpy);

      (component as any).toggleGroup('agendamentos');

      expect(collapseSpy).toHaveBeenCalledTimes(1);
      expect((component as any).groupOpen()['agendamentos']).toBe(true);
    });

    it('deve alternar grupo normalmente quando sidebar não está colapsada', () => {
      fixture.componentRef.setInput('collapsed', false);
      fixture.detectChanges();

      (component as any).groupOpen.set({ agendamentos: false, materiais: false, pesquisa: false, infraestrutura: false });
      (component as any).toggleGroup('agendamentos');

      expect((component as any).groupOpen()['agendamentos']).toBe(true);
    });
  });
});
