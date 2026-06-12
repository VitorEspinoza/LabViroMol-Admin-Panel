import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeAll, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { MaterialFormComponent } from './material-form.component';
import { MaterialsService } from '../materials.service';
import { MaterialTypesService } from '../../material-types/material-types.service';
import { CreatedResponse, Material, MaterialType } from '../../../../shared/models/inventory.model';
import { PagedResponse } from '../../../../shared/models/pagination.model';

const mockMaterial: Material = {
  materialId: 'mat1',
  name: 'Álcool 70%',
  location: 'Armário A1',
  stockQuantity: 500,
  minStock: 100,
  unit: 'Milliliter',
  typeId: 'mt1',
  typeName: 'Reagentes',
  isLowStock: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: null,
};

const typesResponse: PagedResponse<MaterialType> = {
  data: [
    { materialTypeId: 'mt1', name: 'Reagentes', active: true },
    { materialTypeId: 'mt2', name: 'Descontinuado', active: false },
  ],
  currentPage: 1,
  pageSize: 100,
  totalPages: 1,
  totalCount: 2,
};

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MaterialFormComponent', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  let fixture: ComponentFixture<MaterialFormComponent>;
  let component: MaterialFormComponent;
  let materialsServiceMock: Mocked<Pick<MaterialsService, 'createMaterial' | 'updateMaterial' | 'getMaterialById'>>;
  let materialTypesServiceMock: Mocked<Pick<MaterialTypesService, 'getTypes'>>;
  let messageServiceMock: Mocked<Pick<MessageService, 'add'>>;

  beforeEach(async () => {
    materialsServiceMock = {
      createMaterial: vi.fn(),
      updateMaterial: vi.fn(),
      getMaterialById: vi.fn().mockReturnValue(of(mockMaterial)),
    };
    materialTypesServiceMock = {
      getTypes: vi.fn().mockReturnValue(of(typesResponse)),
    };
    messageServiceMock = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MaterialFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MaterialsService, useValue: materialsServiceMock },
        { provide: MaterialTypesService, useValue: materialTypesServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('modo criação', () => {
    it('isEditing retorna false e o cabeçalho é "Novo Material"', () => {
      expect((component as any).isEditing()).toBe(false);
      expect((component as any).dialogHeader()).toBe('Novo Material');
    });

    it('ao abrir o diálogo, reseta o formulário e carrega apenas tipos ativos', () => {
      (component as any).onDialogShow();

      expect(materialTypesServiceMock.getTypes).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 100 });
      expect((component as any).typeOptions()).toEqual([{ label: 'Reagentes', value: 'mt1' }]);
      expect((component as any).form.value.name).toBe('');
      expect((component as any).form.value.typeId).toBe('');
      expect((component as any).form.value.unit).toBe('');
    });

    it('todos os campos estão habilitados', () => {
      (component as any).onDialogShow();
      const form = (component as any).form;

      expect(form.get('typeId').disabled).toBe(false);
      expect(form.get('unit').disabled).toBe(false);
      expect(form.get('stockQuantity').disabled).toBe(false);
    });

    it('não salva quando o formulário é inválido', () => {
      (component as any).onDialogShow();

      (component as any).onSave();

      expect(materialsServiceMock.createMaterial).not.toHaveBeenCalled();
      expect((component as any).form.touched).toBe(true);
    });

    it('chama createMaterial com nome, tipo, unidade, quantidade, mínimo e localização', () => {
      materialsServiceMock.createMaterial.mockReturnValue(of<CreatedResponse>({ id: 'mat-novo' }));
      (component as any).onDialogShow();

      (component as any).form.setValue({
        name: 'Luvas Nitrílicas',
        typeId: 'mt1',
        unit: 'Piece',
        stockQuantity: 200,
        minStock: 50,
        location: 'Armário B2',
      });

      (component as any).onSave();

      expect(materialsServiceMock.createMaterial).toHaveBeenCalledWith({
        name: 'Luvas Nitrílicas',
        location: 'Armário B2',
        minStock: 50,
        stockQuantity: 200,
        unit: 'Piece',
        typeId: 'mt1',
      });
      expect((component as any).visible()).toBe(false);
      expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('exibe toast de erro quando a criação falha', () => {
      materialsServiceMock.createMaterial.mockReturnValue(
        throwError(() => ({ status: 422, error: { errors: ['Tipo de material informado não existe.'] } })),
      );
      (component as any).onDialogShow();
      (component as any).form.setValue({
        name: 'Luvas Nitrílicas',
        typeId: 'mt1',
        unit: 'Piece',
        stockQuantity: 200,
        minStock: 50,
        location: 'Armário B2',
      });

      (component as any).onSave();

      expect((component as any).saving()).toBe(false);
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Tipo de material informado não existe.' }),
      );
    });
  });

  describe('modo edição', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('material', mockMaterial);
      fixture.detectChanges();
      (component as any).onDialogShow();
    });

    it('isEditing retorna true e o cabeçalho é "Editar Material"', () => {
      expect((component as any).isEditing()).toBe(true);
      expect((component as any).dialogHeader()).toBe('Editar Material');
    });

    it('busca os dados completos do material via getMaterialById', () => {
      expect(materialsServiceMock.getMaterialById).toHaveBeenCalledWith('mat1');
    });

    it('preenche nome, mínimo e localização e exibe o nome do tipo', () => {
      const form = (component as any).form;
      expect(form.get('name').value).toBe('Álcool 70%');
      expect(form.get('minStock').value).toBe(100);
      expect(form.get('location').value).toBe('Armário A1');
      expect((component as any).materialTypeName()).toBe('Reagentes');
    });

    it('desabilita os campos Tipo, Unidade e Quantidade Inicial', () => {
      const form = (component as any).form;
      expect(form.get('typeId').disabled).toBe(true);
      expect(form.get('unit').disabled).toBe(true);
      expect(form.get('stockQuantity').disabled).toBe(true);
    });

    it('chama updateMaterial apenas com nome, localização e estoque mínimo', () => {
      materialsServiceMock.updateMaterial.mockReturnValue(of(undefined));
      const form = (component as any).form;
      form.patchValue({ name: 'Álcool 70% - atualizado', minStock: 150, location: 'Armário A2' });

      (component as any).onSave();

      expect(materialsServiceMock.updateMaterial).toHaveBeenCalledWith('mat1', {
        name: 'Álcool 70% - atualizado',
        location: 'Armário A2',
        minStock: 150,
      });
      expect((component as any).visible()).toBe(false);
    });

    it('não envia typeId nem unit no corpo de atualização', () => {
      materialsServiceMock.updateMaterial.mockReturnValue(of(undefined));

      (component as any).onSave();

      const [, body] = materialsServiceMock.updateMaterial.mock.calls[0];
      expect((body as any).typeId).toBeUndefined();
      expect((body as any).unit).toBeUndefined();
      expect((body as any).stockQuantity).toBeUndefined();
    });

    it('exibe toast de erro quando getMaterialById falha', () => {
      materialsServiceMock.getMaterialById.mockReturnValue(throwError(() => ({ status: 500 })));
      fixture.componentRef.setInput('material', { ...mockMaterial });
      fixture.detectChanges();

      (component as any).onDialogShow();

      expect((component as any).loadingMaterial()).toBe(false);
      expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });
});
