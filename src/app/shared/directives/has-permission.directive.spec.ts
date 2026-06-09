import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HasPermissionDirective } from './has-permission.directive';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  imports: [HasPermissionDirective],
  template: `
    <div *hasPermission="'Research.Projects.Manage'" data-testid="protected">Visível</div>
  `,
})
class TestHostComponent {}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let authMock: { hasPermission: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authMock = { hasPermission: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('deve renderizar o elemento quando usuário tem a permissão', () => {
    authMock.hasPermission.mockReturnValue(true);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(el).not.toBeNull();
    expect(el.textContent.trim()).toBe('Visível');
  });

  it('deve remover o elemento quando usuário não tem a permissão', () => {
    authMock.hasPermission.mockReturnValue(false);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(el).toBeNull();
  });

  it('deve atualizar o elemento quando a permissão muda reativamente', () => {
    authMock.hasPermission.mockReturnValue(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="protected"]')).toBeNull();

    authMock.hasPermission.mockReturnValue(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="protected"]')).not.toBeNull();
  });
});
