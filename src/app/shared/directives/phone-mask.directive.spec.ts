import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { PhoneMaskDirective } from './phone-mask.directive';

@Component({
  imports: [ReactiveFormsModule, PhoneMaskDirective],
  template: `<input phoneMask [formControl]="control" data-testid="phone" />`,
})
class TestHostComponent {
  readonly control = new FormControl('');
}

describe('PhoneMaskDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let input: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('[data-testid="phone"]');
  });

  const typeDigits = (chars: string): void => {
    for (const char of chars) {
      input.value += char;
      input.setSelectionRange(input.value.length, input.value.length);
      input.dispatchEvent(new Event('input'));
    }
  };

  it('formata progressivamente um celular (11 dígitos) enquanto o usuário digita', () => {
    typeDigits('11912345678');
    expect(input.value).toBe('(11) 91234-5678');
  });

  it('formata progressivamente um telefone fixo (10 dígitos)', () => {
    typeDigits('1133334444');
    expect(input.value).toBe('(11) 3333-4444');
  });

  it('atualiza o FormControl apenas com os dígitos, sem máscara', () => {
    typeDigits('11912345678');
    expect(fixture.componentInstance.control.value).toBe('11912345678');
  });

  it('ignora caracteres não numéricos digitados', () => {
    typeDigits('11abc91234');
    expect(input.value).toBe('(11) 9123-4');
  });

  it('limita a entrada a 11 dígitos', () => {
    typeDigits('1191234567899');
    expect(input.value).toBe('(11) 91234-5678');
  });

  it('exibe o valor inicial do FormControl já formatado', () => {
    fixture.componentInstance.control.setValue('11912345678');
    fixture.detectChanges();
    expect(input.value).toBe('(11) 91234-5678');
  });
});
