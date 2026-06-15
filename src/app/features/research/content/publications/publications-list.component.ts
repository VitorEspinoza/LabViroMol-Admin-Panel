import { Component, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { PublicationsService } from '../../publications/publications.service';
import { PublicationSummary } from '../../../../shared/models/research.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PublicationFormComponent } from './publication-form/publication-form.component';
import { DataTableContainerComponent } from '../../../../shared/components/data-table-container/data-table-container.component';

@Component({
  selector: 'app-publications-list',
  imports: [
    DatePipe,
    TableModule, Button, Toast, InputText, IconField, InputIcon,
    PublicationFormComponent, DataTableContainerComponent,
  ],
  templateUrl: './publications-list.component.html',
  providers: [MessageService],
})
export class PublicationsListComponent {
  private readonly publicationsService = inject(PublicationsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  protected readonly auth = inject(AuthService);

  protected readonly publications = signal<PublicationSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  protected readonly formVisible = signal(false);
  protected readonly editingPublicationId = signal<string | null>(null);

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadPublications();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadPublications(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);
    this.loading.set(true);
    this.publicationsService.getPublications({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined }).subscribe({
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
