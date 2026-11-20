import { Component, inject, Input, OnChanges, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PROJECT_STATUS_LABELS } from '../../core/labels';
import { Project, refId, UserRef } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, RefNamePipe } from '../../shared/pipes';
import { KanbanBoardComponent } from '../tasks/kanban-board.component';
import { ProjectDialogComponent } from './project-dialog.component';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe, KanbanBoardComponent],
  template: `
    <div class="page" *ngIf="project() as p; else loadingTpl">
      <div class="page-header">
        <div>
          <a mat-button routerLink="/projects"><mat-icon>arrow_back</mat-icon> Dự án</a>
          <h1>{{ p.code }} · {{ p.name }} <span class="badge {{ p.status }}">{{ p.status | label: statusLabels }}</span></h1>
        </div>
        <div class="flex gap-8">
          <a mat-stroked-button routerLink="/tasks" [queryParams]="{ projectId: p._id }">
            <mat-icon>list</mat-icon> Dạng danh sách
          </a>
          <button mat-stroked-button *ngIf="canManage()" (click)="edit(p)"><mat-icon>edit</mat-icon> Sửa</button>
        </div>
      </div>

      <mat-card class="mb-16">
        <mat-card-content class="info">
          <div><div class="muted">Chủ dự án</div>{{ p.ownerId | refName }}</div>
          <div><div class="muted">Phòng ban</div>{{ p.departmentId | refName: '—' }}</div>
          <div><div class="muted">Thời gian</div>{{ p.startDate | date: 'dd/MM/yyyy' }} – {{ p.endDate | date: 'dd/MM/yyyy' }}</div>
          <div class="members">
            <div class="muted">Thành viên ({{ members().length }})</div>
            <mat-chip-set>
              <mat-chip *ngFor="let m of members()">{{ m.fullName }}</mat-chip>
            </mat-chip-set>
          </div>
          <div class="full" *ngIf="p.description"><div class="muted">Mô tả</div>{{ p.description }}</div>
        </mat-card-content>
      </mat-card>

      <app-kanban-board [projectId]="p._id"></app-kanban-board>
    </div>
    <ng-template #loadingTpl><mat-progress-bar mode="indeterminate"></mat-progress-bar></ng-template>
  `,
  styles: [
    `
      h1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding-top: 16px; }
      .members, .full { grid-column: 1 / -1; }
    `,
  ],
})
export class ProjectDetailComponent implements OnChanges {
  /** Gắn từ route param nhờ withComponentInputBinding(). */
  @Input() id!: string;

  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  private auth = inject(AuthService);
  readonly statusLabels = PROJECT_STATUS_LABELS;

  project = signal<Project | null>(null);
  members = signal<UserRef[]>([]);

  ngOnChanges() {
    this.load();
  }

  load() {
    this.api.get<Project>(`/projects/${this.id}`).subscribe({
      next: (p) => {
        this.project.set(p);
        this.members.set(p.memberIds.filter((m): m is UserRef => typeof m === 'object'));
      },
      error: (e) => this.notify.apiError(e),
    });
  }

  canManage() {
    const p = this.project();
    return !!p && (this.auth.hasRole('admin', 'director') || refId(p.ownerId) === this.auth.user()?._id);
  }

  edit(p: Project) {
    this.dialog
      .open(ProjectDialogComponent, { data: p, width: '640px' })
      .afterClosed()
      .subscribe((r) => r && this.load());
  }
}
