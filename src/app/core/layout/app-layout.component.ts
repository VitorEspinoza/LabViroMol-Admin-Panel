import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent {
  protected readonly sidebarCollapsed = signal(
    typeof window !== 'undefined' && window.innerWidth < 768,
  );
}
