import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Chặn route khi chưa đăng nhập. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn() && auth.refreshToken) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Chặn trang login khi đã đăng nhập. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/dashboard']) : true;
};

/** Giới hạn route theo vai trò: data: { roles: ['admin'] }. */
export const roleGuard: CanActivateFn = (route) => {
  const roles = (route.data?.['roles'] ?? []) as Role[];
  if (!roles.length || inject(AuthService).hasRole(...roles)) return true;
  return inject(Router).createUrlTree(['/dashboard']);
};
