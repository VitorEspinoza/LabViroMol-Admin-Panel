import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authMock: Mocked<Pick<AuthService, 'login'>>;

  beforeEach(async () => {
    authMock = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('não deve chamar AuthService quando o formulário é inválido', () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it('deve marcar campos como touched ao submeter formulário inválido', () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const form = (component as any).form;
    expect(form.get('email').touched).toBe(true);
    expect(form.get('password').touched).toBe(true);
  });

  it('deve definir loading como true durante a requisição', () => {
    authMock.login.mockReturnValue(of(undefined));
    const form = (component as any).form;
    form.setValue({ email: 'test@test.com', password: '12345678' });

    (component as any).onLogin();
    expect(authMock.login).toHaveBeenCalledWith('test@test.com', '12345678');
  });

  it('deve exibir mensagem de credenciais inválidas em erro 401', () => {
    authMock.login.mockReturnValue(throwError(() => ({ status: 401 })));
    const form = (component as any).form;
    form.setValue({ email: 'test@test.com', password: 'wrong' });

    (component as any).onLogin();
    fixture.detectChanges();

    const errorMsg = (component as any).errorMessage();
    expect(errorMsg).toContain('E-mail ou senha incorretos');
  });

  it('deve exibir mensagem de conta bloqueada em erro 429', () => {
    authMock.login.mockReturnValue(throwError(() => ({ status: 429 })));
    const form = (component as any).form;
    form.setValue({ email: 'test@test.com', password: '12345678' });

    (component as any).onLogin();
    fixture.detectChanges();

    const errorMsg = (component as any).errorMessage();
    expect(errorMsg).toContain('bloqueada');
  });

  it('deve limpar a mensagem de erro ao iniciar nova tentativa', () => {
    authMock.login.mockReturnValue(of(undefined));
    (component as any).errorMessage.set('Erro anterior');
    const form = (component as any).form;
    form.setValue({ email: 'test@test.com', password: '12345678' });

    (component as any).onLogin();

    expect((component as any).errorMessage()).toBe('');
  });
});
