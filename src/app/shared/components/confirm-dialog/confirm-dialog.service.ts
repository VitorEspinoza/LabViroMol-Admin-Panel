import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  accept: () => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly confirmationService = inject(ConfirmationService);

  confirm(options: ConfirmOptions): void {
    this.confirmationService.confirm({
      header: options.header,
      message: options.message,
      acceptLabel: options.acceptLabel ?? 'Confirmar',
      rejectLabel: options.rejectLabel ?? 'Cancelar',
      accept: options.accept,
    });
  }
}
