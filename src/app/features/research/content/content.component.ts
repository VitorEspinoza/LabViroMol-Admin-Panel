import { Component } from '@angular/core';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';

import { ProjectsListComponent } from './projects/projects-list.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-content',
  imports: [Tabs, TabList, Tab, TabPanels, TabPanel, ProjectsListComponent, PageHeaderComponent],
  templateUrl: './content.component.html',
})
export class ContentComponent {}
