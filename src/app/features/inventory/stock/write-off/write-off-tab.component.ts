import { Component, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { MaterialsService } from '../../materials/materials.service';
import { Material } from '../../../../shared/models/inventory.model';
import { MaterialUnitLabelPipe } from '../../materials/material-unit-label.pipe';
import { CartService } from './cart/cart.service';
import { CartComponent } from './cart/cart.component';

@Component({
  selector: 'app-write-off-tab',
  imports: [FormsModule, TableModule, Button, InputText, InputNumber, IconField, InputIcon, MaterialUnitLabelPipe, CartComponent],
  templateUrl: './write-off-tab.component.html',
})
export class WriteOffTabComponent {
  private readonly materialsService = inject(MaterialsService);
  private readonly messageService = inject(MessageService);
  protected readonly cart = inject(CartService);

  protected readonly materials = signal<Material[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  // Quantidade a adicionar ao carrinho, por material — padrão 1
  private readonly addQuantities = signal<Record<string, number>>({});

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadMaterials();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  // Permite que o componente pai (StockWriteOffComponent) force uma recarga ao trocar de aba
  reload(): void {
    this.loadMaterials();
  }

  protected loadMaterials(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);

    this.loading.set(true);
    this.materialsService
      .getMaterials({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined })
      .subscribe({
        next: res => {
          this.materials.set(res.data);
          this.totalRecords.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar os materiais.',
          });
        },
      });
  }

  protected getAddQuantity(materialId: string): number {
    return this.addQuantities()[materialId] ?? 1;
  }

  protected setAddQuantity(materialId: string, value: number | null): void {
    this.addQuantities.update(q => ({ ...q, [materialId]: Math.max(1, Math.floor(value ?? 1)) }));
  }

  protected addToCart(material: Material): void {
    const quantity = this.getAddQuantity(material.materialId);
    const result = this.cart.addOrIncrement(material, quantity);

    if (result === 'max-reached') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Carrinho',
        detail: `Estoque máximo de "${material.name}" já está no carrinho.`,
      });
      return;
    }

    this.setAddQuantity(material.materialId, 1);
  }
}
