import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { UserFormComponent } from './user-form.component';
import { UsersService } from '../../users/users.service';
import { User, CreateUserResponse } from '../../../../shared/models/user.model';
import { Role } from '../../../../shared/models/role.model';

const mockRole: Role = { roleId: 'r1', name: 'Admin', permissions: [] };

const mockUser: User = {
  userId: 'u1',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@lab.com',
  phoneNumber: null,
  emergencyContactNumber: null,
  isActive: true,
  deactivatedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: null,
  roles: ['Admin'],
};

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('UserFormComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });
  let fixture: ComponentFixture<UserFormComponent>;
  let component: UserFormComponent;
  let usersServiceMock: Mocked<Pick<UsersService, 'createUser' | 'updateUser'>>;
  let messageServiceMock: Mocked<Pick<MessageService, 'add'>>;

  beforeEach(async () => {
    usersServiceMock = {
      createUser: vi.fn(),
      updateUser: vi.fn(),
    };

    messageServiceMock = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UserFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: UsersService, useValue: usersServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('modo criação', () => {
    it('não salva quando formulário é inválido', () => {
      (component as any).onSave();
      expect(usersServiceMock.createUser).not.toHaveBeenCalled();
    });

    it('marca todos os campos como touched ao salvar formulário inválido', () => {
      (component as any).onSave();
      const form = (component as any).form;
      expect(form.get('firstName').touched).toBe(true);
      expect(form.get('lastName').touched).toBe(true);
      expect(form.get('email').touched).toBe(true);
    });

    it('chama createUser com dados corretos', () => {
      const response: CreateUserResponse = { userId: 'u99', resetToken: 'tok-abc' };
      usersServiceMock.createUser.mockReturnValue(of(response));

      const form = (component as any).form;
      form.patchValue({
        firstName: 'Carlos',
        lastName: 'Mendes',
        email: 'carlos@lab.com',
      });
      form.get('email').enable();

      (component as any).onSave();

      expect(usersServiceMock.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Carlos',
          lastName: 'Mendes',
          email: 'carlos@lab.com',
        }),
      );
    });

    it('exibe toast com resetToken por 10s após criação bem-sucedida', () => {
      const response: CreateUserResponse = { userId: 'u99', resetToken: 'tok-abc' };
      usersServiceMock.createUser.mockReturnValue(of(response));

      const form = (component as any).form;
      form.patchValue({ firstName: 'Carlos', lastName: 'Mendes', email: 'carlos@lab.com' });
      form.get('email').enable();

      (component as any).onSave();

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.stringContaining('tok-abc'),
          life: 10000,
        }),
      );
    });

    it('define serverError no campo email em erro 409', () => {
      usersServiceMock.createUser.mockReturnValue(
        throwError(() => ({ status: 409, error: { error: 'E-mail já está em uso.' } })),
      );

      const form = (component as any).form;
      form.patchValue({ firstName: 'Carlos', lastName: 'Mendes', email: 'dup@lab.com' });
      form.get('email').enable();

      (component as any).onSave();

      expect(form.get('email').errors?.['serverError']).toBe('E-mail já está em uso.');
    });
  });

  describe('modo edição', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('user', mockUser);
      fixture.componentRef.setInput('roles', [mockRole]);
      fixture.detectChanges();
      (component as any).onDialogShow();
    });

    it('campo email está desabilitado', () => {
      expect((component as any).form.get('email').disabled).toBe(true);
    });

    it('preenche o formulário com dados do usuário', () => {
      const form = (component as any).form;
      expect(form.get('firstName').value).toBe('Ana');
      expect(form.get('lastName').value).toBe('Silva');
    });

    it('chama updateUser com roleIds corretos', () => {
      usersServiceMock.updateUser.mockReturnValue(of(undefined));

      const form = (component as any).form;
      form.get('firstName').enable();
      form.patchValue({ roleId: 'r1' });

      (component as any).onSave();

      expect(usersServiceMock.updateUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ roleIds: ['r1'] }),
      );
    });

    it('usa o email original do usuário no body do update (ignora campo desabilitado)', () => {
      usersServiceMock.updateUser.mockReturnValue(of(undefined));

      (component as any).onSave();

      expect(usersServiceMock.updateUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ email: 'ana@lab.com' }),
      );
    });

    it('exibe mensagem de sucesso após edição', () => {
      usersServiceMock.updateUser.mockReturnValue(of(undefined));

      (component as any).onSave();

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });
  });

  describe('isEditing', () => {
    it('retorna false quando user é null', () => {
      fixture.componentRef.setInput('user', null);
      fixture.detectChanges();
      expect((component as any).isEditing()).toBe(false);
    });

    it('retorna true quando user está definido', () => {
      fixture.componentRef.setInput('user', mockUser);
      fixture.detectChanges();
      expect((component as any).isEditing()).toBe(true);
    });
  });
});
