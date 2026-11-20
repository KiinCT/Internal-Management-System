import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../core/labels';
import { Paginated, Project, Task, TaskStatus } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, OverduePipe, RefNamePipe } from '../../shared/pipes';
import { TaskDialogComponent } from './task-dialog.component';

interface TaskFilter {
  q: string;
  projectId: string;
  status: string[];
  priority: string;
  overdue: boolean;
  sort: string;
  page: number;
  limit: number;
}

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe, OverduePipe],
  templateUrl: './task-list.component.html',
  styles: [`.status-select { width: 130px; font-size: 13px; }`],
})
export class TaskListComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly statuses = Object.entries(TASK_STATUS_LABELS);
  readonly priorities = Object.entries(PRIORITY_LABELS);
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly cols = ['title', 'assignee', 'priority', 'status', 'dueDate'];

  mine = !!this.route.snapshot.data['mine'];
  rows = signal<Task[]>([]);
  total = signal(0);
  loading = signal(false);
  projects = signal<Project[]>([]);
  search$ = new Subject<string>();
  filter: TaskFilter = { q: '', projectId: '', status: [], priority: '', overdue: false, sort: '', page: 1, limit: 20 };

  ngOnInit() {
    if (!this.mine) {
      this.api.get<Paginated<Project>>('/projects', { limit: 200 }).subscribe((r) => this.projects.set(r.data));
    }
    // Bộ lọc được đồng bộ với query string để có thể chia sẻ link
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qp) => {
      this.filter = {
        ...this.filter,
        q: qp.get('q') ?? '',
        projectId: qp.get('projectId') ?? '',
        status: qp.get('status')?.split(',').filter(Boolean) ?? (this.mine ? ['todo', 'in_progress', 'review'] : []),
        priority: qp.get('priority') ?? '',
        overdue: qp.get('overdue') === 'true',
        page: Number(qp.get('page') ?? 1),
      };
      this.load();
    });
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.filter.q = q;
      this.apply();
    });
  }

  apply(page = 1) {
    this.filter.page = page;
    const f = this.filter;
    this.router.navigate([], {
      queryParams: {
        q: f.q || null,
        projectId: f.projectId || null,
        status: f.status.length ? f.status.join(',') : null,
        priority: f.priority || null,
        overdue: f.overdue || null,
        page: page > 1 ? page : null,
      },
    });
  }

  load() {
    this.loading.set(true);
    const f = this.filter;
    const path = this.mine ? '/tasks/my' : '/tasks';
    this.api
      .get<Paginated<Task>>(path, {
        q: f.q,
        projectId: f.projectId,
        status: f.status,
        priority: f.priority,
        overdue: f.overdue || null,
        sort: f.sort,
        page: f.page,
        limit: f.limit,
      })
      .subscribe({
        next: (r) => {
          this.rows.set(r.data);
          this.total.set(r.meta.total);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.notify.apiError(e);
        },
      });
  }

  onPage(e: PageEvent) {
    this.filter.limit = e.pageSize;
    this.apply(e.pageIndex + 1);
  }

  onSort(s: Sort) {
    this.filter.sort = s.direction ? (s.direction === 'desc' ? '-' : '') + s.active : '';
    this.load();
  }

  changeStatus(t: Task, status: TaskStatus) {
    this.api.patch<Task>(`/tasks/${t._id}/status`, { status }).subscribe({
      next: () => {
        t.status = status;
        this.notify.success('Đã cập nhật trạng thái');
      },
      error: (e) => {
        this.notify.apiError(e);
        this.load();
      },
    });
  }

  create() {
    this.dialog
      .open(TaskDialogComponent, { data: { projectId: this.filter.projectId || undefined }, width: '640px' })
      .afterClosed()
      .subscribe((t) => t && this.load());
  }
}
