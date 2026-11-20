import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { REQUEST_STATUS_LABELS, STEP_STATUS_LABELS } from '../../core/labels';
import { refId, UserRef, WorkflowTemplate, WorkRequest } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { confirmDialog } from '../../shared/confirm-dialog.component';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, RefNamePipe } from '../../shared/pipes';

const STEP_ICONS: Record<string, string> = {
  approved: 'check',
  rejected: 'close',
  pending: 'hourglass_top',
  skipped: 'redo',
};

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.scss'],
})
export class RequestDetailComponent implements OnChanges {
  @Input() id!: string;

  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  private me = inject(AuthService).user()?._id ?? '';
  readonly statusLabels = REQUEST_STATUS_LABELS;
  readonly stepLabels = STEP_STATUS_LABELS;

  req = signal<WorkRequest | null>(null);
  template = signal<WorkflowTemplate | null>(null);
  busy = signal(false);

  canAct = computed(() => {
    const r = this.req();
    return !!r && r.status === 'pending' && r.currentApproverIds.map(String).includes(this.me);
  });
  canCancel = computed(() => {
    const r = this.req();
    return !!r && r.status === 'pending' && refId(r.requesterId) === this.me;
  });

  /** Hiển thị formData theo nhãn trong template (fallback về key). */
  fields = computed(() => {
    const r = this.req();
    if (!r) return [];
    const defs = this.template()?.formFields ?? [];
    const keys = defs.length ? defs.map((f) => f.key) : Object.keys(r.formData);
    return keys
      .filter((k) => r.formData[k] !== undefined)
      .map((k) => {
        const def = defs.find((f) => f.key === k);
        const v = r.formData[k];
        let value = String(v);
        if (def?.type === 'number') value = Number(v).toLocaleString('vi-VN');
        if (def?.type === 'date') value = new Date(String(v)).toLocaleDateString('vi-VN');
        return { label: def?.label ?? k, value };
      });
  });

  ngOnChanges() {
    this.template.set(null);
    this.load();
  }

  load() {
    this.api.get<WorkRequest>(`/requests/${this.id}`).subscribe({
      next: (r) => {
        this.req.set(r);
        if (!this.template()) {
          this.api.get<WorkflowTemplate>(`/workflow-templates/${r.templateId}`).subscribe({
            next: (t) => this.template.set(t),
            error: () => undefined,
          });
        }
      },
      error: (e) => this.notify.apiError(e),
    });
  }

  approverNames(list: (UserRef | string)[]) {
    return list
      .map((u) => (typeof u === 'object' ? u.fullName : ''))
      .filter(Boolean)
      .join(', ');
  }

  stepIcon(s: string) {
    return STEP_ICONS[s] ?? 'more_horiz';
  }

  private act(path: string, body: unknown, msg: string) {
    this.busy.set(true);
    this.api.post<WorkRequest>(`/requests/${this.id}/${path}`, body).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success(msg);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.notify.apiError(e);
        this.load();
      },
    });
  }

  approve() {
    confirmDialog(this.dialog, {
      title: 'Phê duyệt đơn?',
      input: { label: 'Ý kiến (không bắt buộc)' },
      confirmText: 'Duyệt',
    }).subscribe((r) => {
      if (r === undefined) return;
      const comment = typeof r === 'string' && r.trim() ? r.trim() : undefined;
      this.act('approve', { comment }, 'Đã phê duyệt');
    });
  }

  reject() {
    confirmDialog(this.dialog, {
      title: 'Từ chối đơn?',
      input: { label: 'Lý do từ chối', required: true },
      confirmText: 'Từ chối',
      danger: true,
    }).subscribe((r) => {
      if (typeof r === 'string' && r.trim()) this.act('reject', { comment: r.trim() }, 'Đã từ chối đơn');
    });
  }

  cancel() {
    confirmDialog(this.dialog, { title: 'Hủy đơn này?', danger: true, confirmText: 'Hủy đơn' }).subscribe(
      (ok) => ok && this.act('cancel', {}, 'Đã hủy đơn'),
    );
  }
}
