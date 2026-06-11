import { Component, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Dialog } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { PartnersService } from './partners.service';
import { Partner } from '../../../shared/models/research.model';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-partners-list',
  imports: [
    ReactiveFormsModule,
    TableModule, Button, Toast, InputText, Textarea, IconField, InputIcon, Dialog,
    PageHeaderComponent,
  ],
  templateUrl: './partners-list.component.html',
  providers: [MessageService],
})
export class PartnersListComponent {
  private readonly partnersService = inject(PartnersService);
  private readonly messageService = inject(MessageService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly partners = signal<Partner[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly dialogVisible = signal(false);
  protected readonly editingPartner = signal<Partner | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  private readonly searchSubject = new Subject<string>();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  protected readonly dialogTitle = computed(() =>
    this.editingPartner() ? 'Editar Parceiro' : 'Novo Parceiro',
  );

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadPartners();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadPartners(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);
    this.loading.set(true);
    this.partnersService.getPartners({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined }).subscribe({
      next: res => {
        this.partners.set(res.data);
        this.totalRecords.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os parceiros.',
        });
      },
    });
  }

  protected openCreate(): void {
    this.editingPartner.set(null);
    this.form.reset({ name: '', description: '' });
    this.dialogVisible.set(true);
  }

  protected openEdit(partner: Partner): void {
    this.editingPartner.set(partner);
    this.form.reset({ name: partner.name, description: partner.description ?? '' });
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
    const value = this.form.getRawValue();
    const editing = this.editingPartner();
    this.saving.set(true);

    const request$ = editing
      ? this.partnersService.updatePartner(editing.id, value)
      : this.partnersService.createPartner(value);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.loadPartners();
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: editing ? 'Parceiro atualizado com sucesso.' : 'Parceiro criado com sucesso.',
        });
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(
            err,
            editing ? 'Não foi possível atualizar o parceiro.' : 'Não foi possível criar o parceiro.',
          ),
        });
      },
    });
  }

  protected confirmDelete(partner: Partner): void {
    this.confirmDialogService.confirm({
      header: 'Excluir Parceiro',
      message: `Deseja realmente excluir o parceiro "${partner.name}"?`,
      accept: () => this.deletePartner(partner),
    });
  }

  private deletePartner(partner: Partner): void {
    this.partnersService.deletePartner(partner.id).subscribe({
      next: () => {
        this.loadPartners();
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Parceiro excluído com sucesso.',
        });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível excluir o parceiro.'),
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
