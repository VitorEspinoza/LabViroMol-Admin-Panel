import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;

  function setup(title: string, subtitle?: string): void {
    TestBed.configureTestingModule({ imports: [PageHeaderComponent] });
    fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', title);
    if (subtitle !== undefined) {
      fixture.componentRef.setInput('subtitle', subtitle);
    }
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    setup('Pesquisas');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve renderizar o título', () => {
    setup('Pesquisas');
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1.textContent?.trim()).toBe('Pesquisas');
  });

  it('deve renderizar o subtítulo quando fornecido', () => {
    setup('Pesquisas', 'Gestão de projetos de pesquisa do laboratório');
    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.textContent?.trim()).toBe('Gestão de projetos de pesquisa do laboratório');
  });

  it('não deve renderizar elemento de subtítulo quando subtítulo está vazio', () => {
    setup('Pesquisas');
    const p = fixture.nativeElement.querySelector('p');
    expect(p).toBeNull();
  });
});
