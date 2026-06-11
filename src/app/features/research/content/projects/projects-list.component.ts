import { Component, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { DatePipe } from '@angular/common';

import { ProjectsService } from '../../projects/projects.service';
import { ProjectStatus, ProjectSummary } from '../../../../shared/models/research.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_SEVERITIES } from '../../../../shared/utils/project-status';
import { ProjectFormComponent } from './project-form/project-form.component';
import { ProjectDetailComponent } from './project-detail/project-detail.component';

@Component({
  selector: 'app-projects-list',
  imports: [
    TableModule, Button, Tag, Toast, InputText, IconField, InputIcon, DatePipe,
    ProjectFormComponent, ProjectDetailComponent,
  ],
  templateUrl: './projects-list.component.html',
  providers: [MessageService],
})
export class ProjectsListComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly messageService = inject(MessageService);
  protected readonly auth = inject(AuthService);

  protected readonly projects = signal<ProjectSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly searchQuery = signal('');
  protected readonly first = signal(0);
  protected readonly rows = signal(10);

  protected readonly formVisible = signal(false);
  protected readonly editingProjectId = signal<string | null>(null);

  protected readonly detailVisible = signal(false);
  protected readonly selectedProjectId = signal<string | null>(null);

  protected readonly statusLabels = PROJECT_STATUS_LABELS;
  protected readonly statusSeverities = PROJECT_STATUS_SEVERITIES;

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(q => {
        this.searchQuery.set(q);
        this.first.set(0);
        this.loadProjects();
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  protected loadProjects(event?: TableLazyLoadEvent): void {
    const first = event?.first ?? this.first();
    const size = event?.rows ?? this.rows();
    const page = Math.floor(first / size) + 1;
    this.first.set(first);
    this.rows.set(size);
    this.loading.set(true);
    this.projectsService.getProjects({ pageNumber: page, pageSize: size, search: this.searchQuery() || undefined }).subscribe({
      next: res => {
        this.projects.set(res.data);
        this.totalRecords.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os projetos.',
        });
      },
    });
  }

  protected openCreate(): void {
    this.editingProjectId.set(null);
    this.formVisible.set(true);
  }

  protected openEdit(project: ProjectSummary): void {
    this.editingProjectId.set(project.id);
    this.formVisible.set(true);
  }

  protected openDetail(project: ProjectSummary): void {
    this.selectedProjectId.set(project.id);
    this.detailVisible.set(true);
  }

  protected onProjectSaved(): void {
    this.loadProjects();
  }

  protected onProjectCreated(id: string): void {
    this.selectedProjectId.set(id);
    this.detailVisible.set(true);
  }

  protected onDetailChanged(): void {
    this.loadProjects();
  }

  protected statusLabel(status: ProjectStatus): string {
    return this.statusLabels[status];
  }

  protected statusSeverity(status: ProjectStatus) {
    return this.statusSeverities[status];
  }
}
