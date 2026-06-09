import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let confirmationService: ConfirmationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [ConfirmationService, provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    confirmationService = TestBed.inject(ConfirmationService);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.querySelectorAll('.p-overlay-mask').forEach(el => el.remove());
  });

  it('deve criar o componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir labels corretos ao ser acionado', async () => {
    confirmationService.confirm({
      header: 'Confirmar Exclusão',
      message: 'Deseja excluir este item?',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      accept: () => {},
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Excluir');
    expect(bodyText).toContain('Cancelar');
  });

  it('deve usar labels padrão quando não fornecidos', async () => {
    confirmationService.confirm({
      header: 'Atenção',
      message: 'Tem certeza?',
      accept: () => {},
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Confirmar');
    expect(bodyText).toContain('Cancelar');
  });
});
