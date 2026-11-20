import { Component, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ROLE_LABELS } from '../../core/labels';
import { Paginated, User } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, RefNamePipe } from '../../shared/pipes';
import { UserDialogComponent } from './user-dialog.component';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Người dùng</h1>
        <button mat-flat-button color="primary" (click)="edit(null)"><mat-icon>person_add</mat-icon> Thêm người dùng</button>
      </div>
      <div class="filters mb-16">
        <mat-form-field appearance="outline">
          <mat-label>Tìm tên / email</mat-label>
          <input matInput (input)="search$.next($any($event.target).value)" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vai trò</mat-label>
          <mat-select [(ngModel)]="role" (selectionChange)="page = 1; load()">
            <mat-option value="">Tất cả</mat-option>
            <mat-option *ngFor="let r of roles" [value]="r[0]">{{ r[1] }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Họ tên</th>
            <td mat-cell *matCellDef="let u"><strong>{{ u.fullName }}</strong><div class="muted">{{ u.position }}</div></td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let u">{{ u.email }}</td>
          </ng-container>
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Vai trò</th>
            <td mat-cell *matCellDef="let u">{{ u.role | label: roleLabels }}</td>
          </ng-container>
          <ng-container matColumnDef="dept">
            <th mat-header-cell *matHeaderCellDef>Phòng ban</th>
            <td mat-cell *matCellDef="let u">{{ u.departmentId | refName: '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
            <td mat-cell *matCellDef="let u">
              <span class="badge" [class.done]="u.isActive" [class.cancelled]="!u.isActive">{{ u.isActive ? 'Hoạt động' : 'Đã khóa' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="login">
            <th mat-header-cell *matHeaderCellDef>Đăng nhập gần nhất</th>
            <td mat-cell *matCellDef="let u">{{ (u.lastLoginAt | date: 'dd/MM/yyyy HH:mm') || '—' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let u; columns: cols" class="clickable" (click)="edit(u)"></tr>
        </table>
        <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page - 1" (page)="onPage($event)"></mat-paginator>
      </div>
    </div>
  `,
})
export class UserAdminComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  readonly roleLabels = ROLE_LABELS;
  readonly roles = Object.entries(ROLE_LABELS);
  readonly cols = ['name', 'email', 'role', 'dept', 'active', 'login'];

  rows = signal<User[]>([]);
  total = signal(0);
  loading = signal(false);
  page = 1;
  limit = 20;
  role = '';
  q = '';
  search$ = new Subject<string>();

  ngOnInit() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((q) => {
      this.q = q;
      this.page = 1;
      this.load();
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.get<Paginated<User>>('/users', { page: this.page, limit: this.limit, role: this.role, q: this.q }).subscribe({
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
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.load();
  }

  edit(u: User | null) {
    this.dialog
      .open(UserDialogComponent, { data: u, width: '680px' })
      .afterClosed()
      .subscribe((r) => r && this.load());
  }
}
