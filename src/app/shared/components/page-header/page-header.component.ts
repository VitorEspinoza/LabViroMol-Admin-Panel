import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-muted-foreground">{{ subtitle() }}</p>
        }
      </div>
      <ng-content select="[actions]" />
    </div>
  `,
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>('');
}
