import { Component } from '@angular/core';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-confirm-dialog',
  imports: [ConfirmDialog, Button],
  template: `
    <p-confirmdialog>
      <ng-template #headless let-message let-onAccept="onAccept" let-onReject="onReject">
        <div
          class="rounded-xl border border-border bg-card shadow-lg w-full max-w-[480px] mx-4 overflow-hidden"
          role="alertdialog"
          [attr.aria-labelledby]="'confirm-header'"
          [attr.aria-describedby]="'confirm-message'"
        >
          <div class="flex items-center gap-3 px-6 py-4 border-b border-border">
            <i class="pi pi-exclamation-triangle text-red-500 text-lg" aria-hidden="true"></i>
            <span id="confirm-header" class="font-semibold text-base text-foreground">
              {{ message.header }}
            </span>
          </div>

          <div class="px-6 py-5">
            <p id="confirm-message" class="text-sm text-muted-foreground m-0">{{ message.message }}</p>
          </div>

          <div class="flex justify-end gap-2 px-6 py-4 border-t border-border">
            <!-- Reject first in DOM → recebe foco inicial pelo focusTrap do dialog -->
            <p-button
              [label]="message.rejectLabel || 'Cancelar'"
              [outlined]="true"
              severity="secondary"
              (onClick)="onReject()"
            />
            <!-- Accept (ação destrutiva) sem autofocus -->
            <p-button
              [label]="message.acceptLabel || 'Confirmar'"
              severity="danger"
              (onClick)="onAccept()"
            />
          </div>
        </div>
      </ng-template>
    </p-confirmdialog>
  `,
})
export class ConfirmDialogComponent {}
