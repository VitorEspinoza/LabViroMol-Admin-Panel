import { computed, Injectable, signal } from '@angular/core';
import { Kit, Material, MaterialUnit } from '../../../../../shared/models/inventory.model';

export interface CartItem {
  materialId: string;
  materialName: string;
  unit: MaterialUnit;
  maxQuantity: number;
  quantity: number;
}

export type AddToCartResult = 'added' | 'incremented' | 'max-reached';

export interface LoadKitResult {
  addedCount: number;
  ignored: string[];
}

// Estado do carrinho — provido por instância em StockPdvComponent (não persiste entre navegações)
@Injectable()
export class CartService {
  readonly items = signal<CartItem[]>([]);
  readonly count = computed(() => this.items().length);

  addOrIncrement(material: Material): AddToCartResult {
    const existing = this.items().find(i => i.materialId === material.materialId);

    if (!existing) {
      this.items.update(items => [
        ...items,
        {
          materialId: material.materialId,
          materialName: material.name,
          unit: material.unit,
          maxQuantity: material.stockQuantity,
          quantity: 1,
        },
      ]);
      return 'added';
    }

    if (existing.quantity >= existing.maxQuantity) return 'max-reached';

    this.items.update(items =>
      items.map(i => (i.materialId === material.materialId ? { ...i, quantity: i.quantity + 1 } : i)),
    );
    return 'incremented';
  }

  increment(materialId: string): void {
    this.items.update(items =>
      items.map(i => (i.materialId === materialId && i.quantity < i.maxQuantity ? { ...i, quantity: i.quantity + 1 } : i)),
    );
  }

  decrement(materialId: string): void {
    this.items.update(items =>
      items.map(i => (i.materialId === materialId && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i)),
    );
  }

  remove(materialId: string): void {
    this.items.update(items => items.filter(i => i.materialId !== materialId));
  }

  removeMany(materialIds: string[]): void {
    const ids = new Set(materialIds);
    this.items.update(items => items.filter(i => !ids.has(i.materialId)));
  }

  clear(): void {
    this.items.set([]);
  }

  // Carrega materiais de um kit no carrinho; materiais sem estoque (>0) são ignorados
  loadKit(kit: Kit, materialsById: Map<string, Material>): LoadKitResult {
    const ignored: string[] = [];
    let addedCount = 0;

    for (const kitItem of kit.materials) {
      const material = materialsById.get(kitItem.materialId);
      if (!material || material.stockQuantity <= 0) {
        ignored.push(kitItem.materialName);
        continue;
      }

      const quantity = Math.min(kitItem.quantity, material.stockQuantity);
      const existing = this.items().find(i => i.materialId === kitItem.materialId);

      if (existing) {
        this.items.update(items =>
          items.map(i =>
            i.materialId === kitItem.materialId
              ? { ...i, quantity: Math.min(i.quantity + quantity, i.maxQuantity) }
              : i,
          ),
        );
      } else {
        this.items.update(items => [
          ...items,
          {
            materialId: kitItem.materialId,
            materialName: material.name,
            unit: material.unit,
            maxQuantity: material.stockQuantity,
            quantity,
          },
        ]);
      }
      addedCount++;
    }

    return { addedCount, ignored };
  }
}
