import { Component, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';

import { SchedulesService } from '../schedules.service';
import { Schedule } from '../../../../shared/models/scheduling.model';

const ACCEPTED_TERM_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];
const ACCEPTED_TERM_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

@Component({
  selector: 'app-attach-term-dialog',
  imports: [Dialog, Button],
  templateUrl: './attach-term-dialog.component.html',
})
export class AttachTermDialogComponent {
  readonly visible = model(false);
  readonly schedule = input<Schedule | null>(null);
  readonly attached = output<void>();

  private readonly schedulesService = inject(SchedulesService);
  private readonly messageService = inject(MessageService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly saving = signal(false);
  protected readonly selectedFile = signal<File | null>(null);

  protected onDialogShow(): void {
    this.selectedFile.set(null);
  }

  protected triggerFileSelect(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    if (!this.isValidFile(file)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erro',
        detail: 'Formato de arquivo inválido. Envie um arquivo PDF, DOC, DOCX, JPG ou PNG.',
      });
      return;
    }

    this.selectedFile.set(file);
  }

  protected removeFile(): void {
    this.selectedFile.set(null);
  }

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected onUpload(): void {
    const schedule = this.schedule();
    const file = this.selectedFile();
    if (!schedule || !file) return;

    this.saving.set(true);
    this.schedulesService.attachTerm(schedule.scheduleId, file).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.attached.emit();
      },
      error: err => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: this.extractErrorMessage(err, 'Não foi possível anexar o termo.'),
        });
      },
    });
  }

  protected onCancel(): void {
    this.visible.set(false);
  }

  private isValidFile(file: File): boolean {
    if (ACCEPTED_TERM_TYPES.includes(file.type)) return true;
    const name = file.name.toLowerCase();
    return ACCEPTED_TERM_EXTENSIONS.some(ext => name.endsWith(ext));
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { errors?: unknown; error?: string } })?.error;
    if (Array.isArray(body?.errors) && body.errors.length > 0) return String(body.errors[0]);
    return body?.error ?? fallback;
  }
}
