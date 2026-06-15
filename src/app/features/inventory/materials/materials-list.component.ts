import { Component, inject, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
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
import { DataTableContainerComponent } from '../../../shared/components/data-table-container/data-table-container.component';
import { TableSortCycle } from '../../../shared/utils/table-sort-cycle';

@Component({
  selector: 'app-materials-list',
  imports: [
    FormsModule,
    TableModule, Button, Toast, InputText, IconField, InputIcon,
    PageHeaderComponent, MaterialFormComponent, MaterialUnitLabelPipe, DataTableContainerComponent,
  ],
  templateUrl: './materials-list.component.html',
  providers: [MessageService],
})
export class MaterialsListComponent {
  private readonly materialsService = inject(MaterialsService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly materials = signal<Material[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly dialogVisible = signal(false);
  protected readonly selectedMaterial = signal<Material | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);
  protected readonly highlightedMaterialId = signal<string | null>(null);

  private readonly searchSubject = new Subject<string>();
  private readonly sortCycle = new TableSortCycle();

  @ViewChild('dt') private table?: Table;

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadMaterials();
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const highlightId = params.get('highlight');
      if (!highlightId) return;

      this.materialsService.getMaterialById(highlightId).subscribe({
        next: material => {
          this.highlightedMaterialId.set(material.materialId);
          this.searchQuery.set(material.name);
          this.first.set(0);
          this.loadMaterials();
          setTimeout(() => this.highlightedMaterialId.set(null), 3000);
        },
        error: () => {},
      });
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
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

    const { sortBy, sortDirection } = this.sortCycle.resolve(event, this.table);

    this.loading.set(true);
    this.materialsService
      .getMaterials({
        pageNumber: page,
        pageSize: size,
        search: this.searchQuery() || undefined,
        sortBy,
        sortDirection,
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
