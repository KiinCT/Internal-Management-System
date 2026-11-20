import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../core/labels';
import { Paginated, Project, refId, Task, TaskStatus, UserRef } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';

export interface TaskDialogData {
  task?: Task;
  projectId?: string;
  status?: TaskStatus;
  parentTaskId?: string;
}

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './task-dialog.component.html',
})
export class TaskDialogComponent implements OnInit {
  data = inject<TaskDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<TaskDialogComponent>);
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  readonly priorities = Object.entries(PRIORITY_LABELS);
  readonly statuses = Object.entries(TASK_STATUS_LABELS);

  projects = signal<Project[]>([]);
  members = signal<UserRef[]>([]);
  saving = signal(false);

  form = inject(FormBuilder).group({
    title: ['', Validators.required],
    projectId: ['', Validators.required],
    description: [''],
    assigneeId: [null as string | null],
    priority: ['medium'],
    status: ['todo' as TaskStatus],
    estimatedHours: [null as number | null, Validators.min(0)],
    startDate: [null as Date | null],
    dueDate: [null as Date | null],
    labels: [''],
  });

  ngOnInit() {
    const t = this.data.task;
    const projectId = t ? refId(t.projectId) ?? '' : this.data.projectId ?? '';
    this.form.patchValue({ projectId, status: this.data.status ?? 'todo' });
    if (t) {
      this.form.patchValue({
        title: t.title,
        description: t.description ?? '',
        assigneeId: refId(t.assigneeId),
        priority: t.priority,
        status: t.status,
        estimatedHours: t.estimatedHours ?? null,
        startDate: t.startDate ? new Date(t.startDate) : null,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        labels: (t.labels ?? []).join(', '),
      });
    } else if (!projectId) {
      this.api
        .get<Paginated<Project>>('/projects', { limit: 200, status: 'active' })
        .subscribe((r) => this.projects.set(r.data));
    }
    if (projectId) this.onProject(projectId);
  }

  /** Nạp thành viên dự án để chọn người thực hiện. */
  onProject(id: string) {
    this.api.get<Project>(`/projects/${id}`).subscribe({
      next: (p) => {
        const list = p.memberIds.filter((m): m is UserRef => typeof m === 'object');
        this.members.set(list);
        const current = this.form.value.assigneeId;
        if (current && !list.some((m) => m._id === current)) this.form.patchValue({ assigneeId: null });
      },
      error: (e) => this.notify.apiError(e),
    });
  }

  save() {
    const v = this.form.getRawValue();
    const isEdit = !!this.data.task;
    const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
    const body: Record<string, unknown> = {
      title: v.title?.trim(),
      description: v.description ?? '',
      assigneeId: v.assigneeId || null,
      priority: v.priority,
      status: v.status,
      startDate: iso(v.startDate),
      dueDate: iso(v.dueDate),
      labels: (v.labels ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (v.estimatedHours !== null && `${v.estimatedHours}` !== '') {
      body['estimatedHours'] = Number(v.estimatedHours);
    }
    // Khi tạo mới không gửi null cho trường optional
    if (!isEdit) {
      for (const k of ['assigneeId', 'startDate', 'dueDate']) if (body[k] === null) delete body[k];
      body['projectId'] = v.projectId;
      if (this.data.parentTaskId) body['parentTaskId'] = this.data.parentTaskId;
    }

    this.saving.set(true);
    const req$ = isEdit
      ? this.api.patch<Task>(`/tasks/${this.data.task!._id}`, body)
      : this.api.post<Task>('/tasks', body);
    req$.subscribe({
      next: (task) => {
        this.notify.success('Đã lưu công việc');
        this.ref.close(task);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }
}
