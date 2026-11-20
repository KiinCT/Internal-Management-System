import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Resource } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <div class="page">
      <div class="page-header"><h1>Phòng họp & tài nguyên</h1></div>
      <div class="layout">
        <div class="table-wrap">
          <table mat-table [dataSource]="rows()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Tên</th>
              <td mat-cell *matCellDef="let r"><strong>{{ r.name }}</strong><div class="muted">{{ r.location }}</div></td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Loại</th>
              <td mat-cell *matCellDef="let r">{{ r.type === 'vehicle' ? 'Xe' : 'Phòng họp' }}</td>
            </ng-container>
            <ng-container matColumnDef="capacity">
              <th mat-header-cell *matHeaderCellDef>Sức chứa</th>
              <td mat-cell *matCellDef="let r">{{ r.capacity ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
              <td mat-cell *matCellDef="let r">
                <span class="badge" [class.done]="r.isActive" [class.cancelled]="!r.isActive">
                  {{ r.isActive ? 'Đang dùng' : 'Ngừng' }}
                </span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let r; columns: cols" class="clickable" (click)="edit(r)"></tr>
          </table>
          <div class="empty" *ngIf="!rows().length">Chưa có tài nguyên</div>
        </div>

        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ editing() ? 'Sửa tài nguyên' : 'Thêm tài nguyên' }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="save()" class="mt-16">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Tên</mat-label><input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Loại</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="meeting_room">Phòng họp</mat-option>
                  <mat-option value="vehicle">Xe</mat-option>
                  <mat-option value="equipment">Thiết bị</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Vị trí</mat-label><input matInput formControlName="location" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Sức chứa</mat-label><input matInput type="number" min="0" formControlName="capacity" />
              </mat-form-field>
              <mat-slide-toggle formControlName="isActive" class="mb-16">Đang sử dụng</mat-slide-toggle>
              <div class="flex gap-8">
                <button mat-flat-button color="primary" [disabled]="form.invalid || saving()">Lưu</button>
                <button mat-button type="button" *ngIf="editing()" (click)="reset()">Thêm mới</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .layout { display: grid; grid-template-columns: 1fr 360px; gap: 16px; align-items: start; }
      @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ResourceAdminComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  readonly cols = ['name', 'type', 'capacity', 'active'];

  rows = signal<Resource[]>([]);
  editing = signal<Resource | null>(null);
  saving = signal(false);
  form = inject(FormBuilder).group({
    name: ['', Validators.required],
    type: ['meeting_room', Validators.required],
    location: [''],
    capacity: [null as number | null, Validators.min(0)],
    isActive: [true],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<Resource[]>('/resources', { all: 'true' }).subscribe({
      next: (r) => this.rows.set(r),
      error: (e) => this.notify.apiError(e),
    });
  }

  edit(r: Resource) {
    this.editing.set(r);
    this.form.patchValue({ name: r.name, type: r.type, location: r.location ?? '', capacity: r.capacity ?? null, isActive: r.isActive });
  }

  reset() {
    this.editing.set(null);
    this.form.reset({ name: '', type: 'meeting_room', location: '', capacity: null, isActive: true });
  }

  save() {
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      name: v.name,
      type: v.type,
      location: v.location || undefined,
      isActive: v.isActive,
    };
    if (v.capacity !== null && `${v.capacity}` !== '') body['capacity'] = Number(v.capacity);
    const r = this.editing();
    this.saving.set(true);
    const req$ = r ? this.api.patch(`/resources/${r._id}`, body) : this.api.post('/resources', body);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Đã lưu tài nguyên');
        this.reset();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }
}
