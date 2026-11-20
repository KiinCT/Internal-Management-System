import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  private snack = inject(MatSnackBar);

  success(message: string) {
    this.snack.open(message, 'Đóng', { duration: 3000, panelClass: 'snack-success' });
  }

  error(message: string) {
    this.snack.open(message, 'Đóng', { duration: 5000, panelClass: 'snack-error' });
  }

  /** Hiển thị lỗi từ API (định dạng { message: string | string[] }). */
  apiError(err: unknown, fallback = 'Đã có lỗi xảy ra') {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return this.error('Không kết nối được máy chủ');
      if (err.status === 401) return; // interceptor đã xử lý
      const msg = err.error?.message;
      return this.error(Array.isArray(msg) ? msg.join('; ') : msg || fallback);
    }
    this.error(fallback);
  }
}
