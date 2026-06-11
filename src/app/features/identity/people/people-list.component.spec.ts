import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { PeopleListComponent } from './people-list.component';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { AuthService } from '../../../core/auth/auth.service';
import { User } from '../../../shared/models/user.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const makeUser = (overrides: Partial<User> = {}): User => ({
  userId: 'u1',
  fullName: 'Ana Silva',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@lab.com',
  phoneNumber: null,
  emergencyContactNumber: null,
  isActive: true,
  roles: ['Admin'],
  ...overrides,
});

const pagedResponse = (users: User[]): PagedResponse<User> => ({
  data: users,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: users.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('PeopleListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });
  let fixture: ComponentFixture<PeopleListComponent>;
  let component: PeopleListComponent;
  let usersServiceMock: Mocked<Pick<UsersService, 'getUsers' | 'deactivateUser' | 'reactivateUser'>>;
  let rolesServiceMock: Mocked<Pick<RolesService, 'getRoles'>>;
  let authServiceMock: { currentUser: ReturnType<typeof signal<{ userId: string } | null>>; hasPermission: ReturnType<typeof vi.fn>; isAuthenticated: ReturnType<typeof signal<boolean>> };

  beforeEach(async () => {
    usersServiceMock = {
      getUsers: vi.fn().mockReturnValue(of(pagedResponse([makeUser()]))),
      deactivateUser: vi.fn().mockReturnValue(of(undefined)),
      reactivateUser: vi.fn().mockReturnValue(of(undefined)),
    };

    rolesServiceMock = {
      getRoles: vi.fn().mockReturnValue(of([])),
    };

    authServiceMock = {
      currentUser: signal<{ userId: string } | null>({ userId: 'current-user' }),
      hasPermission: vi.fn().mockReturnValue(true),
      isAuthenticated: signal(true),
    };

    await TestBed.configureTestingModule({
      imports: [PeopleListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: UsersService, useValue: usersServiceMock },
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PeopleListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar usuários ao inicializar (via onLazyLoad da tabela)', () => {
    expect(usersServiceMock.getUsers).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 });
    expect((component as any).users().length).toBe(1);
  });

  describe('toggleActive', () => {
    it('chama deactivateUser para usuário ativo', () => {
      const user = makeUser({ isActive: true });
      (component as any).users.set([user]);

      (component as any).toggleActive(user);

      expect(usersServiceMock.deactivateUser).toHaveBeenCalledWith('u1');
    });

    it('chama reactivateUser para usuário inativo', () => {
      const user = makeUser({ isActive: false });
      (component as any).users.set([user]);

      (component as any).toggleActive(user);

      expect(usersServiceMock.reactivateUser).toHaveBeenCalledWith('u1');
    });

    it('faz atualização otimista antes da chamada ao service', () => {
      const user = makeUser({ isActive: true });
      (component as any).users.set([user]);

      usersServiceMock.deactivateUser.mockReturnValue(
        new (class { subscribe() {} })() as any,
      );

      (component as any).toggleActive(user);

      const optimistic = (component as any).users().find((u: User) => u.userId === 'u1');
      expect(optimistic.isActive).toBe(false);
    });

    it('reverte isActive em caso de erro do service', () => {
      const user = makeUser({ isActive: true });
      (component as any).users.set([user]);

      usersServiceMock.deactivateUser.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );

      (component as any).toggleActive(user);

      const reverted = (component as any).users().find((u: User) => u.userId === 'u1');
      expect(reverted.isActive).toBe(true);
    });

    it('não desativa o próprio usuário logado — toggle desabilitado', () => {
      const selfUser = makeUser({ userId: 'current-user', isActive: true });
      (component as any).users.set([selfUser]);

      expect((component as any).auth.currentUser()?.userId).toBe('current-user');
    });
  });

  describe('busca server-side', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('envia o termo de busca para getUsers após o debounce', () => {
      usersServiceMock.getUsers.mockClear();

      (component as any).onSearchInput({ target: { value: 'ana' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(usersServiceMock.getUsers).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 10,
        search: 'ana',
      });
    });

    it('reseta para a primeira página ao buscar', () => {
      (component as any).first.set(20);

      (component as any).onSearchInput({ target: { value: 'bruno' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect((component as any).first()).toBe(0);
    });

    it('não envia o parâmetro search quando a busca está vazia', () => {
      usersServiceMock.getUsers.mockClear();

      (component as any).onSearchInput({ target: { value: '' } } as unknown as Event);
      vi.advanceTimersByTime(300);

      expect(usersServiceMock.getUsers).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 10,
        search: undefined,
      });
    });
  });

  describe('coluna Perfil', () => {
    it('exibe uma tag para cada perfil do usuário', () => {
      (component as any).users.set([makeUser({ roles: ['Admin', 'Coordenador'] })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelectorAll('p-tag').length).toBe(2);
    });

    it('exibe travessão quando o usuário não possui perfis', () => {
      (component as any).users.set([makeUser({ roles: [] })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelectorAll('p-tag').length).toBe(0);
      expect(compiled.textContent).toContain('—');
    });
  });

  describe('coluna Nome', () => {
    it('aplica truncate com tooltip exibindo o fullName completo', () => {
      (component as any).users.set([makeUser({ fullName: 'Ana Maria de Souza Silva' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      const nameCell = compiled.querySelector('td span.truncate') as HTMLElement;
      expect(nameCell.textContent?.trim()).toBe('Ana Maria de Souza Silva');
      expect(nameCell.getAttribute('title')).toBe('Ana Maria de Souza Silva');
    });
  });

  describe('ações da tabela', () => {
    it('exibe botão de editar (lápis) quando possui Identity.Users.Manage', () => {
      authServiceMock.hasPermission.mockReturnValue(true);
      (component as any).users.set([makeUser()]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('.pi-pencil')).toBeTruthy();
      expect(compiled.querySelector('.pi-eye')).toBeFalsy();
    });

    it('exibe botão de visualizar (olho) quando não possui Identity.Users.Manage', () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      (component as any).users.set([makeUser()]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('.pi-eye')).toBeTruthy();
      expect(compiled.querySelector('.pi-pencil')).toBeFalsy();
    });
  });
});
