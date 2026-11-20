import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { LookupService } from '../../core/data.service';
import { ROLE_LABELS } from '../../core/labels';
import { Department, refId, User, UserRef } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Sửa người dùng' : 'Thêm người dùng' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid mt-16">
        <mat-form-field appearance="outline">
          <mat-label>Họ tên</mat-label>
          <input matInput formControlName="fullName" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ data ? 'Đặt lại mật khẩu (bỏ trống nếu giữ)' : 'Mật khẩu' }}</mat-label>
          <input matInput formControlName="password" type="password" autocomplete="new-password" />
          <mat-error>Tối thiểu 6 ký tự</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Vai trò</mat-label>
          <mat-select formControlName="role">
            <mat-option *ngFor="let r of roles" [value]="r[0]">{{ r[1] }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Phòng ban</mat-label>
          <mat-select formControlName="departmentId">
            <mat-option [value]="null">—</mat-option>
            <mat-option *ngFor="let d of departments()" [value]="d._id">{{ d.name }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Quản lý trực tiếp</mat-label>
          <mat-select formControlName="managerId">
            <mat-option [value]="null">—</mat-option>
            <ng-container *ngFor="let u of users()">
              <mat-option *ngIf="u._id !== data?._id" [value]="u._id">{{ u.fullName }}</mat-option>
            </ng-container>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Chức danh</mat-label>
          <input matInput formControlName="position" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Điện thoại</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
        <mat-slide-toggle *ngIf="data" formControlName="isActive" class="full">Đang hoạt động</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Hủy</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">Lưu</button>
    </mat-dialog-actions>
  `,
})
export class UserDialogComponent implements OnInit {
  data = inject<User | null>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<UserDialogComponent>);
  private api = inject(ApiService);
  private lookup = inject(LookupService);
  private notify = inject(NotifyService);
  readonly roles = Object.entries(ROLE_LABELS);

  departments = signal<Department[]>([]);
  users = signal<UserRef[]>([]);
  saving = signal(false);

  form = inject(FormBuilder).group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.data ? Validators.minLength(6) : [Validators.required, Validators.minLength(6)]],
    role: ['staff'],
    departmentId: [null as string | null],
    managerId: [null as string | null],
    position: [''],
    phone: [''],
    isActive: [true],
  });

  ngOnInit() {
    this.lookup.departments().subscribe((d) => this.departments.set(d));
    this.lookup.users().subscribe((u) => this.users.set(u));
    const u = this.data;
    if (u) {
      this.form.patchValue({
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        departmentId: refId(u.departmentId),
        managerId: refId(u.managerId),
        position: u.position ?? '',
        phone: u.phone ?? '',
        isActive: u.isActive,
      });
      this.form.controls.email.disable();
    }
  }

  save() {
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      fullName: v.fullName,
      role: v.role,
      departmentId: v.departmentId || undefined,
      managerId: v.managerId || undefined,
      position: v.position || undefined,
      phone: v.phone || undefined,
    };
    if (v.password) body['password'] = v.password;
    if (this.data) body['isActive'] = v.isActive;
    else body['email'] = v.email;

    this.saving.set(true);
    const req$ = this.data ? this.api.patch(`/users/${this.data._id}`, body) : this.api.post('/users', body);
    req$.subscribe({
      next: (r) => {
        this.lookup.invalidate();
        this.notify.success('Đã lưu người dùng');
        this.ref.close(r);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }
}
