import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import jwtDecode from 'jwt-decode';
import { finalize, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role, User } from './models';

interface LoginResponse { accessToken: string; refreshToken: string; user: User }
interface Tokens { accessToken: string; refreshToken: string }
interface JwtPayload { sub: string; email: string; role: Role; exp: number }

const ACCESS_KEY = 'wms_access';
const REFRESH_KEY = 'wms_refresh';
const USER_KEY = 'wms_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = environment.apiUrl;

  /** User hiện tại dạng signal để template tự cập nhật. */
  readonly user = signal<User | null>(this.readUser());
  readonly isLoggedIn = computed(() => !!this.user());
  readonly role = computed(() => this.user()?.role ?? null);

  /** Request refresh đang chạy, dùng chung để tránh gọi refresh nhiều lần song song. */
  private refreshing$: Observable<Tokens> | null = null;

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, { email, password }).pipe(
      tap((res) => {
        this.storeTokens(res);
        this.setUser(res.user);
      }),
    );
  }

  refresh(): Observable<Tokens> {
    if (!this.refreshing$) {
      this.refreshing$ = this.http
        .post<Tokens>(`${this.api}/auth/refresh`, { refreshToken: this.refreshToken })
        .pipe(
          tap((t) => this.storeTokens(t)),
          finalize(() => (this.refreshing$ = null)),
          shareReplay(1),
        );
    }
    return this.refreshing$;
  }

  /** Đăng xuất: gọi API (bỏ qua lỗi) rồi xóa phiên cục bộ. */
  logout(callApi = true): void {
    const done = () => {
      this.clear();
      this.router.navigate(['/login']);
    };
    if (callApi && this.accessToken) {
      this.http.post(`${this.api}/auth/logout`, {}).subscribe({ complete: done, error: done });
    } else {
      done();
    }
  }

  loadMe(): Observable<User | null> {
    if (!this.accessToken) return of(null);
    return this.http.get<User>(`${this.api}/auth/me`).pipe(tap((u) => this.setUser(u)));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.patch(`${this.api}/auth/change-password`, { currentPassword, newPassword });
  }

  hasRole(...roles: Role[]): boolean {
    const r = this.role();
    return !!r && roles.includes(r);
  }

  /** Access token còn hạn (trừ hao 10 giây). */
  isAccessTokenValid(): boolean {
    const t = this.accessToken;
    if (!t) return false;
    try {
      return jwtDecode<JwtPayload>(t).exp * 1000 > Date.now() + 10_000;
    } catch {
      return false;
    }
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  private storeTokens(t: Tokens) {
    localStorage.setItem(ACCESS_KEY, t.accessToken);
    localStorage.setItem(REFRESH_KEY, t.refreshToken);
  }

  private setUser(u: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this.user.set(u);
  }

  private readUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw && localStorage.getItem(REFRESH_KEY) ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
