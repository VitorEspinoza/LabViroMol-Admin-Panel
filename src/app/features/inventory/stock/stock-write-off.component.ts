import { Component, inject, signal, viewChild } from '@angular/core';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AuthService } from '../../../core/auth/auth.service';
import { WriteOffTabComponent } from './write-off/write-off-tab.component';
import { KitsTabComponent } from './kits/kits-tab.component';
import { CartService } from './write-off/cart/cart.service';

@Component({
  selector: 'app-stock-write-off',
  imports: [Tabs, TabList, Tab, TabPanels, TabPanel, Toast, PageHeaderComponent, WriteOffTabComponent, KitsTabComponent],
  templateUrl: './stock-write-off.component.html',
  providers: [MessageService, CartService],
})
export class StockWriteOffComponent {
  protected readonly auth = inject(AuthService);
  protected readonly activeTab = signal<string | number | undefined>('write-off');

  private readonly writeOffTab = viewChild(WriteOffTabComponent);
  private readonly kitsTab = viewChild(KitsTabComponent);

  protected goToWriteOffTab(): void {
    this.activeTab.set('write-off');
    this.writeOffTab()?.reload();
  }

  // Garante que materiais e kits estejam sempre atualizados ao trocar de aba
  protected onTabChange(value: string | number | undefined): void {
    this.activeTab.set(value);

    if (value === 'kits') this.kitsTab()?.reload();
    if (value === 'write-off') this.writeOffTab()?.reload();
  }
}
