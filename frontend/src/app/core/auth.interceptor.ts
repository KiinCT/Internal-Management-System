import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { NotifyService } from './notify.service';

const SKIP_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

function withToken(req: HttpRequest<unknown>, token: string | null) {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * - Gắn access token vào mọi request.
 * - Khi gặp 401: gọi /auth/refresh một lần (dùng chung giữa các request) rồi gửi lại.
 * - Refresh thất bại: đăng xuất.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notify = inject(NotifyService);
  const isAuthCall = SKIP_REFRESH.some((p) => req.url.includes(p));

  return next(withToken(req, isAuthCall && !req.url.includes('/auth/logout') ? null : auth.accessToken)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthCall || !auth.refreshToken) {
        return throwError(() => err);
      }
      return auth.refresh().pipe(
        switchMap((t) => next(withToken(req, t.accessToken))),
        catchError((refreshErr) => {
          notify.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
          auth.logout(false);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
