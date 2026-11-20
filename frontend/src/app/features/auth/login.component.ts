import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <div class="login-wrap">
      <mat-card class="login-card">
        <div class="logo"><mat-icon>hub</mat-icon></div>
        <h1>Quản lý công việc nội bộ</h1>
        <p class="muted">Đăng nhập để tiếp tục</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" autocomplete="username" />
            <mat-error *ngIf="form.controls.email.invalid">Email không hợp lệ</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Mật khẩu</mat-label>
            <input
              matInput
              formControlName="password"
              [type]="showPw() ? 'text' : 'password'"
              autocomplete="current-password"
            />
            <button mat-icon-button matSuffix type="button" (click)="showPw.set(!showPw())">
              <mat-icon>{{ showPw() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error>Vui lòng nhập mật khẩu</mat-error>
          </mat-form-field>
          <div class="text-danger mb-16" *ngIf="error()">{{ error() }}</div>
          <button mat-flat-button color="primary" class="w-100 submit" [disabled]="loading()">
            {{ loading() ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </button>
        </form>
        <p class="muted hint">Demo: admin&#64;demo.com / Admin&#64;123 — dev1&#64;demo.com / User&#64;123</p>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-wrap { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #1e293b, #3b82f6); padding: 16px; }
      .login-card { width: 100%; max-width: 400px; padding: 32px 28px; text-align: center; }
      .logo mat-icon { font-size: 48px; width: 48px; height: 48px; color: #3b82f6; }
      h1 { font-size: 22px; margin: 8px 0 4px; }
      form { margin-top: 24px; text-align: left; }
      .submit { height: 44px; }
      .hint { margin-top: 20px; }
    `,
  ],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotifyService);

  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  loading = signal(false);
  error = signal('');
  showPw = signal(false);

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: (res) => {
        this.notify.success(`Xin chào ${res.user.fullName}`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message;
        this.error.set(
          err?.status === 0 ? 'Không kết nối được máy chủ' : Array.isArray(msg) ? msg.join('; ') : msg || 'Đăng nhập thất bại',
        );
      },
    });
  }
}
