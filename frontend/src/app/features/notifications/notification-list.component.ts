import { Component, inject, OnInit, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AppNotification, Paginated } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';

const ICONS: Record<string, string> = {
  task_assigned: 'assignment_ind',
  task_comment: 'chat',
  task_status: 'sync',
  mention: 'alternate_email',
  request_pending: 'pending_actions',
  request_approved: 'check_circle',
  request_rejected: 'cancel',
  project_added: 'folder_shared',
  asset_assigned: 'devices',
  booking_invite: 'event',
};

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <div class="page narrow">
      <div class="page-header">
        <h1>Thông báo</h1>
        <div class="flex gap-8 items-center">
          <mat-slide-toggle [(ngModel)]="unreadOnly" (change)="page = 1; load()">Chỉ chưa đọc</mat-slide-toggle>
          <button mat-stroked-button (click)="readAll()">Đánh dấu tất cả đã đọc</button>
        </div>
      </div>
      <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>
      <mat-card>
        <mat-nav-list>
          <a mat-list-item *ngFor="let n of rows()" (click)="open(n)" [class.unread]="!n.isRead">
            <mat-icon matListItemIcon>{{ icon(n.type) }}</mat-icon>
            <span matListItemTitle>{{ n.title }}</span>
            <span matListItemLine>{{ n.message }} {{ n.message ? '·' : '' }} {{ n.createdAt | date: 'dd/MM/yyyy HH:mm' }}</span>
          </a>
        </mat-nav-list>
        <div class="empty" *ngIf="!loading() && !rows().length">Không có thông báo</div>
        <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page - 1" (page)="onPage($event)"></mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`.narrow { max-width: 900px; } .unread { background: #eff6ff; } .unread [matListItemTitle] { font-weight: 500; }`],
})
export class NotificationListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private notify = inject(NotifyService);

  rows = signal<AppNotification[]>([]);
  total = signal(0);
  loading = signal(false);
  unreadOnly = false;
  page = 1;
  limit = 20;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .get<Paginated<AppNotification>>('/notifications', { page: this.page, limit: this.limit, unreadOnly: this.unreadOnly || null })
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

  icon(type: string) {
    return ICONS[type] ?? 'notifications';
  }

  open(n: AppNotification) {
    if (!n.isRead) this.api.patch(`/notifications/${n._id}/read`).subscribe();
    if (n.link) this.router.navigateByUrl(n.link);
  }

  readAll() {
    this.api.patch('/notifications/read-all').subscribe(() => this.load());
  }

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.load();
  }
}
