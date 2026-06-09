import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ConfirmDialogComponent],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent {
  protected readonly sidebarCollapsed = signal(
    typeof window !== 'undefined' && window.innerWidth < 768,
  );
}
