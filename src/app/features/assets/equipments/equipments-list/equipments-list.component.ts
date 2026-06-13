import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { EquipmentsService } from '../equipments.service';
import { Equipment } from '../../../../shared/models/assets.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/environment';
import { EquipmentFormComponent } from '../equipment-form/equipment-form.component';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-equipments-list',
  imports: [FormsModule, TableModule, Button, InputText, IconField, InputIcon, EquipmentFormComponent],
  templateUrl: './equipments-list.component.html',
})
export class EquipmentsListComponent {
  private readonly equipmentsService = inject(EquipmentsService);
  private readonly messageService = inject(MessageService);
  protected readonly auth = inject(AuthService);

  protected readonly equipments = signal<Equipment[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly dialogVisible = signal(false);
  protected readonly selectedEquipment = signal<Equipment | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);
  protected readonly uploadingEquipmentId = signal<string | null>(null);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private uploadTargetId: string | null = null;

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadEquipments();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadEquipments(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);

    this.loading.set(true);
    this.equipmentsService
      .getEquipments({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined })
      .subscribe({
        next: res => {
          this.equipments.set(res.data);
          this.totalRecords.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar os equipamentos.',
          });
        },
      });
  }

  protected imageUrlFor(equipment: Equipment): string | null {
    return equipment.imageUrl ? `${environment.apiUrl}${equipment.imageUrl}` : null;
  }

  protected openCreate(): void {
    this.selectedEquipment.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(equipment: Equipment): void {
    this.selectedEquipment.set(equipment);
    this.dialogVisible.set(true);
  }

  protected onFormSaved(): void {
    this.loadEquipments();
  }

  protected triggerImageUpload(equipment: Equipment): void {
    this.uploadTargetId = equipment.equipmentId;
    this.fileInput()?.nativeElement.click();
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const targetId = this.uploadTargetId;
    input.value = '';
    this.uploadTargetId = null;

    if (!file || !targetId) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erro',
        detail: 'Formato de arquivo inválido. Envie uma imagem JPG, PNG ou WEBP.',
      });
      return;
    }

    this.uploadingEquipmentId.set(targetId);
    this.equipmentsService.uploadImage(targetId, file).subscribe({
      next: () => {
        this.uploadingEquipmentId.set(null);
        this.loadEquipments();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Imagem enviada com sucesso.' });
      },
      error: err => {
        this.uploadingEquipmentId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível enviar a imagem.'),
        });
      },
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
