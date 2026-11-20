import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type QueryParams = Record<string, string | number | boolean | null | undefined | string[]>;

/** Wrapper mỏng quanh HttpClient: thêm prefix API và bỏ qua param rỗng. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly base = environment.apiUrl;

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(this.base + path, { params: this.toParams(params) });
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(this.base + path, body);
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(this.base + path, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.base + path);
  }

  upload<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<T>(this.base + path, form);
  }

  download(path: string): Observable<Blob> {
    return this.http.get(this.base + path, { responseType: 'blob' });
  }

  private toParams(params?: QueryParams): HttpParams {
    let p = new HttpParams();
    if (!params) return p;
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined || v === '') continue;
      if (Array.isArray(v)) {
        // Mảng rỗng không được gửi, tránh tạo ra "status=" làm backend báo lỗi
        if (v.length) p = p.set(k, v.join(','));
        continue;
      }
      p = p.set(k, String(v));
    }
    return p;
  }
}
