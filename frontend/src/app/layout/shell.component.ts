import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith, switchMap, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ROLE_LABELS } from '../core/labels';
import { AppNotification, Paginated, Role } from '../core/models';
import { SHARED_IMPORTS } from '../shared/material';
import { LabelPipe } from '../shared/pipes';

interface NavItem { label: string; icon: string; link: string; roles?: Role[] }

const NAV: NavItem[] = [
  { label: 'Tổng quan', icon: 'dashboard', link: '/dashboard' },
  { label: 'Việc của tôi', icon: 'assignment_ind', link: '/my-tasks' },
  { label: 'Dự án', icon: 'folder', link: '/projects' },
  { label: 'Công việc', icon: 'task_alt', link: '/tasks' },
  { label: 'Đề xuất & phê duyệt', icon: 'approval', link: '/requests' },
  { label: 'Tài sản', icon: 'devices', link: '/assets' },
  { label: 'Đặt phòng / tài nguyên', icon: 'event', link: '/bookings' },
  { label: 'Người dùng', icon: 'people', link: '/admin/users', roles: ['admin'] },
  { label: 'Phòng ban', icon: 'account_tree', link: '/admin/departments', roles: ['admin'] },
  { label: 'Mẫu quy trình', icon: 'schema', link: '/admin/workflows', roles: ['admin'] },
  { label: 'Phòng họp / tài nguyên', icon: 'meeting_room', link: '/admin/resources', roles: ['admin'] },
  { label: 'Nhật ký hệ thống', icon: 'history', link: '/admin/audit-logs', roles: ['admin'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly roleLabels = ROLE_LABELS;

  isMobile = toSignal(
    inject(BreakpointObserver).observe('(max-width: 960px)').pipe(map((s) => s.matches)),
    { initialValue: false },
  );
  nav = computed(() => NAV.filter((n) => !n.roles || this.auth.hasRole(...n.roles)));
  unread = signal(0);
  latest = signal<AppNotification[]>([]);

  ngOnInit() {
    // Cập nhật thông tin user khi vào app
    this.auth.loadMe().subscribe({ error: () => undefined });

    // Polling thông báo + làm mới khi chuyển trang
    const nav$ = this.router.events.pipe(filter((e) => e instanceof NavigationEnd), startWith(null));
    nav$
      .pipe(
        switchMap(() => timer(0, environment.notificationPollMs)),
        switchMap(() => this.api.get<{ count: number }>('/notifications/unread-count')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (r) => this.unread.set(r.count), error: () => undefined });
  }

  loadLatest() {
    this.api
      .get<Paginated<AppNotification>>('/notifications', { limit: 8 })
      .subscribe((r) => {
        this.latest.set(r.data);
        this.unread.set(r.meta.unread ?? 0);
      });
  }

  open(n: AppNotification) {
    if (!n.isRead) {
      this.api.patch(`/notifications/${n._id}/read`).subscribe(() => this.unread.update((c) => Math.max(0, c - 1)));
    }
    if (n.link) this.router.navigateByUrl(n.link);
  }

  readAll() {
    this.api.patch('/notifications/read-all').subscribe(() => {
      this.unread.set(0);
      this.latest.update((l) => l.map((n) => ({ ...n, isRead: true })));
    });
  }

  logout() {
    this.auth.logout();
  }
}
