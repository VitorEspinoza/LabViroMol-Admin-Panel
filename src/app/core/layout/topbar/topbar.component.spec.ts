import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopbarComponent } from './topbar.component';
import { AuthService } from '../../auth/auth.service';
import { SessionUser } from '../../auth/session.model';

const mockUser: SessionUser = {
  userId: 'u1',
  email: 'ana@lab.com',
  firstName: 'Ana',
  lastName: 'Silva',
  permissions: [],
};

describe('TopbarComponent', () => {
  let fixture: ComponentFixture<TopbarComponent>;
  let component: TopbarComponent;
  let authMock: {
    currentUser: WritableSignal<SessionUser | null>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authMock = {
      currentUser: signal<SessionUser | null>(mockUser),
      logout: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [TopbarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('userInitials', () => {
    it('deve calcular as iniciais do usuário logado', () => {
      expect((component as any).userInitials()).toBe('AS');
    });

    it('deve retornar "?" quando não há usuário logado', () => {
      authMock.currentUser.set(null);
      expect((component as any).userInitials()).toBe('?');
    });
  });

  describe('userFullName', () => {
    it('deve retornar o nome completo do usuário', () => {
      expect((component as any).userFullName()).toBe('Ana Silva');
    });

    it('deve retornar string vazia quando não há usuário', () => {
      authMock.currentUser.set(null);
      expect((component as any).userFullName()).toBe('');
    });
  });

  describe('signOut', () => {
    it('deve chamar authService.logout()', () => {
      (component as any).signOut();
      expect(authMock.logout).toHaveBeenCalledTimes(1);
    });
  });
});
