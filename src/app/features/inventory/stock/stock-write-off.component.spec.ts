import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of } from 'rxjs';

import { StockWriteOffComponent } from './stock-write-off.component';
import { MaterialsService } from '../materials/materials.service';
import { StockService } from './stock.service';
import { ProjectsService } from '../../research/projects/projects.service';
import { KitsService } from '../kits/kits.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PagedResponse } from '../../../shared/models/pagination.model';
import { Material, Kit } from '../../../shared/models/inventory.model';

const pagedResponse = <T>(data: T[]): PagedResponse<T> => ({
  data,
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: data.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('StockWriteOffComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<StockWriteOffComponent>;
  let component: StockWriteOffComponent;
  let materialsServiceMock: Mocked<Pick<MaterialsService, 'getMaterials'>>;
  let stockServiceMock: Mocked<Pick<StockService, 'consumeForProject'>>;
  let projectsServiceMock: Mocked<Pick<ProjectsService, 'getProjects'>>;
  let kitsServiceMock: Mocked<Pick<KitsService, 'getKits'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [StockWriteOffComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MaterialsService, useValue: materialsServiceMock },
        { provide: StockService, useValue: stockServiceMock },
        { provide: ProjectsService, useValue: projectsServiceMock },
        { provide: KitsService, useValue: kitsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockWriteOffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    materialsServiceMock = {
      getMaterials: vi.fn().mockReturnValue(of(pagedResponse<Material>([]))),
    };
    stockServiceMock = {
      consumeForProject: vi.fn().mockReturnValue(of(undefined)),
    };
    projectsServiceMock = {
      getProjects: vi.fn().mockReturnValue(of(pagedResponse([]) as any)),
    };
    kitsServiceMock = {
      getKits: vi.fn().mockReturnValue(of(pagedResponse<Kit>([]))),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
  });

  it('exibe o cabeçalho da página "Estoque"', async () => {
    await setup();

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Estoque');
  });

  it('exibe a aba "Baixa de Materiais"', async () => {
    await setup();

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Baixa de Materiais');
  });

  describe('aba "Kits Salvos"', () => {
    it('é exibida quando o usuário possui Inventory.Kits.View', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Kits Salvos');
    });

    it('é ocultada quando o usuário não possui Inventory.Kits.View', async () => {
      authServiceMock.hasPermission.mockImplementation((p: string) => p !== 'Inventory.Kits.View');
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Kits Salvos');
    });
  });

  describe('navegação entre abas', () => {
    it('inicia na aba "write-off"', async () => {
      await setup();

      expect((component as any).activeTab()).toBe('write-off');
    });

    it('goToWriteOffTab volta a ativar a aba "write-off"', async () => {
      await setup();
      (component as any).activeTab.set('kits');

      (component as any).goToWriteOffTab();

      expect((component as any).activeTab()).toBe('write-off');
    });
  });
});
