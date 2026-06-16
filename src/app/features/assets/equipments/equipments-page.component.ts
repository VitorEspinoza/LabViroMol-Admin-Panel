import { Component, inject, viewChild } from '@angular/core';
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

  private readonly equipmentsList = viewChild(EquipmentsListComponent);
  private readonly maintenanceList = viewChild(MaintenanceListComponent);

  protected onTabChange(event: { value: string }): void {
    if (event.value === 'equipments') {
      this.equipmentsList()?.loadEquipments();
    } else if (event.value === 'maintenance') {
      this.maintenanceList()?.loadRequests();
    }
  }
}
