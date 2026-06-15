import { Component } from '@angular/core';

@Component({
  selector: 'app-data-table-container',
  template: `
    <div class="rounded-lg border border-border bg-card p-2 md:p-3">
      <ng-content />
    </div>
  `,
})
export class DataTableContainerComponent {}
