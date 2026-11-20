import { Component, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ASSET_STATUS_LABELS } from '../../core/labels';
import { Asset, Paginated } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { confirmDialog } from '../../shared/confirm-dialog.component';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, RefNamePipe } from '../../shared/pipes';
import { AssetDialogComponent } from './asset-dialog.component';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe],
  templateUrl: './asset-list.component.html',
})
export class AssetListComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  readonly canManage = inject(AuthService).hasRole('admin', 'director');
  readonly statusLabels = ASSET_STATUS_LABELS;
  readonly statuses = Object.entries(ASSET_STATUS_LABELS);
  readonly cols = ['code', 'name', 'category', 'price', 'assignedTo', 'status', ...(this.canManage ? ['actions'] : [])];

  rows = signal<Asset[]>([]);
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
      .get<Paginated<Asset>>('/assets', { page: this.page, limit: this.limit, status: this.status, q: this.q })
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

  edit(asset: Asset | null) {
    this.dialog
      .open(AssetDialogComponent, { data: { mode: 'edit', asset }, width: '600px' })
      .afterClosed()
      .subscribe((r) => r && this.load());
  }

  assign(asset: Asset) {
    this.dialog
      .open(AssetDialogComponent, { data: { mode: 'assign', asset }, width: '480px' })
      .afterClosed()
      .subscribe((r) => r && this.load());
  }

  returnAsset(a: Asset) {
    confirmDialog(this.dialog, {
      title: `Thu hồi ${a.code}?`,
      input: { label: 'Ghi chú tình trạng (không bắt buộc)' },
      confirmText: 'Thu hồi',
    }).subscribe((r) => {
      if (r === undefined) return;
      const note = typeof r === 'string' && r.trim() ? r.trim() : undefined;
      this.api.post(`/assets/${a._id}/return`, { note }).subscribe({
        next: () => {
          this.notify.success('Đã thu hồi tài sản');
          this.load();
        },
        error: (e) => this.notify.apiError(e),
      });
    });
  }
}
