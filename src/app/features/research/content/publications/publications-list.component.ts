import { Component, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Dialog } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { PublicationsService } from '../../publications/publications.service';
import { PublicationSummary } from '../../../../shared/models/research.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PublicationFormComponent } from './publication-form/publication-form.component';

@Component({
  selector: 'app-publications-list',
  imports: [
    ReactiveFormsModule, DatePipe,
    TableModule, Button, Toast, InputText, IconField, InputIcon, Dialog,
    PublicationFormComponent,
  ],
  templateUrl: './publications-list.component.html',
  providers: [MessageService],
})
export class PublicationsListComponent {
  private readonly publicationsService = inject(PublicationsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly publications = signal<PublicationSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly searchQuery = signal('');

  protected readonly formVisible = signal(false);
  protected readonly editingPublicationId = signal<string | null>(null);

  protected readonly doiDialogVisible = signal(false);
  protected readonly doiSaving = signal(false);
  private readonly doiPublication = signal<PublicationSummary | null>(null);

  private readonly searchSubject = new Subject<string>();
  private lastEvent?: TableLazyLoadEvent;

  protected readonly doiForm = this.fb.nonNullable.group({
    doi: ['', Validators.required],
  });

  protected readonly filteredPublications = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.publications();
    return this.publications().filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        (p.citationName ?? '').toLowerCase().includes(q) ||
        (p.doi ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => this.searchQuery.set(q));
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadPublications(event?: TableLazyLoadEvent): void {
    this.lastEvent = event ?? this.lastEvent;
    const page = this.lastEvent ? Math.floor((this.lastEvent.first ?? 0) / (this.lastEvent.rows ?? 10)) + 1 : 1;
    const size = this.lastEvent?.rows ?? 10;
    this.loading.set(true);
    this.publicationsService.getPublications({ pageNumber: page, pageSize: size }).subscribe({
      next: res => {
        this.publications.set(res.data);
        this.totalRecords.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar as publicações.',
        });
      },
    });
  }

  protected openCreate(): void {
    this.editingPublicationId.set(null);
    this.formVisible.set(true);
  }

  protected openEdit(publication: PublicationSummary): void {
    this.editingPublicationId.set(publication.id);
    this.formVisible.set(true);
  }

  protected onPublicationSaved(): void {
    this.loadPublications();
  }

  protected openAssignDoi(publication: PublicationSummary): void {
    this.doiPublication.set(publication);
    this.doiForm.reset({ doi: '' });
    this.doiDialogVisible.set(true);
  }

  protected onAssignDoiCancel(): void {
    this.doiDialogVisible.set(false);
  }

  protected onAssignDoiSave(): void {
    if (this.doiForm.invalid) {
      this.doiForm.markAllAsTouched();
      return;
    }
    const publication = this.doiPublication();
    if (!publication) return;
    const value = this.doiForm.getRawValue();

    this.doiSaving.set(true);
    this.publicationsService.assignDoi(publication.id, { doi: value.doi }).subscribe({
      next: () => {
        this.doiSaving.set(false);
        this.doiDialogVisible.set(false);
        this.loadPublications();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'DOI atribuído com sucesso.' });
      },
      error: err => {
        this.doiSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível atribuir o DOI.'),
        });
      },
    });
  }

  protected confirmDelete(publication: PublicationSummary): void {
    this.confirmDialogService.confirm({
      header: 'Excluir Publicação',
      message: `Deseja realmente excluir a publicação "${publication.title}"?`,
      accept: () => this.deletePublication(publication),
    });
  }

  private deletePublication(publication: PublicationSummary): void {
    this.publicationsService.deletePublication(publication.id).subscribe({
      next: () => {
        this.loadPublications();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Publicação excluída com sucesso.' });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível excluir a publicação.'),
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
