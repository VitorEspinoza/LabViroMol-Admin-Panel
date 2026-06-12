import { Component, inject, signal } from '@angular/core';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AuthService } from '../../../core/auth/auth.service';
import { PdvTabComponent } from './pdv/pdv-tab.component';
import { KitsTabComponent } from './kits/kits-tab.component';
import { CartService } from './pdv/cart/cart.service';

@Component({
  selector: 'app-stock-pdv',
  imports: [Tabs, TabList, Tab, TabPanels, TabPanel, Toast, PageHeaderComponent, PdvTabComponent, KitsTabComponent],
  templateUrl: './stock-pdv.component.html',
  providers: [MessageService, CartService],
})
export class StockPdvComponent {
  protected readonly auth = inject(AuthService);
  protected readonly activeTab = signal<string | number | undefined>('pdv');

  protected goToPdvTab(): void {
    this.activeTab.set('pdv');
  }
}
