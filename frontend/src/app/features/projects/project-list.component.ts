import { Component, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PROJECT_STATUS_LABELS } from '../../core/labels';
import { Paginated, Project } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, RefNamePipe } from '../../shared/pipes';
import { ProjectDialogComponent } from './project-dialog.component';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Dự án</h1>
        <button mat-flat-button color="primary" *ngIf="canCreate" (click)="openDialog()">
          <mat-icon>add</mat-icon> Tạo dự án
        </button>
      </div>

      <div class="filters mb-16">
        <mat-form-field appearance="outline">
          <mat-label>Tìm kiếm</mat-label>
          <input matInput (input)="search$.next($any($event.target).value)" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Trạng thái</mat-label>
          <mat-select [(ngModel)]="status" (selectionChange)="page = 1; load()">
            <mat-option value="">Tất cả</mat-option>
            <mat-option *ngFor="let s of statuses" [value]="s[0]">{{ s[1] }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Mã</th>
            <td mat-cell *matCellDef="let p"><strong>{{ p.code }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Tên dự án</th>
            <td mat-cell *matCellDef="let p">{{ p.name }}</td>
          </ng-container>
          <ng-container matColumnDef="owner">
            <th mat-header-cell *matHeaderCellDef>Chủ dự án</th>
            <td mat-cell *matCellDef="let p">{{ p.ownerId | refName }}</td>
          </ng-container>
          <ng-container matColumnDef="dept">
            <th mat-header-cell *matHeaderCellDef>Phòng ban</th>
            <td mat-cell *matCellDef="let p">{{ p.departmentId | refName: '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="time">
            <th mat-header-cell *matHeaderCellDef>Thời gian</th>
            <td mat-cell *matCellDef="let p">
              {{ p.startDate | date: 'dd/MM/yy' }} – {{ p.endDate | date: 'dd/MM/yy' }}
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
            <td mat-cell *matCellDef="let p"><span class="badge {{ p.status }}">{{ p.status | label: statusLabels }}</span></td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let p; columns: cols" class="clickable" [routerLink]="['/projects', p._id]"></tr>
        </table>
        <div class="empty" *ngIf="!loading() && !rows().length">Chưa có dự án nào</div>
        <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page - 1" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
      </div>
    </div>
  `,
})
export class ProjectListComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  readonly statusLabels = PROJECT_STATUS_LABELS;
  readonly statuses = Object.entries(PROJECT_STATUS_LABELS);
  readonly cols = ['code', 'name', 'owner', 'dept', 'time', 'status'];
  readonly canCreate = inject(AuthService).hasRole('admin', 'director', 'manager');

  rows = signal<Project[]>([]);
  total = signal(0);
  loading = signal(false);
  page = 1;
  limit = 20;
  status = '';
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
    this.api
      .get<Paginated<Project>>('/projects', { page: this.page, limit: this.limit, status: this.status, q: this.q })
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
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.load();
  }

  openDialog() {
    this.dialog
      .open(ProjectDialogComponent, { data: null, width: '640px' })
      .afterClosed()
      .subscribe((p) => p && this.load());
  }
}
