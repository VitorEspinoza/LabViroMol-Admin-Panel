import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, Subject } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { SchedulesService } from '../scheduling/schedules/schedules.service';
import { MaterialsService } from '../inventory/materials/materials.service';
import { MaintenanceService } from '../assets/maintenance/maintenance.service';
import { AuthService } from '../../core/auth/auth.service';
import { Schedule } from '../../shared/models/scheduling.model';
import { Material } from '../../shared/models/inventory.model';
import { MaintenanceRequest } from '../../shared/models/assets.model';
import { PagedResponse } from '../../shared/models/pagination.model';

const paged = <T>(data: T[]): PagedResponse<T> => ({
  data,
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: data.length,
});

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'sch1',
  scheduler: { name: 'João da Silva', email: 'joao@example.com', course: 'Biomedicina' },
  scheduling: { date: '2099-07-01', startDateHour: '2099-07-01T14:00:00Z', endDateHour: '2099-07-01T16:00:00Z' },
  advisorProfessor: 'Profa. Maria Souza',
  projectTitle: 'Análise de Amostras',
  description: 'Uso do microscópio para análise de amostras',
  status: 'SCHEDULED',
  termUrl: null,
  equipments: [{ equipmentId: 'eq1', name: 'Microscópio Óptico' }],
  ...overrides,
});

const makeMaterial = (overrides: Partial<Material> = {}): Material => ({
  materialId: 'mat1',
  name: 'Álcool 70%',
  location: 'Armário 3',
  stockQuantity: 1,
  minStock: 5,
  unit: 'Milliliter',
  typeName: 'Reagente',
  isLowStock: true,
  ...overrides,
});

