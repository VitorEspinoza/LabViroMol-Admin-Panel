import { describe, expect, it, beforeEach } from 'vitest';

import { CartService } from './cart.service';
import { Kit, Material } from '../../../../../shared/models/inventory.model';

const makeMaterial = (overrides: Partial<Material> = {}): Material => ({
  materialId: 'mat1',
  name: 'Álcool 70%',
  location: 'Armário A1',
  stockQuantity: 10,
  minStock: 2,
  unit: 'Milliliter',
  typeName: 'Reagentes',
  isLowStock: false,
  ...overrides,
});

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    service = new CartService();
  });

  describe('addOrIncrement', () => {
    it('adiciona um novo material com quantidade 1', () => {
      const result = service.addOrIncrement(makeMaterial());

      expect(result).toBe('added');
      expect(service.items()).toEqual([
        { materialId: 'mat1', materialName: 'Álcool 70%', unit: 'Milliliter', maxQuantity: 10, quantity: 1 },
      ]);
    });

    it('incrementa a quantidade quando o material já está no carrinho', () => {
      service.addOrIncrement(makeMaterial());
      const result = service.addOrIncrement(makeMaterial());

      expect(result).toBe('incremented');
      expect(service.items()[0].quantity).toBe(2);
    });

    it('retorna max-reached e não incrementa quando atinge o estoque disponível', () => {
      const material = makeMaterial({ stockQuantity: 1 });
      service.addOrIncrement(material);
      const result = service.addOrIncrement(material);

      expect(result).toBe('max-reached');
      expect(service.items()[0].quantity).toBe(1);
    });

    it('adiciona um novo material com a quantidade informada', () => {
      const result = service.addOrIncrement(makeMaterial({ stockQuantity: 100 }), 25);

      expect(result).toBe('added');
      expect(service.items()[0].quantity).toBe(25);
    });

    it('limita a quantidade informada ao estoque disponível ao adicionar', () => {
      service.addOrIncrement(makeMaterial({ stockQuantity: 10 }), 50);

      expect(service.items()[0].quantity).toBe(10);
    });

    it('incrementa pela quantidade informada quando o material já está no carrinho', () => {
      service.addOrIncrement(makeMaterial({ stockQuantity: 100 }), 10);
      const result = service.addOrIncrement(makeMaterial({ stockQuantity: 100 }), 5);

      expect(result).toBe('incremented');
      expect(service.items()[0].quantity).toBe(15);
    });

    it('limita o incremento pela quantidade informada ao maxQuantity', () => {
      service.addOrIncrement(makeMaterial({ stockQuantity: 10 }), 8);
      service.addOrIncrement(makeMaterial({ stockQuantity: 10 }), 5);

      expect(service.items()[0].quantity).toBe(10);
    });
  });

  describe('setQuantity', () => {
    it('define a quantidade respeitando o limite de maxQuantity', () => {
      service.addOrIncrement(makeMaterial({ stockQuantity: 10 }));

      service.setQuantity('mat1', 7);
      expect(service.items()[0].quantity).toBe(7);

      service.setQuantity('mat1', 50);
      expect(service.items()[0].quantity).toBe(10);
    });

    it('não permite quantidade menor que 1', () => {
      service.addOrIncrement(makeMaterial({ stockQuantity: 10 }));

      service.setQuantity('mat1', 0);
      expect(service.items()[0].quantity).toBe(1);
    });
  });

  describe('increment / decrement', () => {
    it('increment não excede maxQuantity', () => {
      service.addOrIncrement(makeMaterial({ stockQuantity: 1 }));
      service.increment('mat1');

      expect(service.items()[0].quantity).toBe(1);
    });

    it('decrement não vai abaixo de 1', () => {
      service.addOrIncrement(makeMaterial());
      service.decrement('mat1');

      expect(service.items()[0].quantity).toBe(1);
    });

    it('decrement reduz a quantidade quando maior que 1', () => {
      service.addOrIncrement(makeMaterial());
      service.increment('mat1');
      service.decrement('mat1');

      expect(service.items()[0].quantity).toBe(1);
    });
  });

  describe('remove / removeMany / clear', () => {
    it('remove um item específico', () => {
      service.addOrIncrement(makeMaterial({ materialId: 'mat1' }));
      service.addOrIncrement(makeMaterial({ materialId: 'mat2' }));
      service.remove('mat1');

      expect(service.items().map(i => i.materialId)).toEqual(['mat2']);
    });

    it('removeMany remove vários itens', () => {
      service.addOrIncrement(makeMaterial({ materialId: 'mat1' }));
      service.addOrIncrement(makeMaterial({ materialId: 'mat2' }));
      service.addOrIncrement(makeMaterial({ materialId: 'mat3' }));
      service.removeMany(['mat1', 'mat3']);

      expect(service.items().map(i => i.materialId)).toEqual(['mat2']);
    });

    it('clear esvazia o carrinho', () => {
      service.addOrIncrement(makeMaterial());
      service.clear();

      expect(service.items()).toEqual([]);
      expect(service.count()).toBe(0);
    });
  });

  describe('loadKit', () => {
    const kit: Kit = {
      kitId: 'kit1',
      name: 'Kit PCR Básico',
      description: 'Materiais essenciais',
      materials: [
        { materialId: 'mat1', materialName: 'Álcool 70%', quantity: 2, unit: 'Milliliter' },
        { materialId: 'mat2', materialName: 'Luvas', quantity: 5, unit: 'Piece' },
      ],
    };

    it('adiciona materiais disponíveis e ignora materiais sem estoque', () => {
      const materialsById = new Map<string, Material>([
        ['mat1', makeMaterial({ materialId: 'mat1', name: 'Álcool 70%', stockQuantity: 10, unit: 'Milliliter' })],
        ['mat2', makeMaterial({ materialId: 'mat2', name: 'Luvas', stockQuantity: 0, unit: 'Piece' })],
      ]);

      const result = service.loadKit(kit, materialsById);

      expect(result.addedCount).toBe(1);
      expect(result.ignored).toEqual(['Luvas']);
      expect(service.items()).toEqual([
        { materialId: 'mat1', materialName: 'Álcool 70%', unit: 'Milliliter', maxQuantity: 10, quantity: 2 },
      ]);
    });

    it('ignora materiais que não existem mais na listagem atual', () => {
      const materialsById = new Map<string, Material>([
        ['mat1', makeMaterial({ materialId: 'mat1', name: 'Álcool 70%', stockQuantity: 10, unit: 'Milliliter' })],
      ]);

      const result = service.loadKit(kit, materialsById);

      expect(result.addedCount).toBe(1);
      expect(result.ignored).toEqual(['Luvas']);
    });

    it('limita a quantidade carregada ao estoque disponível', () => {
      const materialsById = new Map<string, Material>([
        ['mat1', makeMaterial({ materialId: 'mat1', name: 'Álcool 70%', stockQuantity: 1, unit: 'Milliliter' })],
        ['mat2', makeMaterial({ materialId: 'mat2', name: 'Luvas', stockQuantity: 10, unit: 'Piece' })],
      ]);

      service.loadKit(kit, materialsById);

      expect(service.items().find(i => i.materialId === 'mat1')?.quantity).toBe(1);
    });

    it('mescla com itens já existentes no carrinho, respeitando maxQuantity', () => {
      service.addOrIncrement(makeMaterial({ materialId: 'mat1', name: 'Álcool 70%', stockQuantity: 5, unit: 'Milliliter' }));
      service.increment('mat1');
      service.increment('mat1');

      const materialsById = new Map<string, Material>([
        ['mat1', makeMaterial({ materialId: 'mat1', name: 'Álcool 70%', stockQuantity: 5, unit: 'Milliliter' })],
        ['mat2', makeMaterial({ materialId: 'mat2', name: 'Luvas', stockQuantity: 10, unit: 'Piece' })],
      ]);

      service.loadKit(kit, materialsById);

      // 3 (carrinho) + 2 (kit) = 5, dentro do maxQuantity de 5
      expect(service.items().find(i => i.materialId === 'mat1')?.quantity).toBe(5);
    });
  });
});
