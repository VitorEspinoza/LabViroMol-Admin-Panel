import { Component, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Dialog } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { MaterialTypesService } from './material-types.service';
import { MaterialType } from '../../../shared/models/inventory.model';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableContainerComponent } from '../../../shared/components/data-table-container/data-table-container.component';

@Component({
  selector: 'app-material-types-list',
  imports: [
    FormsModule, ReactiveFormsModule,
    TableModule, Button, ToggleSwitch, Toast, InputText, IconField, InputIcon, Dialog,
    PageHeaderComponent, DataTableContainerComponent,
  ],
  templateUrl: './material-types-list.component.html',
  providers: [MessageService],
})
export class MaterialTypesListComponent {
  private readonly materialTypesService = inject(MaterialTypesService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly types = signal<MaterialType[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly searchQuery = signal('');

  private readonly searchSubject = new Subject<string>();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    active: [true],
  });

  protected readonly filteredTypes = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.types();
    return this.types().filter(type => type.name.toLowerCase().includes(query));
  });

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => this.searchQuery.set(q));
    this.loadTypes();
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadTypes(): void {
    this.loading.set(true);
    this.materialTypesService.getTypes({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => {
        this.types.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os tipos de materiais.',
        });
      },
    });
  }

  protected openCreate(): void {
    this.form.reset({ name: '', active: true });
    this.dialogVisible.set(true);
  }

  protected onCancel(): void {
    this.dialogVisible.set(false);
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, active } = this.form.getRawValue();
    this.saving.set(true);
    this.materialTypesService.createType({ name }).subscribe({
      next: res => {
        if (active) {
          this.onCreateSuccess();
          return;
        }
        this.materialTypesService.deactivateType(res.id).subscribe({
          next: () => this.onCreateSuccess(),
          error: () => this.onCreateSuccess(),
        });
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível criar o tipo de material.'),
        });
      },
    });
  }

  protected toggleActive(type: MaterialType): void {
    const wasActive = type.active;
    this.types.update(list =>
      list.map(t => (t.id === type.id ? { ...t, active: !wasActive } : t)),
    );
    const action$ = wasActive
      ? this.materialTypesService.deactivateType(type.id)
      : this.materialTypesService.activateType(type.id);

    action$.subscribe({
      error: err => {
        this.types.update(list =>
          list.map(t => (t.id === type.id ? { ...t, active: wasActive } : t)),
        );
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(
            err,
            `Não foi possível ${wasActive ? 'desativar' : 'ativar'} o tipo de material.`,
          ),
        });
      },
    });
  }

  private onCreateSuccess(): void {
    this.saving.set(false);
    this.dialogVisible.set(false);
    this.loadTypes();
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Tipo de material criado com sucesso.',
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