const makeMaintenanceRequest = (overrides: Partial<MaintenanceRequest> = {}): MaintenanceRequest => ({
  maintenanceRequestId: 'mr1',
  equipmentId: 'eq1',
  equipmentName: 'Microscópio Óptico',
  description: 'Revisão',
  problemDescription: 'Não liga',
  status: 'Requested',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: null,
  ...overrides,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let schedulesServiceMock: Mocked<Pick<SchedulesService, 'getPendingSchedules' | 'getSchedules'>>;
  let materialsServiceMock: Mocked<Pick<MaterialsService, 'getMaterials'>>;
  let maintenanceServiceMock: Mocked<Pick<MaintenanceService, 'getMaintenanceRequests'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    schedulesServiceMock = {
      getPendingSchedules: vi.fn().mockReturnValue(of(paged([makeSchedule({ id: 'p1', status: 'PENDING' })]))),
      getSchedules: vi.fn().mockReturnValue(of(paged([makeSchedule()]))),
    };
    materialsServiceMock = {
      getMaterials: vi.fn().mockReturnValue(of(paged([makeMaterial()]))),
    };
    maintenanceServiceMock = {
      getMaintenanceRequests: vi.fn().mockReturnValue(of(paged([makeMaintenanceRequest()]))),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
  });

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: SchedulesService, useValue: schedulesServiceMock },
        { provide: MaterialsService, useValue: materialsServiceMock },
        { provide: MaintenanceService, useValue: maintenanceServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('carrega os dados de todas as seções quando o usuário possui todas as permissões', async () => {
    await setup();

    expect(schedulesServiceMock.getPendingSchedules).toHaveBeenCalled();
    expect(schedulesServiceMock.getSchedules).toHaveBeenCalledWith({ pageSize: 100 });
    expect(materialsServiceMock.getMaterials).toHaveBeenCalledWith({ pageSize: 100 });
    expect(maintenanceServiceMock.getMaintenanceRequests).toHaveBeenCalledWith({ pageSize: 100 });

    expect((component as any).pendingSchedulesCount()).toBe(1);
    expect((component as any).lowStockMaterials().length).toBe(1);
    expect((component as any).maintenanceCount()).toBe(1);
    expect((component as any).upcomingSchedules().length).toBe(1);
    expect((component as any).pendingSchedulesLoading()).toBe(false);
  });

  it('não carrega seções cuja permissão o usuário não possui', async () => {
    authServiceMock.hasPermission.mockReturnValue(false);
    await setup();

    expect(schedulesServiceMock.getPendingSchedules).not.toHaveBeenCalled();
    expect(schedulesServiceMock.getSchedules).not.toHaveBeenCalled();
    expect(materialsServiceMock.getMaterials).not.toHaveBeenCalled();
    expect(maintenanceServiceMock.getMaintenanceRequests).not.toHaveBeenCalled();

    const cards = fixture.nativeElement.querySelectorAll('.bg-card');
    expect(cards.length).toBe(0);
  });

  it('exibe skeleton enquanto os dados estão carregando', async () => {
    const pending = new Subject<PagedResponse<Schedule>>();
    const overview = new Subject<PagedResponse<Schedule>>();
    const materials = new Subject<PagedResponse<Material>>();
    const maintenance = new Subject<PagedResponse<MaintenanceRequest>>();
    schedulesServiceMock.getPendingSchedules.mockReturnValue(pending.asObservable());
    schedulesServiceMock.getSchedules.mockReturnValue(overview.asObservable());
    materialsServiceMock.getMaterials.mockReturnValue(materials.asObservable());
    maintenanceServiceMock.getMaintenanceRequests.mockReturnValue(maintenance.asObservable());

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: SchedulesService, useValue: schedulesServiceMock },
        { provide: MaterialsService, useValue: materialsServiceMock },
        { provide: MaintenanceService, useValue: maintenanceServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect((component as any).pendingSchedulesLoading()).toBe(true);
    expect((component as any).lowStockLoading()).toBe(true);
    expect((component as any).maintenanceLoading()).toBe(true);
    expect((component as any).approvedSchedulesLoading()).toBe(true);

    const skeletons = fixture.nativeElement.querySelectorAll('p-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);

    pending.next(paged([]));
    overview.next(paged([]));
    materials.next(paged([]));
    maintenance.next(paged([]));
    fixture.detectChanges();

    expect((component as any).pendingSchedulesLoading()).toBe(false);
    expect((component as any).lowStockLoading()).toBe(false);
    expect((component as any).maintenanceLoading()).toBe(false);
    expect((component as any).approvedSchedulesLoading()).toBe(false);
  });

  it('exibe "Nenhum alerta." quando não há materiais em falta', async () => {
    materialsServiceMock.getMaterials.mockReturnValue(of(paged([])));
    await setup();

    expect(fixture.nativeElement.textContent).toContain('Nenhum alerta.');
  });

  it('exibe "Sem agendamentos próximos." quando não há agendamentos aprovados futuros', async () => {
    schedulesServiceMock.getSchedules.mockReturnValue(of(paged([makeSchedule({ status: 'PENDING' })])));
    await setup();

    expect(fixture.nativeElement.textContent).toContain('Sem agendamentos próximos.');
  });

  it('calcula a contagem de agendamentos aprovados do mês corrente', async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    schedulesServiceMock.getSchedules.mockReturnValue(
      of(
        paged([
          makeSchedule({ id: 'a', status: 'SCHEDULED', scheduling: { date: thisMonth, startDateHour: `${thisMonth}T10:00:00Z`, endDateHour: `${thisMonth}T11:00:00Z` } }),
          makeSchedule({ id: 'b', status: 'PENDING', scheduling: { date: thisMonth, startDateHour: `${thisMonth}T10:00:00Z`, endDateHour: `${thisMonth}T11:00:00Z` } }),
        ]),
      ),
    );
    await setup();

    expect((component as any).approvedSchedulesCount()).toBe(1);
  });

  it('calcula a contagem de equipamentos em manutenção considerando Requested e InProgress', async () => {
    maintenanceServiceMock.getMaintenanceRequests.mockReturnValue(
      of(
        paged([
          makeMaintenanceRequest({ maintenanceRequestId: 'r1', status: 'Requested' }),
          makeMaintenanceRequest({ maintenanceRequestId: 'r2', status: 'InProgress' }),
          makeMaintenanceRequest({ maintenanceRequestId: 'r3', status: 'Done' }),
          makeMaintenanceRequest({ maintenanceRequestId: 'r4', status: 'Cancelled' }),
        ]),
      ),
    );
    await setup();

    expect((component as any).maintenanceCount()).toBe(2);
  });
});
