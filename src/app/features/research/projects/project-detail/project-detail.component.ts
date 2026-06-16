import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { ProjectsService } from '../projects.service';
import { ResearchersService } from '../../researchers/researchers.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Project, ProjectRole, ProjectStatus } from '../../../../shared/models/research.model';
import {
  PROJECT_ROLE_LABELS,
  PROJECT_ROLE_OPTIONS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_SEVERITIES,
} from '../../../../shared/utils/project-status';

@Component({
  selector: 'app-project-detail',
  imports: [ReactiveFormsModule, FormsModule, Dialog, Button, Tag, Select, DatePipe],
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent {
  readonly visible = model(false);
  readonly projectId = input<string | null>(null);
  readonly changed = output<void>();

  private readonly projectsService = inject(ProjectsService);
  private readonly researchersService = inject(ResearchersService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  protected readonly project = signal<Project | null>(null);
  protected readonly loading = signal(true);
  protected readonly processing = signal(false);
  protected readonly researcherOptions = signal<{ label: string; value: string }[]>([]);

  protected readonly addMemberVisible = signal(false);
  protected readonly transferVisible = signal(false);

  protected readonly statusLabels = PROJECT_STATUS_LABELS;
  protected readonly statusSeverities = PROJECT_STATUS_SEVERITIES;
  protected readonly roleLabels = PROJECT_ROLE_LABELS;
  protected readonly roleOptions = PROJECT_ROLE_OPTIONS;
  protected readonly memberRoleOptions = PROJECT_ROLE_OPTIONS.filter(o => o.value !== 'ResearchLead');

  protected readonly canChangeStatus = computed(() => this.project()?.canChangeStatus ?? false);
  protected readonly canTransferLeadership = computed(() => this.project()?.canTransferLeadership ?? false);
  protected readonly canEditMembers = computed(() => this.project()?.canEditMembers ?? false);
  protected readonly canChangeMemberRole = computed(() => this.project()?.canChangeMemberRole ?? false);
  protected readonly canRemoveMembers = computed(() => this.project()?.canRemoveMembers ?? false);

  protected readonly leadMemberName = computed(
    () => this.project()?.members.find(m => m.role === 'ResearchLead')?.researcherName ?? '—',
  );

  protected readonly addMemberForm = this.fb.nonNullable.group({
    researcherId: ['', Validators.required],
    role: this.fb.nonNullable.control<ProjectRole>('Collaborator', Validators.required),
  });

  protected readonly transferForm = this.fb.nonNullable.group({
    newLeadResearcherId: ['', Validators.required],
  });

  protected readonly availableResearchersForAdd = computed(() => {
    const project = this.project();
    if (!project) return [];
    const memberIds = new Set(project.members.map(m => m.researcherId));
    return this.researcherOptions().filter(r => !memberIds.has(r.value));
  });

  protected readonly availableResearchersForTransfer = computed(() => {
    const project = this.project();
    if (!project) return [];
    const leadId = project.members.find(m => m.role === 'ResearchLead')?.researcherId;
    return this.researcherOptions().filter(r => r.value !== leadId);
  });

  protected onDialogShow(): void {
    const id = this.projectId();
    if (!id) return;

    this.researchersService.getResearchers({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => this.researcherOptions.set(res.data.map(r => ({ label: r.displayName, value: r.id }))),
    });

    this.loadProject(id);
  }

  private loadProject(id: string): void {
    this.loading.set(true);
    this.projectsService.getProjectById(id).subscribe({
      next: project => {
        this.project.set(project);
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
  }

  protected onClose(): void {
    this.onVisibleChange(false);
  }

  protected onVisibleChange(visible: boolean): void {
    this.visible.set(visible);
    if (!visible) {
      this.project.set(null);
      this.loading.set(true);
      this.addMemberVisible.set(false);
      this.transferVisible.set(false);
    }
  }

  private get currentUserId(): string {
    return this.authService.currentUser()?.userId ?? '';
  }

  protected startProject(): void {
    const id = this.project()?.id;
    if (!id) return;
    this.processing.set(true);
    this.projectsService.startProject(id, this.currentUserId).subscribe({
      next: () => this.onLifecycleSuccess('Projeto iniciado com sucesso.', id),
      error: err => this.onLifecycleError(err, 'Não foi possível iniciar o projeto.'),
    });
  }

  protected confirmComplete(): void {
    this.confirmDialogService.confirm({
      header: 'Concluir Projeto',
      message: 'Deseja realmente concluir este projeto?',
      accept: () => this.completeProject(),
    });
  }

  private completeProject(): void {
    const id = this.project()?.id;
    if (!id) return;
    this.processing.set(true);
    this.projectsService.completeProject(id, this.currentUserId).subscribe({
      next: () => this.onLifecycleSuccess('Projeto concluído com sucesso.', id),
      error: err => this.onLifecycleError(err, 'Não foi possível concluir o projeto.'),
    });
  }

  protected confirmCancel(): void {
    this.confirmDialogService.confirm({
      header: 'Cancelar Projeto',
      message: 'Deseja realmente cancelar este projeto?',
      accept: () => this.cancelProject(),
    });
  }

  private cancelProject(): void {
    const id = this.project()?.id;
    if (!id) return;
    this.processing.set(true);
    this.projectsService.cancelProject(id, this.currentUserId).subscribe({
      next: () => this.onLifecycleSuccess('Projeto cancelado com sucesso.', id),
      error: err => this.onLifecycleError(err, 'Não foi possível cancelar o projeto.'),
    });
  }

  protected openAddMember(): void {
    this.addMemberForm.reset({ researcherId: '', role: 'Collaborator' });
    this.addMemberVisible.set(true);
  }

  protected onAddMemberCancel(): void {
    this.addMemberVisible.set(false);
  }

  protected onAddMemberSave(): void {
    if (this.addMemberForm.invalid) {
      this.addMemberForm.markAllAsTouched();
      return;
    }
    const id = this.project()?.id;
    if (!id) return;
    const value = this.addMemberForm.getRawValue();

    this.processing.set(true);
    this.projectsService
      .addMember(id, { researcherId: value.researcherId, role: value.role, requestedById: this.currentUserId })
      .subscribe({
        next: () => {
          this.addMemberVisible.set(false);
          this.onLifecycleSuccess('Membro adicionado com sucesso.', id);
        },
        error: err => this.onLifecycleError(err, 'Não foi possível adicionar o membro.'),
      });
  }

  protected onChangeMemberRole(researcherId: string, newRole: ProjectRole): void {
    const id = this.project()?.id;
    if (!id) return;
    this.processing.set(true);
    this.projectsService.changeMemberRole(id, researcherId, { newRole, requestedById: this.currentUserId }).subscribe({
      next: () => this.onLifecycleSuccess('Função do membro atualizada com sucesso.', id),
      error: err => this.onLifecycleError(err, 'Não foi possível atualizar a função do membro.'),
    });
  }

  protected confirmRemoveMember(researcherId: string, researcherName: string): void {
    this.confirmDialogService.confirm({
      header: 'Remover Membro',
      message: `Deseja realmente remover "${researcherName}" deste projeto?`,
      accept: () => this.removeMember(researcherId),
    });
  }

  private removeMember(researcherId: string): void {
    const id = this.project()?.id;
    if (!id) return;
    this.processing.set(true);
    this.projectsService.removeMember(id, researcherId, this.currentUserId).subscribe({
      next: () => this.onLifecycleSuccess('Membro removido com sucesso.', id),
      error: err => this.onLifecycleError(err, 'Não foi possível remover o membro.'),
    });
  }

  protected openTransfer(): void {
    this.transferForm.reset({ newLeadResearcherId: '' });
    this.transferVisible.set(true);
  }

  protected onTransferCancel(): void {
    this.transferVisible.set(false);
  }

  protected onTransferSave(): void {
    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }
    const id = this.project()?.id;
    if (!id) return;
    const value = this.transferForm.getRawValue();

    this.processing.set(true);
    this.projectsService
      .transferLeadership(id, { newLeadResearcherId: value.newLeadResearcherId, requestedById: this.currentUserId })
      .subscribe({
        next: () => {
          this.transferVisible.set(false);
          this.onLifecycleSuccess('Liderança transferida com sucesso.', id);
        },
        error: err => this.onLifecycleError(err, 'Não foi possível transferir a liderança.'),
      });
  }

  private onLifecycleSuccess(detail: string, projectId: string): void {
    this.processing.set(false);
    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail });
    this.loadProject(projectId);
    this.changed.emit();
  }

  private onLifecycleError(err: unknown, fallback: string): void {
    this.processing.set(false);
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: this.extractErrorMessage(err, fallback),
    });
  }

  protected statusLabel(status: ProjectStatus): string {
    return this.statusLabels[status];
  }

  protected statusSeverity(status: ProjectStatus) {
    return this.statusSeverities[status];
  }

  protected roleLabel(role: ProjectRole): string {
    return this.roleLabels[role];
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
