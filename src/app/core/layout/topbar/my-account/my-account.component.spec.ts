import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';

import { MyAccountComponent } from './my-account.component';
import { AuthService } from '../../../auth/auth.service';
import { ApiMeResponse } from '../../../auth/session.model';

const mockMe: ApiMeResponse = {
  id: 'u1',
  userData: {
    firstName: 'Ana',
    lastName: 'Silva',
    phoneNumber: '11912345678',
    emergencyContactName: 'Maria',
    emergencyContactNumber: '11999998888',
  },
  isActive: true,
  roles: ['Admin'],
};

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MyAccountComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<MyAccountComponent>;
  let component: MyAccountComponent;
  let authServiceMock: Mocked<Pick<AuthService, 'getMe' | 'updateProfile'>>;
  let messageServiceMock: Mocked<Pick<MessageService, 'add'>>;

  beforeEach(async () => {
    authServiceMock = {
      getMe: vi.fn().mockReturnValue(of(mockMe)),
      updateProfile: vi.fn(),
    };
    messageServiceMock = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MyAccountComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('onDialogShow', () => {
    it('busca os dados do usuário autenticado via getMe', () => {
      (component as any).onDialogShow();
      expect(authServiceMock.getMe).toHaveBeenCalled();
    });

    it('preenche o formulário com os dados retornados', () => {
      (component as any).onDialogShow();
      const form = (component as any).form;
      expect(form.get('firstName').value).toBe('Ana');
      expect(form.get('lastName').value).toBe('Silva');
      expect(form.get('phoneNumber').value).toBe('11912345678');
      expect(form.get('emergencyContactName').value).toBe('Maria');
      expect(form.get('emergencyContactNumber').value).toBe('11999998888');
    });

    it('define loading como true durante a busca e false após retorno', () => {
      const subject = new Subject<ApiMeResponse>();
      authServiceMock.getMe.mockReturnValue(subject.asObservable());

      (component as any).onDialogShow();
      expect((component as any).loading()).toBe(true);

      subject.next(mockMe);
      subject.complete();

      expect((component as any).loading()).toBe(false);
    });

    it('exibe mensagem de erro quando getMe falha', () => {
      authServiceMock.getMe.mockReturnValue(throwError(() => ({ status: 500 })));

      (component as any).onDialogShow();

      expect((component as any).loading()).toBe(false);
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });
  });

  describe('onSave', () => {
    beforeEach(() => {
      (component as any).onDialogShow();
    });

    it('não salva quando formulário é inválido', () => {
      const form = (component as any).form;
      form.patchValue({ firstName: '' });

      (component as any).onSave();

      expect(authServiceMock.updateProfile).not.toHaveBeenCalled();
    });

    it('chama updateProfile com userData correto, sem email/roleIds', () => {
      authServiceMock.updateProfile.mockReturnValue(of(undefined));

      const form = (component as any).form;
      form.patchValue({ firstName: 'Ana', lastName: 'Costa' });

      (component as any).onSave();

      expect(authServiceMock.updateProfile).toHaveBeenCalledWith({
        userData: {
          firstName: 'Ana',
          lastName: 'Costa',
          phoneNumber: '11912345678',
          emergencyContactName: 'Maria',
          emergencyContactNumber: '11999998888',
          researchData: null,
        },
      });
      const [body] = authServiceMock.updateProfile.mock.calls[0];
      expect((body as any).email).toBeUndefined();
      expect((body as any).roleIds).toBeUndefined();
    });

    it('exibe mensagem de sucesso após salvar', () => {
      authServiceMock.updateProfile.mockReturnValue(of(undefined));

      (component as any).onSave();

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('define serverError nos campos em erro 400', () => {
      authServiceMock.updateProfile.mockReturnValue(
        throwError(() => ({ status: 400, error: { errors: { firstName: ['Nome inválido.'] } } })),
      );

      (component as any).onSave();

      const form = (component as any).form;
      expect(form.get('firstName').errors?.['serverError']).toBe('Nome inválido.');
    });
  });

  describe('onCancel', () => {
    it('fecha o diálogo', () => {
      fixture.componentRef.setInput('visible', true);
      (component as any).onCancel();
      expect(component.visible()).toBe(false);
    });
  });
});
