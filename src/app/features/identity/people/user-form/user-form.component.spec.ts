import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Validators } from '@angular/forms';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';

import { UserFormComponent } from './user-form.component';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { PositionsService } from '../../../research/positions/positions.service';
import { User, CreateUserResponse } from '../../../../shared/models/user.model';
import { Role } from '../../../../shared/models/role.model';

const mockRole: Role = { roleId: 'r1', name: 'Admin', permissions: [] };
const mockRole2: Role = { roleId: 'r2', name: 'Coordenador', permissions: [] };

const mockUser: User = {
  userId: 'u1',
  fullName: 'Ana Silva',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@lab.com',
  phoneNumber: null,
  emergencyContactNumber: null,
  isActive: true,
  roles: ['Admin'],
};

const mockPositionsResponse = {
  data: [{ id: 'pos1', name: 'Pesquisador', description: '' }],
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: 1,
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
  let usersServiceMock: Mocked<Pick<UsersService, 'createUser' | 'updateUser' | 'getUserById'>>;
  let messageServiceMock: Mocked<Pick<MessageService, 'add'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };
  let positionsServiceMock: Mocked<Pick<PositionsService, 'getPositions'>>;

  beforeEach(async () => {
    usersServiceMock = {
      createUser: vi.fn(),
      updateUser: vi.fn(),
      getUserById: vi.fn(),
    };

    messageServiceMock = { add: vi.fn() };

    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };

    positionsServiceMock = {
      getPositions: vi.fn().mockReturnValue(of(mockPositionsResponse)),
    };

    await TestBed.configureTestingModule({
      imports: [UserFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: UsersService, useValue: usersServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: PositionsService, useValue: positionsServiceMock },
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
          userData: expect.objectContaining({
            firstName: 'Carlos',
            lastName: 'Mendes',
          }),
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

    it('exibe o cabeçalho "Nova Pessoa"', () => {
      expect((component as any).dialogHeader()).toBe('Nova Pessoa');
    });
  });

  describe('modo edição', () => {
    beforeEach(() => {
      usersServiceMock.getUserById.mockReturnValue(of(mockUser));
      fixture.componentRef.setInput('user', mockUser);
      fixture.componentRef.setInput('roles', [mockRole, mockRole2]);
      fixture.detectChanges();
      (component as any).onDialogShow();
    });

    it('busca os dados completos do usuário via getUserById', () => {
      expect(usersServiceMock.getUserById).toHaveBeenCalledWith('u1');
    });

    it('campo email está desabilitado', () => {
      expect((component as any).form.get('email').disabled).toBe(true);
    });

    it('preenche o formulário com os dados retornados pelo getUserById', () => {
      const form = (component as any).form;
      expect(form.get('firstName').value).toBe('Ana');
      expect(form.get('lastName').value).toBe('Silva');
    });

    it('preenche roleIds com os IDs dos perfis correspondentes aos nomes retornados', () => {
      const form = (component as any).form;
      expect(form.get('roleIds').value).toEqual(['r1']);
    });

    it('exibe o cabeçalho "Editar Pessoa"', () => {
      expect((component as any).dialogHeader()).toBe('Editar Pessoa');
    });

    it('chama updateUser com roleIds corretos', () => {
      usersServiceMock.updateUser.mockReturnValue(of(undefined));

      const form = (component as any).form;
      form.patchValue({ roleIds: ['r1'] });

      (component as any).onSave();

      expect(usersServiceMock.updateUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ roleIds: ['r1'] }),
      );
    });

    it('permite selecionar múltiplos perfis e envia todos no roleIds', () => {
      usersServiceMock.updateUser.mockReturnValue(of(undefined));

      const form = (component as any).form;
      form.patchValue({ roleIds: ['r1', 'r2'] });

      (component as any).onSave();

      expect(usersServiceMock.updateUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ roleIds: ['r1', 'r2'] }),
      );
    });

    it('envia userData com os dados de identidade, sem o e-mail (não suportado pelo PUT)', () => {
      usersServiceMock.updateUser.mockReturnValue(of(undefined));

      (component as any).onSave();

      expect(usersServiceMock.updateUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          userData: expect.objectContaining({ firstName: 'Ana', lastName: 'Silva' }),
        }),
      );
      const [, body] = usersServiceMock.updateUser.mock.calls[0];
      expect((body as any).email).toBeUndefined();
      expect((body as any).userData.email).toBeUndefined();
    });

    it('exibe mensagem de sucesso após edição', () => {
      usersServiceMock.updateUser.mockReturnValue(of(undefined));

      (component as any).onSave();

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });
  });

  describe('carregamento dos dados ao abrir o diálogo', () => {
    it('define loadingUser como true durante a busca e false após retorno', () => {
      const subject = new Subject<User>();
      usersServiceMock.getUserById.mockReturnValue(subject.asObservable());
      fixture.componentRef.setInput('user', mockUser);
      fixture.componentRef.setInput('roles', [mockRole]);
      fixture.detectChanges();

      (component as any).onDialogShow();
      expect((component as any).loadingUser()).toBe(true);

      subject.next(mockUser);
      subject.complete();

      expect((component as any).loadingUser()).toBe(false);
    });

    it('exibe mensagem de erro quando getUserById falha', () => {
      usersServiceMock.getUserById.mockReturnValue(throwError(() => ({ status: 500 })));
      fixture.componentRef.setInput('user', mockUser);
      fixture.componentRef.setInput('roles', [mockRole]);
      fixture.detectChanges();

      (component as any).onDialogShow();

      expect((component as any).loadingUser()).toBe(false);
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });
  });

  describe('modo somente leitura (sem Identity.Users.Manage)', () => {
    beforeEach(() => {
      authServiceMock.hasPermission.mockReturnValue(false);
      usersServiceMock.getUserById.mockReturnValue(of(mockUser));
      fixture.componentRef.setInput('user', mockUser);
      fixture.componentRef.setInput('roles', [mockRole]);
      fixture.detectChanges();
      (component as any).onDialogShow();
    });

    it('readOnly retorna true', () => {
      expect((component as any).readOnly()).toBe(true);
    });

    it('desabilita todos os campos do formulário', () => {
      expect((component as any).form.disabled).toBe(true);
    });

    it('exibe o cabeçalho "Visualizar Pessoa"', () => {
      expect((component as any).dialogHeader()).toBe('Visualizar Pessoa');
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

  describe('aba Pesquisa/Acadêmico', () => {
    it('carrega as opções de posições ao abrir o diálogo', () => {
      (component as any).onDialogShow();

      expect(positionsServiceMock.getPositions).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 100 });
      expect((component as any).positionOptions()).toEqual([{ label: 'Pesquisador', value: 'pos1' }]);
    });

    it('aplica validadores obrigatórios quando research.enabled é ativado', () => {
      const research = (component as any).form.controls.research.controls;

      research.enabled.setValue(true);

      expect(research.positionId.hasValidator(Validators.required)).toBe(true);
      expect(research.degreeLevel.hasValidator(Validators.required)).toBe(true);
      expect(research.fieldOfStudy.hasValidator(Validators.required)).toBe(true);
    });

    it('remove validadores obrigatórios quando research.enabled é desativado', () => {
      const research = (component as any).form.controls.research.controls;

      research.enabled.setValue(true);
      research.enabled.setValue(false);

      expect(research.positionId.hasValidator(Validators.required)).toBe(false);
      expect(research.degreeLevel.hasValidator(Validators.required)).toBe(false);
      expect(research.fieldOfStudy.hasValidator(Validators.required)).toBe(false);
    });

    it('envia researchData null na criação quando o toggle está desabilitado', () => {
      const response: CreateUserResponse = { userId: 'u99', resetToken: 'tok-abc' };
      usersServiceMock.createUser.mockReturnValue(of(response));

      const form = (component as any).form;
      form.patchValue({ firstName: 'Carlos', lastName: 'Mendes', email: 'carlos@lab.com' });
      form.get('email').enable();

      (component as any).onSave();

      expect(usersServiceMock.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userData: expect.objectContaining({ researchData: null }),
        }),
      );
    });

    it('envia researchData preenchido quando o toggle está habilitado', () => {
      const response: CreateUserResponse = { userId: 'u99', resetToken: 'tok-abc' };
      usersServiceMock.createUser.mockReturnValue(of(response));

      const form = (component as any).form;
      form.patchValue({ firstName: 'Carlos', lastName: 'Mendes', email: 'carlos@lab.com' });
      form.get('email').enable();
      form.controls.research.patchValue({
        enabled: true,
        positionId: 'pos1',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Virologia',
        lattesUrl: 'https://lattes.cnpq.br/123',
        citationName: 'MENDES, C.',
        displayName: 'Carlos Mendes',
      });

      (component as any).onSave();

      expect(usersServiceMock.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userData: expect.objectContaining({
            researchData: {
              positionId: 'pos1',
              degreeLevel: 'Masters',
              fieldOfStudy: 'Virologia',
              lattesUrl: 'https://lattes.cnpq.br/123',
              citationName: 'MENDES, C.',
              displayName: 'Carlos Mendes',
            },
          }),
        }),
      );
    });

    it('preenche a aba de pesquisa com os dados existentes na edição', () => {
      usersServiceMock.getUserById.mockReturnValue(of({
        ...mockUser,
        researchData: {
          positionId: 'pos1',
          degreeLevel: 'Doctorate',
          fieldOfStudy: 'Imunologia',
          lattesUrl: 'https://lattes.cnpq.br/456',
          citationName: 'SILVA, A.',
          displayName: 'Ana Silva',
        },
      }));
      fixture.componentRef.setInput('user', mockUser);
      fixture.componentRef.setInput('roles', [mockRole]);
      fixture.detectChanges();

      (component as any).onDialogShow();

      const research = (component as any).form.controls.research;
      expect(research.value).toEqual({
        enabled: true,
        positionId: 'pos1',
        degreeLevel: 'Doctorate',
        fieldOfStudy: 'Imunologia',
        lattesUrl: 'https://lattes.cnpq.br/456',
        citationName: 'SILVA, A.',
        displayName: 'Ana Silva',
      });
    });
  });
});
