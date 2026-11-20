import { inject, Injectable } from '@angular/core';
import { shareReplay } from 'rxjs';
import { ApiService } from './api.service';
import { Department, UserRef } from './models';

/** Dữ liệu tra cứu dùng chung (cache trong phiên). */
@Injectable({ providedIn: 'root' })
export class LookupService {
  private api = inject(ApiService);
  private users$ = this.api.get<UserRef[]>('/users/lookup').pipe(shareReplay(1));
  private departments$ = this.api.get<Department[]>('/departments').pipe(shareReplay(1));

  users() {
    return this.users$;
  }

  departments() {
    return this.departments$;
  }

  /** Gọi sau khi thêm/sửa user hoặc phòng ban. */
  invalidate() {
    this.users$ = this.api.get<UserRef[]>('/users/lookup').pipe(shareReplay(1));
    this.departments$ = this.api.get<Department[]>('/departments').pipe(shareReplay(1));
  }
}
