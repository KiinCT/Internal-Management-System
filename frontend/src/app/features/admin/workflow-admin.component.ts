import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LookupService } from '../../core/data.service';
import { APPROVER_TYPE_LABELS, ROLE_LABELS, WORKFLOW_TYPE_LABELS } from '../../core/labels';
import { UserRef, WorkflowTemplate } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe } from '../../shared/pipes';

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Văn bản',
  textarea: 'Đoạn văn',
  number: 'Số',
  date: 'Ngày',
  select: 'Lựa chọn',
};

type FieldInput = Partial<{ key: string; label: string; type: string; required: boolean; options: string[] }>;
type StepInput = Partial<WorkflowTemplate['steps'][number]>;

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe],
  templateUrl: './workflow-admin.component.html',
  styles: [
    `
      .layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }
      @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
      .selected { background: #eff6ff; }
      .line { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 8px; align-items: center; }
      .line mat-checkbox { white-space: nowrap; }
      .step-no { font-size: 18px; text-align: center; }
    `,
  ],
})
export class WorkflowAdminComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private notify = inject(NotifyService);
  private lookup = inject(LookupService);
  readonly typeLabels = WORKFLOW_TYPE_LABELS;
  readonly types = Object.entries(WORKFLOW_TYPE_LABELS);
  readonly approverTypes = Object.entries(APPROVER_TYPE_LABELS);
  readonly roles = Object.entries(ROLE_LABELS);
  readonly fieldTypes = Object.entries(FIELD_TYPE_LABELS);

  templates = signal<WorkflowTemplate[]>([]);
  users = signal<UserRef[]>([]);
  editingId = signal<string | null>(null);
  showEditor = signal(false);
  saving = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    type: ['general', Validators.required],
    description: [''],
    isActive: [true],
    formFields: this.fb.array<FormGroup>([]),
    steps: this.fb.array<FormGroup>([]),
  });

  get fields(): FormArray<FormGroup> {
    return this.form.get('formFields') as FormArray<FormGroup>;
  }

  get steps(): FormArray<FormGroup> {
    return this.form.get('steps') as FormArray<FormGroup>;
  }

  ngOnInit() {
    this.lookup.users().subscribe((u) => this.users.set(u));
    this.load();
  }

  load() {
    this.api.get<WorkflowTemplate[]>('/workflow-templates', { all: 'true' }).subscribe({
      next: (t) => this.templates.set(t),
      error: (e) => this.notify.apiError(e),
    });
  }

  private fieldGroup(f?: FieldInput) {
    return this.fb.group({
      key: [f?.key ?? '', [Validators.required, Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)]],
      label: [f?.label ?? '', Validators.required],
      type: [f?.type ?? 'text', Validators.required],
      options: [(f?.options ?? []).join(', ')],
      required: [f?.required ?? false],
    });
  }

  private stepGroup(s?: StepInput) {
    return this.fb.group({
      name: [s?.name ?? '', Validators.required],
      approverType: [s?.approverType ?? 'manager', Validators.required],
      approverRole: [s?.approverRole ?? 'staff'],
      approverId: [s?.approverId ?? ''],
      minAmount: [(s?.minAmount ?? null) as number | null],
    });
  }

  addField() {
    this.fields.push(this.fieldGroup());
  }

  addStep() {
    this.steps.push(this.stepGroup());
  }

  newTemplate() {
    this.editingId.set(null);
    this.setValue({ name: '', type: 'general', description: '', isActive: true, formFields: [], steps: [] });
    this.addStep();
    this.showEditor.set(true);
  }

  edit(t: WorkflowTemplate) {
    this.editingId.set(t._id);
    this.setValue(t);
    this.showEditor.set(true);
  }

  private setValue(t: Partial<WorkflowTemplate>) {
    this.fields.clear();
    this.steps.clear();
    (t.formFields ?? []).forEach((f) => this.fields.push(this.fieldGroup(f)));
    (t.steps ?? []).forEach((s) => this.steps.push(this.stepGroup(s)));
    this.form.patchValue({
      name: t.name ?? '',
      type: t.type ?? 'general',
      description: t.description ?? '',
      isActive: t.isActive ?? true,
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const formFields = (v.formFields as Record<string, unknown>[]).map((f) => {
      const type = String(f['type']);
      return {
        key: f['key'],
        label: f['label'],
        type,
        required: !!f['required'],
        options: type === 'select' ? String(f['options'] ?? '').split(',').map((o) => o.trim()).filter(Boolean) : [],
      };
    });
    const steps = (v.steps as Record<string, unknown>[]).map((s, i) => {
      const type = String(s['approverType']);
      const step: Record<string, unknown> = { order: i + 1, name: s['name'], approverType: type };
      if (type === 'role') step['approverRole'] = s['approverRole'];
      if (type === 'user') step['approverId'] = s['approverId'];
      if (s['minAmount'] !== null && s['minAmount'] !== '') step['minAmount'] = Number(s['minAmount']);
      return step;
    });
    const body = {
      name: v.name,
      type: v.type,
      description: v.description || undefined,
      isActive: v.isActive,
      formFields,
      steps,
    };
    const id = this.editingId();
    this.saving.set(true);
    const req$ = id
      ? this.api.patch<WorkflowTemplate>(`/workflow-templates/${id}`, body)
      : this.api.post<WorkflowTemplate>('/workflow-templates', body);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Đã lưu mẫu quy trình');
        this.showEditor.set(false);
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }
}
