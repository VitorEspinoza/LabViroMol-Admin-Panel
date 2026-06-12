import { Component, inject, output, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';

import { KitsService } from '../../kits/kits.service';
import { MaterialsService } from '../../materials/materials.service';
import { Kit, Material } from '../../../../shared/models/inventory.model';
import { MaterialUnitLabelPipe } from '../../materials/material-unit-label.pipe';
import { CartService } from '../pdv/cart/cart.service';

@Component({
  selector: 'app-kits-tab',
  imports: [Button, MaterialUnitLabelPipe],
  templateUrl: './kits-tab.component.html',
})
export class KitsTabComponent {
  private readonly kitsService = inject(KitsService);
  private readonly materialsService = inject(MaterialsService);
  private readonly cart = inject(CartService);
  private readonly messageService = inject(MessageService);

  readonly kitLoaded = output<void>();

  protected readonly kits = signal<Kit[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingKitId = signal<string | null>(null);

  constructor() {
    this.loadKits();
  }

  private loadKits(): void {
    this.loading.set(true);
    this.kitsService.getKits({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => {
        this.kits.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os kits.' });
      },
    });
  }

  protected loadIntoCart(kit: Kit): void {
    this.loadingKitId.set(kit.kitId);
    this.materialsService.getMaterials({ pageNumber: 1, pageSize: 1000 }).subscribe({
      next: res => {
        this.loadingKitId.set(null);
        const materialsById = new Map<string, Material>(res.data.map(m => [m.materialId, m]));
        const { addedCount, ignored } = this.cart.loadKit(kit, materialsById);

        if (addedCount > 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: `Kit "${kit.name}" carregado no carrinho.`,
          });
          this.kitLoaded.emit();
        }

        if (ignored.length > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Atenção',
            detail: `Materiais indisponíveis ignorados: ${ignored.join(', ')}.`,
          });
        }
      },
      error: () => {
        this.loadingKitId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os materiais do kit.',
        });
      },
    });
  }
}
