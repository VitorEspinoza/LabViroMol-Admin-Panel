import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { MultiSelect } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';

import { PublicationsService } from '../../../publications/publications.service';
import { ResearchersService } from '../../../researchers/researchers.service';

interface LinkedResearcher {
  researcherId: string | null;
  name: string;
}

@Component({
  selector: 'app-publication-form',
  imports: [ReactiveFormsModule, FormsModule, DatePipe, Dialog, Button, InputText, Textarea, DatePicker, MultiSelect],
  templateUrl: './publication-form.component.html',
})
export class PublicationFormComponent {
  readonly visible = model(false);
  readonly publicationId = input<string | null>(null);
  readonly saved = output<void>();

  private readonly publicationsService = inject(PublicationsService);
  private readonly researchersService = inject(ResearchersService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly researcherOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly linkedResearchers = signal<LinkedResearcher[]>([]);
  protected readonly publicationDate = signal<string | null>(null);

  protected selectedToAdd: string[] = [];
  private originalResearcherIds: string[] = [];

  protected readonly isEditing = computed(() => this.publicationId() !== null);
  protected readonly dialogTitle = computed(() => (this.isEditing() ? 'Editar Publicação' : 'Nova Publicação'));

  protected readonly availableResearchersToAdd = computed(() => {
    const linkedIds = new Set(
      this.linkedResearchers()
        .map(r => r.researcherId)
        .filter((id): id is string => id !== null),
    );
    return this.researcherOptions().filter(r => !linkedIds.has(r.value));
  });

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    doi: [''],
    publicationDate: this.fb.control<Date | null>(null),
    publishedOn: ['', Validators.required],
    publishUrl: ['', Validators.required],
  });

  protected onDialogShow(): void {
    this.form.reset({ title: '', description: '', doi: '', publicationDate: null, publishedOn: '', publishUrl: '' });
    this.linkedResearchers.set([]);
    this.publicationDate.set(null);
    this.selectedToAdd = [];
    this.originalResearcherIds = [];

    if (this.isEditing()) {
      this.form.controls.doi.disable();
      this.form.controls.publicationDate.disable();
      this.form.controls.publicationDate.clearValidators();
    } else {
      this.form.controls.doi.enable();
      this.form.controls.publicationDate.enable();
      this.form.controls.publicationDate.setValidators(Validators.required);
    }
    this.form.controls.publicationDate.updateValueAndValidity();

    this.researchersService.getResearchers({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => {
        this.researcherOptions.set(res.data.map(r => ({ label: r.displayName, value: r.id })));
        const id = this.publicationId();
        if (id) this.loadPublication(id);
      },
    });
  }

  private loadPublication(id: string): void {
    this.loading.set(true);
    this.publicationsService.getPublicationById(id).subscribe({
      next: publication => {
        this.form.patchValue({
          title: publication.title,
          description: publication.description,
          doi: publication.doi,
          publishedOn: publication.publishedOn,
          publishUrl: publication.publishUrl,
        });
        this.publicationDate.set(publication.publicationDate);

        const sortedAuthors = [...publication.authors].sort((a, b) => a.order - b.order);
        const linked: LinkedResearcher[] = sortedAuthors.map(author => {
          const match = this.researcherOptions().find(r => r.label === author.name);
          return { researcherId: match?.value ?? null, name: author.name };
        });
        this.linkedResearchers.set(linked);
        this.originalResearcherIds = linked
          .map(l => l.researcherId)
          .filter((rid): rid is string => rid !== null);

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar a publicação.',
        });
      },
    });
  }

  protected onCancel(): void {
    this.visible.set(false);
  }

  protected onAddSelectedResearchers(): void {
    if (this.selectedToAdd.length === 0) return;
    const additions: LinkedResearcher[] = this.selectedToAdd
      .map(id => this.researcherOptions().find(r => r.value === id))
      .filter((opt): opt is { label: string; value: string } => !!opt)
      .map(opt => ({ researcherId: opt.value, name: opt.label }));

    this.linkedResearchers.update(list => [...list, ...additions]);
    this.selectedToAdd = [];
  }

  protected moveUp(index: number): void {
    if (index <= 0) return;
    this.linkedResearchers.update(list => {
      const copy = [...list];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  }

  protected moveDown(index: number): void {
    this.linkedResearchers.update(list => {
      if (index >= list.length - 1) return list;
      const copy = [...list];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  }

  protected removeLinked(index: number): void {
    this.linkedResearchers.update(list => list.filter((_, i) => i !== index));
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);

    if (this.isEditing()) {
      const id = this.publicationId()!;
      this.publicationsService
        .updatePublication(id, {
          title: value.title,
          description: value.description,
          publishedOn: value.publishedOn,
          publishUrl: value.publishUrl,
        })
        .pipe(switchMap(() => this.applyResearcherChanges(id)))
        .subscribe({
          next: () => this.onSaveSuccess('Publicação atualizada com sucesso.'),
          error: err => this.onSaveError(err, 'Não foi possível atualizar a publicação.'),
        });
    } else {
      this.publicationsService
        .createPublication({
          title: value.title,
          description: value.description,
          doi: value.doi,
          publicationDate: value.publicationDate ? this.toDateString(value.publicationDate) : '',
          publishedOn: value.publishedOn,
          publishUrl: value.publishUrl,
        })
        .subscribe({
          next: () => this.onSaveSuccess('Publicação criada com sucesso.'),
          error: err => this.onSaveError(err, 'Não foi possível criar a publicação.'),
        });
    }
  }

  private applyResearcherChanges(id: string) {
    const finalIds = this.linkedResearchers()
      .map(r => r.researcherId)
      .filter((rid): rid is string => rid !== null);

    const toAdd = finalIds.filter(rid => !this.originalResearcherIds.includes(rid));
    const toRemove = this.originalResearcherIds.filter(rid => !finalIds.includes(rid));
    const orderChanged = JSON.stringify(finalIds) !== JSON.stringify(this.originalResearcherIds);

    const ops = [
      ...toAdd.map(rid => this.publicationsService.addResearcher(id, { researcherId: rid })),
      ...toRemove.map(rid => this.publicationsService.removeResearcher(id, rid)),
    ];

    const ops$: Observable<unknown> = ops.length > 0 ? forkJoin(ops) : of(null);

    return ops$.pipe(
      switchMap(() =>
        toAdd.length > 0 || toRemove.length > 0 || orderChanged
          ? this.publicationsService.reorderResearchers(id, { researcherIds: finalIds })
          : of(undefined),
      ),
    );
  }

  private onSaveSuccess(detail: string): void {
    this.saving.set(false);
    this.visible.set(false);
    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail });
    this.saved.emit();
  }

  private onSaveError(err: unknown, fallback: string): void {
    this.saving.set(false);
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: this.extractErrorMessage(err, fallback),
    });
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
