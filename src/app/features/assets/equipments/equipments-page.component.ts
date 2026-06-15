import { Component, inject } from '@angular/core';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AuthService } from '../../../core/auth/auth.service';
import { EquipmentsListComponent } from './equipments-list/equipments-list.component';
import { MaintenanceListComponent } from '../maintenance/maintenance-list/maintenance-list.component';

@Component({
  selector: 'app-equipments-page',
  imports: [Tabs, TabList, Tab, TabPanels, TabPanel, PageHeaderComponent, EquipmentsListComponent, MaintenanceListComponent],
  templateUrl: './equipments-page.component.html',
})
export class EquipmentsPageComponent {
  protected readonly auth = inject(AuthService);
}
