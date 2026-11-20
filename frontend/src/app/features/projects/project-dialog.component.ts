import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { LookupService } from '../../core/data.service';
import { PROJECT_STATUS_LABELS } from '../../core/labels';
import { Department, Project, refId, UserRef } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Sửa dự án' : 'Tạo dự án' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid mt-16">
        <mat-form-field appearance="outline">
          <mat-label>Mã dự án</mat-label>
          <input matInput formControlName="code" maxlength="20" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Trạng thái</mat-label>
          <mat-select formControlName="status">
            <mat-option *ngFor="let s of statuses" [value]="s[0]">{{ s[1] }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Tên dự án</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Mô tả</mat-label>
          <textarea matInput rows="3" formControlName="description"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Phòng ban</mat-label>
          <mat-select formControlName="departmentId">
            <mat-option [value]="null">—</mat-option>
            <mat-option *ngFor="let d of departments()" [value]="d._id">{{ d.name }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Thành viên</mat-label>
          <mat-select formControlName="memberIds" multiple>
            <mat-option *ngFor="let u of users()" [value]="u._id">{{ u.fullName }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ngày bắt đầu</mat-label>
          <input matInput [matDatepicker]="sd" formControlName="startDate" />
          <mat-datepicker-toggle matIconSuffix [for]="sd"></mat-datepicker-toggle>
          <mat-datepicker #sd></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ngày kết thúc</mat-label>
          <input matInput [matDatepicker]="ed" formControlName="endDate" />
          <mat-datepicker-toggle matIconSuffix [for]="ed"></mat-datepicker-toggle>
          <mat-datepicker #ed></mat-datepicker>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Hủy</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">Lưu</button>
    </mat-dialog-actions>
  `,
})
export class ProjectDialogComponent implements OnInit {
  data = inject<Project | null>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ProjectDialogComponent>);
  private api = inject(ApiService);
  private lookup = inject(LookupService);
  private notify = inject(NotifyService);
  readonly statuses = Object.entries(PROJECT_STATUS_LABELS);

  users = signal<UserRef[]>([]);
  departments = signal<Department[]>([]);
  saving = signal(false);

  form = inject(FormBuilder).group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', Validators.required],
    description: [''],
    status: ['active'],
    departmentId: [null as string | null],
    memberIds: [[] as string[]],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
  });

  ngOnInit() {
    this.lookup.users().subscribe((u) => this.users.set(u));
    this.lookup.departments().subscribe((d) => this.departments.set(d));
    if (this.data) {
      const p = this.data;
      this.form.patchValue({
        code: p.code,
        name: p.name,
        description: p.description ?? '',
        status: p.status,
        departmentId: refId(p.departmentId),
        memberIds: p.memberIds.map((m) => refId(m)!).filter(Boolean),
        startDate: p.startDate ? new Date(p.startDate) : null,
        endDate: p.endDate ? new Date(p.endDate) : null,
      });
    }
  }

  save() {
    const v = this.form.getRawValue();
    const body = {
      ...v,
      startDate: v.startDate ? new Date(v.startDate).toISOString() : undefined,
      endDate: v.endDate ? new Date(v.endDate).toISOString() : undefined,
      departmentId: v.departmentId || undefined,
    };
    this.saving.set(true);
    const req$ = this.data
      ? this.api.patch<Project>(`/projects/${this.data._id}`, body)
      : this.api.post<Project>('/projects', body);
    req$.subscribe({
      next: (p) => {
        this.notify.success('Đã lưu dự án');
        this.ref.close(p);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }
}
