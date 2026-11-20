import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { BOARD_COLUMNS, PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../core/labels';
import { Board, Task, TaskStatus } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, OverduePipe, RefNamePipe } from '../../shared/pipes';
import { TaskDialogComponent } from './task-dialog.component';

type Column = keyof Board;

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe, OverduePipe],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss'],
})
export class KanbanBoardComponent implements OnChanges {
  @Input({ required: true }) projectId!: string;
  @Output() changed = new EventEmitter<void>();

  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private notify = inject(NotifyService);
  readonly columns = BOARD_COLUMNS;
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;

  board = signal<Board>({ todo: [], in_progress: [], review: [], done: [] });
  loading = signal(false);
  private dragging = false;

  ngOnChanges() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.get<Board>(`/projects/${this.projectId}/board`).subscribe({
      next: (b) => {
        this.board.set(b);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.apiError(e);
      },
    });
  }

  drop(event: CdkDragDrop<Task[]>) {
    this.dragging = true;
    setTimeout(() => (this.dragging = false), 100);
    const sameList = event.previousContainer === event.container;
    if (sameList && event.previousIndex === event.currentIndex) return;

    const snapshot = structuredClone(this.board());
    const b = this.board();
    if (sameList) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }

    // Đánh lại thứ tự cho các cột bị ảnh hưởng và gửi 1 request
    const affected = new Set([event.previousContainer.id, event.container.id]) as Set<Column>;
    const items: { id: string; status: TaskStatus; order: number }[] = [];
    affected.forEach((col) =>
      b[col].forEach((t, i) => {
        t.status = col;
        t.order = i;
        items.push({ id: t._id, status: col, order: i });
      }),
    );
    this.board.set({ ...b });

    this.api.patch('/tasks/reorder', { projectId: this.projectId, items }).subscribe({
      next: () => this.changed.emit(),
      error: (e) => {
        this.board.set(snapshot); // hoàn tác khi lỗi
        this.notify.apiError(e, 'Không cập nhật được vị trí');
      },
    });
  }

  openTask(t: Task) {
    // Bỏ qua click phát sinh ngay sau khi thả thẻ
    if (!this.dragging) this.router.navigate(['/tasks', t._id]);
  }

  create(status: TaskStatus) {
    this.dialog
      .open(TaskDialogComponent, { data: { projectId: this.projectId, status }, width: '640px' })
      .afterClosed()
      .subscribe((t) => {
        if (t) {
          this.load();
          this.changed.emit();
        }
      });
  }

  initials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((s) => s[0])
      .join('')
      .toUpperCase();
  }
}
