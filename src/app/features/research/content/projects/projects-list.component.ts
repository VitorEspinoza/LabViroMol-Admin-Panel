import { Component, computed, inject, signal } from '@angular/core';
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

  protected readonly formVisible = signal(false);
  protected readonly editingProjectId = signal<string | null>(null);

  protected readonly detailVisible = signal(false);
  protected readonly selectedProjectId = signal<string | null>(null);

  protected readonly statusLabels = PROJECT_STATUS_LABELS;
  protected readonly statusSeverities = PROJECT_STATUS_SEVERITIES;

  private readonly searchSubject = new Subject<string>();
  private lastEvent?: TableLazyLoadEvent;

  protected readonly filteredProjects = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.projects();
    return this.projects().filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.partnerName.toLowerCase().includes(q) ||
        p.managerName.toLowerCase().includes(q),
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

  protected loadProjects(event?: TableLazyLoadEvent): void {
    this.lastEvent = event ?? this.lastEvent;
    const page = event ? Math.floor((event.first ?? 0) / (event.rows ?? 10)) + 1 : 1;
    const size = event?.rows ?? 10;
    this.loading.set(true);
    this.projectsService.getProjects({ pageNumber: page, pageSize: size }).subscribe({
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
    this.loadProjects(this.lastEvent);
  }

  protected onDetailChanged(): void {
    this.loadProjects(this.lastEvent);
  }

  protected statusLabel(status: ProjectStatus): string {
    return this.statusLabels[status];
  }

  protected statusSeverity(status: ProjectStatus) {
    return this.statusSeverities[status];
  }
}
