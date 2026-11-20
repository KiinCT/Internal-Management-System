import { Component, inject, OnInit, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../core/api.service';
import { Paginated } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { RefNamePipe } from '../../shared/pipes';

export interface AuditLogRow {
  _id: string;
  userId?: { fullName: string; email: string } | null;
  method: string;
  path: string;
  entity?: string;
  entityId?: string;
  statusCode?: number;
  ip?: string;
  createdAt: string;
}

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, RefNamePipe],
  template: `
    <div class="page">
      <div class="page-header"><h1>Nhật ký hệ thống</h1></div>
      <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="time">
            <th mat-header-cell *matHeaderCellDef>Thời gian</th>
            <td mat-cell *matCellDef="let l">{{ l.createdAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
          </ng-container>
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>Người thực hiện</th>
            <td mat-cell *matCellDef="let l">{{ l.userId | refName: 'Hệ thống' }}</td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef>Thao tác</th>
            <td mat-cell *matCellDef="let l"><span class="badge">{{ l.method }}</span> {{ l.path }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Mã HTTP</th>
            <td mat-cell *matCellDef="let l">{{ l.statusCode }}</td>
          </ng-container>
          <ng-container matColumnDef="ip">
            <th mat-header-cell *matHeaderCellDef>IP</th>
            <td mat-cell *matCellDef="let l">{{ l.ip }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let l; columns: cols"></tr>
        </table>
        <div class="empty" *ngIf="!loading() && !rows().length">Chưa có nhật ký</div>
        <mat-paginator [length]="total()" [pageSize]="limit" [pageIndex]="page - 1" [pageSizeOptions]="[20, 50, 100]" (page)="onPage($event)"></mat-paginator>
      </div>
    </div>
  `,
})
export class AuditLogComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  readonly cols = ['time', 'user', 'action', 'status', 'ip'];

  rows = signal<AuditLogRow[]>([]);
  total = signal(0);
  loading = signal(false);
  page = 1;
  limit = 20;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.get<Paginated<AuditLogRow>>('/audit-logs', { page: this.page, limit: this.limit }).subscribe({
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
}
