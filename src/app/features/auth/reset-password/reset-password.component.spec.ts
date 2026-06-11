import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let authMock: Mocked<Pick<AuthService, 'resetPassword'>>;
  let messageAddSpy: ReturnType<typeof vi.spyOn>;

  function setup(queryParams: Record<string, string> = { email: 'test@test.com', token: 'abc123' }): void {
    authMock = { resetPassword: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(queryParams),
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    messageAddSpy = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');
    fixture.detectChanges();
  }

  beforeEach(() => {
    setup();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir erro inline quando as senhas não coincidem', () => {
    const form = (component as any).form;
    form.setValue({
      newPassword: 'senha123',
      confirmPassword: 'diferente',
    });
    form.get('confirmPassword').markAsTouched();
    fixture.detectChanges();

    expect(form.errors?.['passwordsMismatch']).toBe(true);
    const errorEl = fixture.nativeElement.querySelector('.text-red-500');
    expect(errorEl?.textContent).toContain('não coincidem');
  });

  it('não deve submeter quando as senhas não coincidem', () => {
    const form = (component as any).form;
    form.setValue({
      newPassword: 'senha123',
      confirmPassword: 'diferente',
    });

    (component as any).resetPassword();
    expect(authMock.resetPassword).not.toHaveBeenCalled();
  });

  it('deve chamar resetPassword com os dados corretos quando o form é válido', () => {
    authMock.resetPassword.mockReturnValue(of(undefined));
    const form = (component as any).form;
    form.setValue({
      newPassword: 'novaSenha123',
      confirmPassword: 'novaSenha123',
    });

    (component as any).resetPassword();
    expect(authMock.resetPassword).toHaveBeenCalledWith('test@test.com', 'abc123', 'novaSenha123');
  });

  it('deve exibir estado de sucesso após redefinição bem-sucedida', () => {
    authMock.resetPassword.mockReturnValue(of(undefined));
    const form = (component as any).form;
    form.setValue({
      newPassword: 'novaSenha123',
      confirmPassword: 'novaSenha123',
    });

    (component as any).resetPassword();
    fixture.detectChanges();

    expect((component as any).success()).toBe(true);
  });

  it('deve exibir toast de erro quando token é inválido (400)', () => {
    authMock.resetPassword.mockReturnValue(throwError(() => ({ status: 400 })));
    const form = (component as any).form;
    form.setValue({
      newPassword: 'novaSenha123',
      confirmPassword: 'novaSenha123',
    });

    (component as any).resetPassword();

    expect(messageAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: expect.stringContaining('Token inválido') }),
    );
  });

  describe('quando a URL não traz email/token', () => {
    beforeEach(() => {
      setup({});
    });

    it('deve indicar invalidLink como true', () => {
      expect((component as any).invalidLink()).toBe(true);
    });

    it('não deve exibir o formulário de nova senha', () => {
      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeNull();
    });

    it('deve exibir mensagem de link inválido', () => {
      expect(fixture.nativeElement.textContent).toContain('Link de redefinição inválido ou incompleto');
    });

    it('não deve chamar resetPassword ao tentar submeter', () => {
      (component as any).resetPassword();
      expect(authMock.resetPassword).not.toHaveBeenCalled();
    });
  });
});
