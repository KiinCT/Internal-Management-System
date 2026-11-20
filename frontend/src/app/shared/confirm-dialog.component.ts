import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';
import { SHARED_IMPORTS } from './material';

export interface ConfirmData {
  title: string;
  message?: string;
  confirmText?: string;
  danger?: boolean;
  /** Hiển thị ô nhập (ví dụ lý do từ chối). */
  input?: { label: string; required?: boolean };
}

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p *ngIf="data.message">{{ data.message }}</p>
      <mat-form-field *ngIf="data.input" appearance="outline" class="w-100">
        <mat-label>{{ data.input.label }}</mat-label>
        <textarea matInput rows="3" [(ngModel)]="text"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="undefined">Hủy</button>
      <button
        mat-flat-button
        [color]="data.danger ? 'warn' : 'primary'"
        [disabled]="!!data.input?.required && !text.trim()"
        [mat-dialog-close]="data.input ? text : true"
      >
        {{ data.confirmText || 'Đồng ý' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  data = inject<ConfirmData>(MAT_DIALOG_DATA);
  text = '';
}

/** Mở hộp xác nhận; trả về true/chuỗi nhập khi đồng ý, undefined khi hủy. */
export function confirmDialog(dialog: MatDialog, data: ConfirmData): Observable<string | true | undefined> {
  return dialog
    .open(ConfirmDialogComponent, { data, width: '440px' })
    .afterClosed()
    .pipe(map((r) => r as string | true | undefined));
}
