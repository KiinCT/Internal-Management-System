import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { APPROVER_TYPE_LABELS, ROLE_LABELS, WORKFLOW_TYPE_LABELS } from '../../core/labels';
import { WorkflowTemplate, WorkRequest } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe } from '../../shared/pipes';

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Form động: control được sinh từ template.formFields. */
@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe],
  templateUrl: './request-form.component.html',
  styles: [
    `
      .narrow { max-width: 900px; }
      .templates { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
      .tpl { padding: 16px; cursor: pointer; text-align: center; border: 2px solid transparent; }
      .tpl mat-icon { font-size: 32px; width: 32px; height: 32px; color: #3b82f6; }
      .tpl.selected { border-color: #3b82f6; background: #eff6ff; }
      .steps li { margin: 6px 0; }
    `,
  ],
})
export class RequestFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private notify = inject(NotifyService);
  readonly typeLabels = WORKFLOW_TYPE_LABELS;
  readonly approverLabels = APPROVER_TYPE_LABELS;
  readonly roleLabels = ROLE_LABELS;
  readonly icons: Record<string, string> = {
    leave: 'beach_access',
    purchase: 'shopping_cart',
    advance: 'payments',
    general: 'description',
  };

  templates = signal<WorkflowTemplate[]>([]);
  selected = signal<WorkflowTemplate | null>(null);
  saving = signal(false);
  form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
    formData: new FormGroup<Record<string, FormControl>>({}),
  });

  ngOnInit() {
    this.api.get<WorkflowTemplate[]>('/workflow-templates').subscribe({
      next: (t) => this.templates.set(t),
      error: (e) => this.notify.apiError(e),
    });
  }

  select(t: WorkflowTemplate) {
    const prev = this.selected();
    this.selected.set(t);
    const group = new FormGroup<Record<string, FormControl>>({});
    for (const f of t.formFields) {
      const v: ValidatorFn[] = f.required ? [Validators.required] : [];
      if (f.type === 'number') v.push(Validators.min(0));
      group.addControl(f.key, new FormControl(null, v));
    }
    this.form.setControl('formData', group);
    const title = this.form.controls.title;
    if (!title.value || title.value === prev?.name) title.setValue(t.name);
  }

  amountHint() {
    const v = Number(this.form.controls.formData.get('amount')?.value);
    return v ? `${v.toLocaleString('vi-VN')} đ` : '';
  }

  submit() {
    const t = this.selected();
    if (!t || this.form.invalid) return;
    const raw = this.form.controls.formData.getRawValue() as Record<string, unknown>;
    const formData: Record<string, unknown> = {};
    for (const f of t.formFields) {
      const v = raw[f.key];
      if (v === null || v === undefined || v === '') continue;
      formData[f.key] = v instanceof Date ? toLocalDate(v) : v;
    }
    this.saving.set(true);
    const body = { templateId: t._id, title: this.form.controls.title.value.trim(), formData };
    this.api.post<WorkRequest>('/requests', body).subscribe({
      next: (r) => {
        this.notify.success(`Đã gửi đơn ${r.code}`);
        this.router.navigate(['/requests', r._id]);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }
}
