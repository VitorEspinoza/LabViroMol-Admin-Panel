import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { MaintenanceListComponent } from './maintenance-list.component';
import { MaintenanceService } from '../maintenance.service';
import { EquipmentsService } from '../../equipments/equipments.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmDialogService, ConfirmOptions } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { MaintenanceRequest } from '../../../../shared/models/assets.model';
import { PagedResponse } from '../../../../shared/models/pagination.model';

const makeRequest = (overrides: Partial<MaintenanceRequest> = {}): MaintenanceRequest => ({
  maintenanceRequestId: 'mr1',
  equipmentId: 'eq1',
  equipmentName: 'Microscópio Óptico',
  description: 'Manutenção preventiva',
  problemDescription: 'Lente desalinhada',
  status: 'Requested',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: null,
  ...overrides,
});

const pagedRequests = (requests: MaintenanceRequest[]): PagedResponse<MaintenanceRequest> => ({
  data: requests,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: requests.length,
});

const emptyEquipmentsResponse = {
  data: [],
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: 0,
};

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MaintenanceListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<MaintenanceListComponent>;
  let component: MaintenanceListComponent;
  let maintenanceServiceMock: Mocked<Pick<MaintenanceService, 'getMaintenanceRequests' | 'createMaintenanceRequest' | 'startMaintenance' | 'completeMaintenance' | 'cancelMaintenance'>>;
  let equipmentsServiceMock: Mocked<Pick<EquipmentsService, 'getEquipments'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [MaintenanceListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: MaintenanceService, useValue: maintenanceServiceMock },
        { provide: EquipmentsService, useValue: equipmentsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MaintenanceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    maintenanceServiceMock = {
      getMaintenanceRequests: vi.fn().mockReturnValue(of(pagedRequests([makeRequest()]))),
      createMaintenanceRequest: vi.fn(),
      startMaintenance: vi.fn().mockReturnValue(of(undefined)),
      completeMaintenance: vi.fn().mockReturnValue(of(undefined)),
      cancelMaintenance: vi.fn().mockReturnValue(of(undefined)),
    };
    equipmentsServiceMock = {
      getEquipments: vi.fn().mockReturnValue(of(emptyEquipmentsResponse)),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
    confirmDialogServiceMock = {
      confirm: vi.fn((options: ConfirmOptions) => options.accept()),
    };
  });

  it('deve criar o componente e carregar as solicitações ao inicializar', async () => {
    await setup();

    expect(maintenanceServiceMock.getMaintenanceRequests).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10, search: undefined });
    expect((component as any).requests().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  describe('ações contextuais por status', () => {
    it('exibe apenas "Iniciar" e "Cancelar" para solicitações Requested', async () => {
      await setup();
      (component as any).requests.set([makeRequest({ status: 'Requested' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Iniciar');
      expect(compiled.textContent).toContain('Cancelar');
      expect(compiled.textContent).not.toContain('Concluir');
    });

    it('exibe apenas "Concluir" e "Cancelar" para solicitações InProgress', async () => {
      await setup();
      (component as any).requests.set([makeRequest({ status: 'InProgress' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Concluir');
      expect(compiled.textContent).toContain('Cancelar');
      expect(compiled.textContent).not.toContain('Iniciar');
    });

    it('não exibe ações para solicitações Done ou Cancelled', async () => {
      await setup();
      (component as any).requests.set([makeRequest({ status: 'Done' })]);
      fixture.detectChanges();

      let compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Iniciar');
      expect(compiled.textContent).not.toContain('Concluir');
      expect(compiled.textContent).not.toContain('Cancelar');

      (component as any).requests.set([makeRequest({ status: 'Cancelled' })]);
      fixture.detectChanges();

      compiled = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Iniciar');
      expect(compiled.textContent).not.toContain('Concluir');
      expect(compiled.textContent).not.toContain('Cancelar');
    });

    it('não exibe nenhuma ação quando o usuário não possui Assets.Maintenance.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();
      (component as any).requests.set([makeRequest({ status: 'Requested' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Iniciar');
    });
  });

  describe('Iniciar manutenção', () => {
    it('chama startMaintenance sem exibir confirmação', async () => {
      await setup();
      maintenanceServiceMock.getMaintenanceRequests.mockClear();

      (component as any).startMaintenance(makeRequest({ status: 'Requested' }));

      expect(confirmDialogServiceMock.confirm).not.toHaveBeenCalled();
      expect(maintenanceServiceMock.startMaintenance).toHaveBeenCalledWith('mr1');
      expect(maintenanceServiceMock.getMaintenanceRequests).toHaveBeenCalled();
    });
  });

  describe('Concluir manutenção', () => {
    it('exibe confirmação antes de concluir e chama completeMaintenance ao aceitar', async () => {
      await setup();
      maintenanceServiceMock.getMaintenanceRequests.mockClear();

      (component as any).confirmComplete(makeRequest({ status: 'InProgress' }));

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Concluir Manutenção' }),
      );
      expect(maintenanceServiceMock.completeMaintenance).toHaveBeenCalledWith('mr1');
      expect(maintenanceServiceMock.getMaintenanceRequests).toHaveBeenCalled();
    });
  });

  describe('Cancelar manutenção', () => {
    it('exibe confirmação antes de cancelar e chama cancelMaintenance ao aceitar', async () => {
      await setup();
      maintenanceServiceMock.getMaintenanceRequests.mockClear();

      (component as any).confirmCancel(makeRequest({ status: 'Requested' }));

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Cancelar Manutenção' }),
      );
      expect(maintenanceServiceMock.cancelMaintenance).toHaveBeenCalledWith('mr1');
      expect(maintenanceServiceMock.getMaintenanceRequests).toHaveBeenCalled();
    });
  });
});
