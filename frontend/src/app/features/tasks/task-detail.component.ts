import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LookupService } from '../../core/data.service';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../core/labels';
import { Attachment, ChecklistItem, Comment, refId, Task, TaskStatus, UserRef } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { confirmDialog } from '../../shared/confirm-dialog.component';
import { SHARED_IMPORTS } from '../../shared/material';
import { FileSizePipe, LabelPipe, OverduePipe, RefNamePipe } from '../../shared/pipes';
import { TaskDialogComponent } from './task-dialog.component';

const MAX_UPLOAD = 10 * 1024 * 1024;

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe, OverduePipe, FileSizePipe],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.scss'],
})
export class TaskDetailComponent implements OnChanges {
  @Input() id!: string;

  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  private router = inject(Router);
  private lookup = inject(LookupService);
  readonly me = inject(AuthService).user()?._id;
  readonly statuses = Object.entries(TASK_STATUS_LABELS);
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;

  task = signal<Task | null>(null);
  comments = signal<Comment[]>([]);
  attachments = signal<Attachment[]>([]);
  users = signal<UserRef[]>([]);
  uploading = signal(false);
  projectId = computed(() => refId(this.task()?.projectId));
  parentId = computed(() => refId(this.task()?.parentTaskId));
  checklistDone = computed(() => this.task()?.checklist.filter((c) => c.done).length ?? 0);

  newCheck = '';
  newComment = '';
  mentions: string[] = [];
  hours: number | null = null;

  ngOnChanges() {
    this.load();
    this.api.get<Comment[]>(`/tasks/${this.id}/comments`).subscribe((c) => this.comments.set(c));
    this.loadAttachments();
    this.lookup.users().subscribe((u) => this.users.set(u));
  }

  load() {
    this.api.get<Task>(`/tasks/${this.id}`).subscribe({
      next: (t) => this.task.set(t),
      error: (e) => {
        this.notify.apiError(e);
        this.router.navigate(['/tasks']);
      },
    });
  }

  loadAttachments() {
    this.api
      .get<Attachment[]>('/attachments', { refType: 'task', refId: this.id })
      .subscribe((a) => this.attachments.set(a));
  }

  changeStatus(status: TaskStatus) {
    this.api.patch<Task>(`/tasks/${this.id}/status`, { status }).subscribe({
      next: () => {
        this.notify.success('Đã cập nhật trạng thái');
        this.load();
      },
      error: (e) => {
        this.notify.apiError(e);
        this.load();
      },
    });
  }

  /* ---------- Checklist ---------- */
  private saveChecklist(list: ChecklistItem[]) {
    const checklist = list.map((c) => ({ text: c.text, done: c.done }));
    this.api.patch<Task>(`/tasks/${this.id}`, { checklist }).subscribe({
      next: () => this.load(),
      error: (e) => this.notify.apiError(e),
    });
  }

  addCheck() {
    const text = this.newCheck.trim();
    if (!text) return;
    this.newCheck = '';
    this.saveChecklist([...(this.task()?.checklist ?? []), { text, done: false }]);
  }

  toggleCheck(i: number) {
    const list = this.task()?.checklist ?? [];
    this.saveChecklist(list.map((c, idx) => (idx === i ? { ...c, done: !c.done } : c)));
  }

  removeCheck(i: number) {
    this.saveChecklist((this.task()?.checklist ?? []).filter((_, idx) => idx !== i));
  }

  logTime() {
    if (!this.hours || this.hours <= 0) return;
    this.api.post(`/tasks/${this.id}/log-time`, { hours: Number(this.hours) }).subscribe({
      next: () => {
        this.hours = null;
        this.notify.success('Đã ghi nhận thời gian');
        this.load();
      },
      error: (e) => this.notify.apiError(e),
    });
  }

  /* ---------- Comments ---------- */
  addComment() {
    const content = this.newComment.trim();
    if (!content) return;
    this.api.post<Comment>(`/tasks/${this.id}/comments`, { content, mentions: this.mentions }).subscribe({
      next: (c) => {
        this.comments.update((l) => [...l, c]);
        this.newComment = '';
        this.mentions = [];
      },
      error: (e) => this.notify.apiError(e),
    });
  }

  removeComment(c: Comment) {
    this.api.delete(`/comments/${c._id}`).subscribe({
      next: () => this.comments.update((l) => l.filter((x) => x._id !== c._id)),
      error: (e) => this.notify.apiError(e),
    });
  }

  /* ---------- Attachments ---------- */
  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_UPLOAD) {
      this.notify.error('File vượt quá 10MB');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('refType', 'task');
    form.append('refId', this.id);
    this.uploading.set(true);
    this.api.upload('/attachments', form).subscribe({
      next: () => {
        this.uploading.set(false);
        this.notify.success('Đã tải lên');
        this.loadAttachments();
      },
      error: (e) => {
        this.uploading.set(false);
        this.notify.apiError(e, 'Tải lên thất bại');
      },
    });
  }

  download(a: Attachment) {
    this.api.download(`/attachments/${a._id}/download`).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = a.fileName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (e) => this.notify.apiError(e, 'Không tải được file'),
    });
  }

  removeAttachment(a: Attachment) {
    confirmDialog(this.dialog, { title: 'Xóa tệp?', message: a.fileName, danger: true, confirmText: 'Xóa' })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.delete(`/attachments/${a._id}`).subscribe({
          next: () => this.loadAttachments(),
          error: (e) => this.notify.apiError(e),
        });
      });
  }

  /* ---------- Edit / subtasks / delete ---------- */
  edit() {
    this.dialog
      .open(TaskDialogComponent, { data: { task: this.task()! }, width: '640px' })
      .afterClosed()
      .subscribe((r) => r && this.load());
  }

  addSubtask() {
    this.dialog
      .open(TaskDialogComponent, {
        data: { projectId: this.projectId()!, parentTaskId: this.id },
        width: '640px',
      })
      .afterClosed()
      .subscribe((r) => r && this.load());
  }

  remove() {
    confirmDialog(this.dialog, {
      title: 'Xóa công việc?',
      message: 'Công việc, các việc con và bình luận sẽ bị xóa vĩnh viễn.',
      danger: true,
      confirmText: 'Xóa',
    }).subscribe((ok) => {
      if (!ok) return;
      const projectId = this.projectId();
      this.api.delete(`/tasks/${this.id}`).subscribe({
        next: () => {
          this.notify.success('Đã xóa công việc');
          this.router.navigate(projectId ? ['/projects', projectId] : ['/tasks']);
        },
        error: (e) => this.notify.apiError(e),
      });
    });
  }
}
