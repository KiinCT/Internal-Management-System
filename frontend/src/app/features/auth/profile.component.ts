import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ROLE_LABELS } from '../../core/labels';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, RefNamePipe } from '../../shared/pipes';

function matchPassword(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('confirm')?.value ? null : { mismatch: true };
}

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, LabelPipe, RefNamePipe],
  template: `
    <div class="page">
      <div class="page-header"><h1>Tài khoản của tôi</h1></div>
      <div class="grid">
        <mat-card>
          <mat-card-header><mat-card-title>Thông tin</mat-card-title></mat-card-header>
          <mat-card-content *ngIf="auth.user() as u">
            <dl>
              <dt>Họ tên</dt><dd>{{ u.fullName }}</dd>
              <dt>Email</dt><dd>{{ u.email }}</dd>
              <dt>Vai trò</dt><dd>{{ u.role | label: roleLabels }}</dd>
              <dt>Phòng ban</dt><dd>{{ u.departmentId | refName: '—' }}</dd>
              <dt>Chức danh</dt><dd>{{ u.position || '—' }}</dd>
              <dt>Quản lý trực tiếp</dt><dd>{{ u.managerId | refName: '—' }}</dd>
            </dl>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-header><mat-card-title>Đổi mật khẩu</mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" class="mt-16">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Mật khẩu hiện tại</mat-label>
                <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Mật khẩu mới (tối thiểu 6 ký tự)</mat-label>
                <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Nhập lại mật khẩu mới</mat-label>
                <input matInput type="password" formControlName="confirm" autocomplete="new-password" />
              </mat-form-field>
              <div class="text-danger mb-16" *ngIf="form.hasError('mismatch') && form.get('confirm')?.dirty">
                Mật khẩu nhập lại không khớp
              </div>
              <button mat-flat-button color="primary" [disabled]="form.invalid || saving()">Cập nhật</button>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
      dl { display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin-top: 16px; }
      dt { color: #6b7280; }
      dd { margin: 0; }
    `,
  ],
})
export class ProfileComponent {
  auth = inject(AuthService);
  private notify = inject(NotifyService);
  readonly roleLabels = ROLE_LABELS;
  saving = signal(false);

  form = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', Validators.required],
    },
    { validators: matchPassword },
  );

  submit() {
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.notify.success('Đổi mật khẩu thành công, vui lòng đăng nhập lại');
        this.auth.logout(false);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }
}
