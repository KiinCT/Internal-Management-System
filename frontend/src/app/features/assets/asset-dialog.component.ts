import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { LookupService } from '../../core/data.service';
import { ASSET_STATUS_LABELS } from '../../core/labels';
import { Asset, UserRef } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';

export interface AssetDialogData {
  mode: 'edit' | 'assign';
  asset: Asset | null;
}

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './asset-dialog.component.html',
})
export class AssetDialogComponent implements OnInit {
  data = inject<AssetDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<AssetDialogComponent>);
  private api = inject(ApiService);
  private lookup = inject(LookupService);
  private notify = inject(NotifyService);
  readonly editableStatuses = Object.entries(ASSET_STATUS_LABELS).filter(([k]) => k !== 'in_use');

  users = signal<UserRef[]>([]);
  saving = signal(false);
  userId = '';
  note = '';

  form = inject(FormBuilder).group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    category: ['', Validators.required],
    serialNumber: [''],
    price: [null as number | null, Validators.min(0)],
    purchaseDate: [null as Date | null],
    status: [''],
    note: [''],
  });

  ngOnInit() {
    if (this.data.mode === 'assign') {
      this.lookup.users().subscribe((u) => this.users.set(u));
      return;
    }
    const a = this.data.asset;
    if (a) {
      this.form.patchValue({
        code: a.code,
        name: a.name,
        category: a.category,
        serialNumber: a.serialNumber ?? '',
        price: a.price ?? null,
        purchaseDate: a.purchaseDate ? new Date(a.purchaseDate) : null,
        status: a.status,
        note: a.note ?? '',
      });
      this.form.controls.code.disable();
    }
  }

  save() {
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      name: v.name,
      category: v.category,
      serialNumber: v.serialNumber || undefined,
      note: v.note || undefined,
      purchaseDate: v.purchaseDate ? new Date(v.purchaseDate).toISOString() : undefined,
    };
    if (v.price !== null && `${v.price}` !== '') body['price'] = Number(v.price);
    const a = this.data.asset;
    if (a) {
      if (v.status && v.status !== a.status && a.status !== 'in_use') body['status'] = v.status;
    } else {
      body['code'] = v.code;
    }
    this.saving.set(true);
    const req$ = a ? this.api.patch(`/assets/${a._id}`, body) : this.api.post('/assets', body);
    req$.subscribe({
      next: (r) => {
        this.notify.success('Đã lưu tài sản');
        this.ref.close(r);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }

  assign() {
    const body = { userId: this.userId, note: this.note || undefined };
    this.saving.set(true);
    this.api.post(`/assets/${this.data.asset!._id}/assign`, body).subscribe({
      next: (r) => {
        this.notify.success('Đã cấp phát tài sản');
        this.ref.close(r);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.apiError(e);
      },
    });
  }
}
