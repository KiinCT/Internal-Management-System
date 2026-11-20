import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { REQUEST_STATUS_LABELS, WORKFLOW_TYPE_LABELS } from '../../core/labels';
import { Paginated, WorkRequest } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, RefNamePipe } from '../../shared/pipes';

type Scope = 'mine' | 'pending' | 'all';
const TABS: Scope[] = ['mine', 'pending', 'all'];

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe],
  templateUrl: './request-list.component.html',
  styles: [
    `.count { margin-left: 6px; background: #ef4444; color: #fff; border-radius: 10px; padding: 0 7px; font-size: 12px; }`,
  ],
})
export class RequestListComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly statusLabels = REQUEST_STATUS_LABELS;
  readonly statuses = Object.entries(REQUEST_STATUS_LABELS);
  readonly types = Object.entries(WORKFLOW_TYPE_LABELS);
  readonly cols = ['code', 'title', 'requester', 'step', 'createdAt', 'status'];

  rows = signal<WorkRequest[]>([]);
  total = signal(0);
  loading = signal(false);
  pendingCount = signal(0);
  tabIndex = signal(0);
  scope: Scope = 'mine';
  status = '';
  type = '';
  page = 1;
  limit = 20;

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qp) => {
      const tab = qp.get('tab') as Scope;
      this.scope = TABS.includes(tab) ? tab : 'mine';
      this.tabIndex.set(TABS.indexOf(this.scope));
      this.page = 1;
      this.load();
    });
  }

  onTab(e: MatTabChangeEvent) {
    this.router.navigate([], { queryParams: { tab: TABS[e.index] } });
  }

  load() {
    this.loading.set(true);
    const params = {
      scope: this.scope,
      status: this.scope === 'pending' ? '' : this.status,
      type: this.type,
      page: this.page,
      limit: this.limit,
    };
    this.api.get<Paginated<WorkRequest>>('/requests', params).subscribe({
      next: (r) => {
        this.rows.set(r.data);
        this.total.set(r.meta.total);
        this.loading.set(false);
        if (this.scope === 'pending' && !this.type) this.pendingCount.set(r.meta.total);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.apiError(e);
      },
    });
    if (this.scope !== 'pending') {
      this.api
        .get<Paginated<WorkRequest>>('/requests/pending-approval', { limit: 1 })
        .subscribe((r) => this.pendingCount.set(r.meta.total));
    }
  }

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.load();
  }
}
