import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { DataTableContainerComponent } from './data-table-container.component';

@Component({
  imports: [DataTableContainerComponent],
  template: `
    <app-data-table-container>
      <p>Conteúdo da tabela</p>
    </app-data-table-container>
  `,
})
class HostComponent {}

describe('DataTableContainerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('deve renderizar o conteúdo projetado dentro do container', () => {
    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.textContent?.trim()).toBe('Conteúdo da tabela');
  });

  it('deve aplicar as classes de card arredondado com padding', () => {
    const container = fixture.nativeElement.querySelector('app-data-table-container > div') as HTMLElement;
    expect(container.className).toContain('rounded-lg');
    expect(container.className).toContain('border-border');
    expect(container.className).toContain('bg-card');
    expect(container.className).toContain('p-2');
  });
});
