import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { EquipmentsListComponent } from './equipments-list.component';
import { EquipmentsService } from '../equipments.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Equipment } from '../../../../shared/models/assets.model';
import { PagedResponse } from '../../../../shared/models/pagination.model';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';

const makeEquipment = (overrides: Partial<Equipment> = {}): Equipment => ({
  equipmentId: 'eq1',
  name: 'Microscópio Óptico',
  brand: 'Olympus',
  model: 'CX23',
  code: 'PAT-001',
  description: 'Microscópio para análises de rotina',
  imageUrl: null,
  location: 'Laboratório 1',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: null,
  ...overrides,
});

const pagedEquipments = (equipments: Equipment[]): PagedResponse<Equipment> => ({
  data: equipments,
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalCount: equipments.length,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('EquipmentsListComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<EquipmentsListComponent>;
  let component: EquipmentsListComponent;
  let equipmentsServiceMock: Mocked<Pick<EquipmentsService, 'getEquipments' | 'getEquipmentById' | 'createEquipment' | 'updateEquipment' | 'uploadImage'>>;
  let authServiceMock: { hasPermission: ReturnType<typeof vi.fn> };
  let confirmDialogServiceMock: { confirm: ReturnType<typeof vi.fn> };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [EquipmentsListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: EquipmentsService, useValue: equipmentsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EquipmentsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    equipmentsServiceMock = {
      getEquipments: vi.fn().mockReturnValue(of(pagedEquipments([makeEquipment()]))),
      getEquipmentById: vi.fn(),
      createEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      uploadImage: vi.fn(),
    };
    authServiceMock = { hasPermission: vi.fn().mockReturnValue(true) };
    confirmDialogServiceMock = { confirm: vi.fn() };
  });

  it('deve criar o componente e carregar os equipamentos ao inicializar', async () => {
    await setup();

    expect(equipmentsServiceMock.getEquipments).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10, search: undefined });
    expect((component as any).equipments().length).toBe(1);
    expect((component as any).loading()).toBe(false);
  });

  describe('miniatura de imagem', () => {
    it('exibe a imagem quando o equipamento possui imageUrl', async () => {
      await setup();
      (component as any).equipments.set([makeEquipment({ imageUrl: '/images/equipments/microscopio.jpg' })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      const img = compiled.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('http://localhost:5085/images/equipments/microscopio.jpg');
    });

    it('exibe um placeholder quando o equipamento não possui imageUrl', async () => {
      await setup();
      (component as any).equipments.set([makeEquipment({ imageUrl: null })]);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('img')).toBeFalsy();
      expect(compiled.querySelector('.pi-image')).toBeTruthy();
    });
  });

  describe('botão Adicionar Foto', () => {
    it('é exibido quando o usuário possui Assets.Equipments.Manage', async () => {
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).toContain('Adicionar Foto');
    });

    it('é ocultado quando o usuário não possui Assets.Equipments.Manage', async () => {
      authServiceMock.hasPermission.mockReturnValue(false);
      await setup();

      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Adicionar Foto');
    });
  });

  describe('upload de imagem', () => {
    it('envia o arquivo selecionado e recarrega a lista ao concluir', async () => {
      equipmentsServiceMock.uploadImage.mockReturnValue(of(undefined));
      await setup();
      equipmentsServiceMock.getEquipments.mockClear();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      const equipment = makeEquipment();
      (component as any).triggerImageUpload(equipment);

      const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
      const input = { files: [file], value: '' } as unknown as HTMLInputElement;
      (component as any).onImageSelected({ target: input } as unknown as Event);

      expect(equipmentsServiceMock.uploadImage).toHaveBeenCalledWith('eq1', file);
      expect(equipmentsServiceMock.getEquipments).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Imagem enviada com sucesso.' }));
    });

    it('exibe toast de erro e não faz upload quando o tipo de arquivo é inválido', async () => {
      await setup();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      const equipment = makeEquipment();
      (component as any).triggerImageUpload(equipment);

      const file = new File(['conteudo'], 'documento.pdf', { type: 'application/pdf' });
      const input = { files: [file], value: '' } as unknown as HTMLInputElement;
      (component as any).onImageSelected({ target: input } as unknown as Event);

      expect(equipmentsServiceMock.uploadImage).not.toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Formato de arquivo inválido. Envie uma imagem JPG, PNG ou WEBP.' }),
      );
    });

    it('exibe toast de erro do servidor quando o upload falha', async () => {
      equipmentsServiceMock.uploadImage.mockReturnValue(
        throwError(() => ({ status: 422, error: { errors: ['Formato de arquivo inválido.'] } })),
      );
      await setup();
      const messageService = fixture.debugElement.injector.get(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      const equipment = makeEquipment();
      (component as any).triggerImageUpload(equipment);

      const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
      const input = { files: [file], value: '' } as unknown as HTMLInputElement;
      (component as any).onImageSelected({ target: input } as unknown as Event);

      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'Formato de arquivo inválido.' }));
    });
  });

  describe('edição', () => {
    it('abre o diálogo de edição com o equipamento selecionado', async () => {
      await setup();
      const equipment = makeEquipment();
      (component as any).openEdit(equipment);

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).selectedEquipment()).toEqual(equipment);
    });

    it('abre o diálogo de criação sem equipamento selecionado', async () => {
      await setup();
      (component as any).openCreate();

      expect((component as any).dialogVisible()).toBe(true);
      expect((component as any).selectedEquipment()).toBeNull();
    });
  });
});
