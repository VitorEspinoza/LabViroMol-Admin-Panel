import { Component, signal, WritableSignal } from '@angular/core';
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
  let permissionGranted: WritableSignal<boolean>;

  beforeEach(async () => {
    permissionGranted = signal(false);
    authMock = { hasPermission: vi.fn().mockImplementation(() => permissionGranted()) };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('deve renderizar o elemento quando usuário tem a permissão', () => {
    permissionGranted.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(el).not.toBeNull();
    expect(el.textContent.trim()).toBe('Visível');
  });

  it('deve remover o elemento quando usuário não tem a permissão', () => {
    permissionGranted.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="protected"]');
    expect(el).toBeNull();
  });

  it('deve atualizar o elemento quando a permissão muda reativamente', () => {
    permissionGranted.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="protected"]')).toBeNull();

    permissionGranted.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="protected"]')).not.toBeNull();
  });
});
