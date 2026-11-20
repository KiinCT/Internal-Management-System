import { Pipe, PipeTransform } from '@angular/core';
import { refName } from '../core/models';

/** {{ value | label: MAP }} -> nhãn tiếng Việt. */
@Pipe({ name: 'label', standalone: true })
export class LabelPipe implements PipeTransform {
  transform(value: string | null | undefined, map: Record<string, string>): string {
    return value ? map[value] ?? value : '';
  }
}

/** {{ task.assigneeId | refName }} -> tên từ ref đã populate. */
@Pipe({ name: 'refName', standalone: true })
export class RefNamePipe implements PipeTransform {
  transform(value: unknown, fallback = ''): string {
    return refName(value) || fallback;
  }
}

/** Định dạng dung lượng file. */
@Pipe({ name: 'fileSize', standalone: true })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

/** Kiểm tra quá hạn: ngày < hiện tại và chưa hoàn thành. */
@Pipe({ name: 'overdue', standalone: true })
export class OverduePipe implements PipeTransform {
  transform(date: string | undefined | null, status?: string): boolean {
    if (!date || status === 'done' || status === 'cancelled') return false;
    return new Date(date).getTime() < Date.now();
  }
}

export const SHARED_PIPES = [LabelPipe, RefNamePipe, FileSizePipe, OverduePipe] as const;
