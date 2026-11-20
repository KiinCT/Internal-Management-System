import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { LookupService } from '../../core/data.service';
import { Department, refId, UserRef } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { confirmDialog } from '../../shared/confirm-dialog.component';
import { SHARED_IMPORTS } from '../../shared/material';
import { RefNamePipe } from '../../shared/pipes';

interface Row {
  dept: Department;
  level: number;
}

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, RefNamePipe],
  templateUrl: './department-admin.component.html',
  styles: [
    `
      .layout { display: grid; grid-template-columns: 1fr 380px; gap: 16px; align-items: start; }
      @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
      .row { display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #f1f1f1; }
      .row.selected { background: #eff6ff; }
    `,
  ],
})
export class DepartmentAdminComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  private lookup = inject(LookupService);

  rows = signal<Row[]>([]);
  users = signal<UserRef[]>([]);
  editing = signal<Department | null>(null);
  form = inject(FormBuilder).group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    parentId: [null as string | null],
    headId: [null as string | null],
    description: [''],
  });

  ngOnInit() {
    this.lookup.users().subscribe((u) => this.users.set(u));
    this.load();
  }

  /** Làm phẳng cây phòng ban để hiển thị thụt lề. */
  load() {
    this.api.get<Department[]>('/departments/tree').subscribe({
      next: (tree) => {
        const out: Row[] = [];
        const walk = (nodes: Department[], level: number) =>
          nodes.forEach((d) => {
            out.push({ dept: d, level });
            walk(d.children ?? [], level + 1);
          });
        walk(tree, 0);
        this.rows.set(out);
      },
      error: (e) => this.notify.apiError(e),
    });
  }

  edit(d: Department) {
    this.editing.set(d);
    this.form.patchValue({
      name: d.name,
      code: d.code,
      parentId: d.parentId ? String(d.parentId) : null,
      headId: refId(d.headId),
      description: d.description ?? '',
    });
  }

  reset() {
    this.editing.set(null);
    this.form.reset({ name: '', code: '', parentId: null, headId: null, description: '' });
  }

  save() {
    const v = this.form.getRawValue();
    const d = this.editing();
    // Khi sửa: gửi null để xóa liên kết; khi tạo: bỏ trường rỗng
    const body: Record<string, unknown> = { name: v.name, code: v.code, description: v.description ?? '' };
    if (d) {
      body['parentId'] = v.parentId || null;
      body['headId'] = v.headId || null;
    } else {
      if (v.parentId) body['parentId'] = v.parentId;
      if (v.headId) body['headId'] = v.headId;
    }
    const req$ = d ? this.api.patch(`/departments/${d._id}`, body) : this.api.post('/departments', body);
    req$.subscribe({
      next: () => {
        this.notify.success('Đã lưu phòng ban');
        this.lookup.invalidate();
        this.reset();
        this.load();
      },
      error: (e) => this.notify.apiError(e),
    });
  }

  remove(d: Department) {
    confirmDialog(this.dialog, { title: `Xóa phòng ban ${d.name}?`, danger: true, confirmText: 'Xóa' }).subscribe(
      (ok) => {
        if (!ok) return;
        this.api.delete(`/departments/${d._id}`).subscribe({
          next: () => {
            this.notify.success('Đã xóa');
            this.lookup.invalidate();
            if (this.editing()?._id === d._id) this.reset();
            this.load();
          },
          error: (e) => this.notify.apiError(e),
        });
      },
    );
  }
}
