import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { MultiSelect } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';

import { PublicationsService } from '../publications.service';
import { ResearchersService } from '../../researchers/researchers.service';

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

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly researchersSaving = signal(false);
  protected readonly researcherOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly linkedResearchers = signal<LinkedResearcher[]>([]);
  protected readonly doi = signal<string | null>(null);
  protected readonly publicationDate = signal<string | null>(null);

  protected selectedToAdd: string[] = [];
  private readonly currentId = signal<string | null>(null);

  protected readonly isEditing = computed(() => this.currentId() !== null);
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
    this.doi.set(null);
    this.publicationDate.set(null);
    this.selectedToAdd = [];
    this.currentId.set(this.publicationId());

    if (this.isEditing()) {
      this.form.controls.doi.disable();
      this.form.controls.doi.clearValidators();
      this.form.controls.publicationDate.disable();
      this.form.controls.publicationDate.clearValidators();
    } else {
      this.form.controls.doi.enable();
      this.form.controls.publicationDate.enable();
      this.form.controls.publicationDate.setValidators(Validators.required);
    }
    this.form.controls.doi.updateValueAndValidity();
    this.form.controls.publicationDate.updateValueAndValidity();

    const id = this.publicationId();
    this.loading.set(id !== null);

    this.researchersService.getResearchers({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => {
        this.researcherOptions.set(res.data.map(r => ({ label: r.displayName, value: r.id })));
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
          publishedOn: publication.publishedOn,
          publishUrl: publication.publishUrl,
        });
        this.doi.set(publication.doi || null);
        this.publicationDate.set(publication.publicationDate);

        const sortedAuthors = [...publication.authors].sort((a, b) => a.order - b.order);
        const linked: LinkedResearcher[] = sortedAuthors.map(author => {
          const match = this.researcherOptions().find(r => r.label === author.name);
          return { researcherId: match?.value ?? null, name: author.name };
        });
        this.linkedResearchers.set(linked);

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

  protected onVisibleChange(visible: boolean): void {
    this.visible.set(visible);
    if (!visible) {
      this.form.reset({ title: '', description: '', doi: '', publicationDate: null, publishedOn: '', publishUrl: '' });
      this.linkedResearchers.set([]);
      this.doi.set(null);
      this.publicationDate.set(null);
      this.currentId.set(null);
      this.loading.set(true);
    }
  }

  protected onAddSelectedResearchers(): void {
    const id = this.currentId();
    if (!id || this.selectedToAdd.length === 0) return;

    const additions: LinkedResearcher[] = this.selectedToAdd
      .map(rid => this.researcherOptions().find(r => r.value === rid))
      .filter((opt): opt is { label: string; value: string } => !!opt)
      .map(opt => ({ researcherId: opt.value, name: opt.label }));

    this.researchersSaving.set(true);
    forkJoin(additions.map(a => this.publicationsService.addResearcher(id, { researcherId: a.researcherId! }))).subscribe({
      next: () => {
        this.researchersSaving.set(false);
        this.linkedResearchers.update(list => [...list, ...additions]);
        this.selectedToAdd = [];
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Pesquisador(es) adicionado(s) com sucesso.' });
      },
      error: err => {
        this.researchersSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível adicionar o(s) pesquisador(es).'),
        });
      },
    });
  }

  protected moveUp(index: number): void {
    if (index <= 0) return;
    this.reorderLinked(list => {
      const copy = [...list];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  }

  protected moveDown(index: number): void {
    this.reorderLinked(list => {
      if (index >= list.length - 1) return list;
      const copy = [...list];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  }

  private reorderLinked(updateFn: (list: LinkedResearcher[]) => LinkedResearcher[]): void {
    const id = this.currentId();
    if (!id) return;

    const newList = updateFn(this.linkedResearchers());
    const researcherIds = newList.map(l => l.researcherId).filter((rid): rid is string => rid !== null);

    this.researchersSaving.set(true);
    this.publicationsService.reorderResearchers(id, { researcherIds }).subscribe({
      next: () => {
        this.researchersSaving.set(false);
        this.linkedResearchers.set(newList);
      },
      error: err => {
        this.researchersSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível reordenar os pesquisadores.'),
        });
      },
    });
  }

  protected removeLinked(index: number): void {
    const id = this.currentId();
    const linked = this.linkedResearchers()[index];
    if (!id || !linked?.researcherId) return;

    this.researchersSaving.set(true);
    this.publicationsService.removeResearcher(id, linked.researcherId).subscribe({
      next: () => {
        this.researchersSaving.set(false);
        this.linkedResearchers.update(list => list.filter((_, i) => i !== index));
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Pesquisador removido com sucesso.' });
      },
      error: err => {
        this.researchersSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível remover o pesquisador.'),
        });
      },
    });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);

    if (this.isEditing()) {
      const id = this.currentId()!;
      this.publicationsService
        .updatePublication(id, {
          title: value.title,
          description: value.description,
          publishedOn: value.publishedOn,
          publishUrl: value.publishUrl,
        })
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
          next: res => this.onCreateSuccess(res.id, value.publicationDate),
          error: err => this.onSaveError(err, 'Não foi possível criar a publicação.'),
        });
    }
  }

  private onCreateSuccess(id: string, publicationDate: Date | null): void {
    this.saving.set(false);
    this.currentId.set(id);
    this.linkedResearchers.set([]);

    const value = this.form.getRawValue();
    this.doi.set(value.doi || null);

    this.form.controls.doi.disable();
    this.form.controls.doi.clearValidators();
    this.form.controls.doi.updateValueAndValidity();

    this.form.controls.publicationDate.disable();
    this.form.controls.publicationDate.clearValidators();
    this.form.controls.publicationDate.updateValueAndValidity();
    this.publicationDate.set(publicationDate ? this.toDateString(publicationDate) : null);

    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Publicação criada com sucesso. Agora vincule os pesquisadores.',
    });
    this.saved.emit();
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
