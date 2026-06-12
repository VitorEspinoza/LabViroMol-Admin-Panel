import { Component, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { MaterialsService } from './materials.service';
import { Material } from '../../../shared/models/inventory.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MaterialFormComponent } from './material-form/material-form.component';
import { MaterialUnitLabelPipe } from './material-unit-label.pipe';

@Component({
  selector: 'app-materials-list',
  imports: [
    FormsModule,
    TableModule, Button, Toast, InputText, IconField, InputIcon,
    PageHeaderComponent, MaterialFormComponent, MaterialUnitLabelPipe,
  ],
  templateUrl: './materials-list.component.html',
  providers: [MessageService],
})
export class MaterialsListComponent {
  private readonly materialsService = inject(MaterialsService);
  private readonly messageService = inject(MessageService);
  protected readonly auth = inject(AuthService);

  protected readonly materials = signal<Material[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly dialogVisible = signal(false);
  protected readonly selectedMaterial = signal<Material | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  private readonly searchSubject = new Subject<string>();
  private sortField: string | null = null;
  private sortOrder: number | null = null;

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadMaterials();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadMaterials(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);

    if (event) {
      this.sortField = typeof event.sortField === 'string' ? event.sortField : null;
      this.sortOrder = event.sortOrder ?? null;
    }

    this.loading.set(true);
    this.materialsService
      .getMaterials({
        pageNumber: page,
        pageSize: size,
        search: this.searchQuery() || undefined,
        sortBy: this.sortField ?? undefined,
        sortDirection: this.sortField ? (this.sortOrder === -1 ? 'desc' : 'asc') : undefined,
      })
      .subscribe({
        next: res => {
          this.materials.set(res.data);
          this.totalRecords.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar os materiais.',
          });
        },
      });
  }

  protected openCreate(): void {
    this.selectedMaterial.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(material: Material): void {
    this.selectedMaterial.set(material);
    this.dialogVisible.set(true);
  }

  protected onFormSaved(): void {
    this.loadMaterials();
  }
}
