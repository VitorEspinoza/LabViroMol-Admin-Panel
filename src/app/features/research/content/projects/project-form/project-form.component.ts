import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { ProjectsService } from '../../../projects/projects.service';
import { PartnersService } from '../../../partners/partners.service';
import { ResearchersService } from '../../../researchers/researchers.service';
import { AuthService } from '../../../../../core/auth/auth.service';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, Dialog, Button, InputText, Textarea, Select],
  templateUrl: './project-form.component.html',
})
export class ProjectFormComponent {
  readonly visible = model(false);
  readonly projectId = input<string | null>(null);
  readonly saved = output<void>();

  private readonly projectsService = inject(ProjectsService);
  private readonly partnersService = inject(PartnersService);
  private readonly researchersService = inject(ResearchersService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly partnerOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly researcherOptions = signal<{ label: string; value: string }[]>([]);

  protected readonly isEditing = computed(() => this.projectId() !== null);
  protected readonly dialogTitle = computed(() => (this.isEditing() ? 'Editar Projeto' : 'Novo Projeto'));

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    principalInvestigatorId: ['', Validators.required],
    partnerId: ['', Validators.required],
  });

  protected onDialogShow(): void {
    this.form.reset({ title: '', description: '', principalInvestigatorId: '', partnerId: '' });
    this.loadOptions();

    const id = this.projectId();
    if (id) {
      this.loading.set(true);
      this.projectsService.getProjectById(id).subscribe({
        next: project => {
          this.form.patchValue({ title: project.title, description: project.description });
          this.form.controls.principalInvestigatorId.disable();
          this.form.controls.partnerId.disable();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar os dados do projeto.',
          });
        },
      });
    } else {
      this.form.controls.principalInvestigatorId.enable();
      this.form.controls.partnerId.enable();
    }
  }

  private loadOptions(): void {
    this.partnersService.getPartners({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => this.partnerOptions.set(res.data.map(p => ({ label: p.name, value: p.id }))),
    });
    this.researchersService.getResearchers({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => this.researcherOptions.set(res.data.map(r => ({ label: r.displayName, value: r.id }))),
    });
  }

  protected onCancel(): void {
    this.visible.set(false);
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const id = this.projectId();
    const userId = this.authService.currentUser()?.userId ?? '';
    this.saving.set(true);

    const request$ = id
      ? this.projectsService.updateProject(id, {
          title: value.title,
          description: value.description,
          requestedById: userId,
        })
      : this.projectsService.createProject({
          title: value.title,
          description: value.description,
          principalInvestigatorId: value.principalInvestigatorId,
          partnerId: value.partnerId,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: id ? 'Projeto atualizado com sucesso.' : 'Projeto criado com sucesso.',
        });
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, id ? 'Não foi possível atualizar o projeto.' : 'Não foi possível criar o projeto.'),
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
