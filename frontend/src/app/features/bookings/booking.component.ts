import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LookupService } from '../../core/data.service';
import { Booking, refId, Resource, UserRef } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { confirmDialog } from '../../shared/confirm-dialog.component';
import { SHARED_IMPORTS } from '../../shared/material';
import { RefNamePipe } from '../../shared/pipes';

const DAY = 24 * 3600 * 1000;

/** Thứ Hai đầu tuần (00:00 giờ địa phương). */
function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

/** Ghép ngày + "HH:mm" thành Date theo giờ địa phương. */
function combine(date: Date, time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, RefNamePipe],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.scss'],
})
export class BookingComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notify = inject(NotifyService);
  private lookup = inject(LookupService);
  private auth = inject(AuthService);

  readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  resources = signal<Resource[]>([]);
  users = signal<UserRef[]>([]);
  bookings = signal<Booking[]>([]);
  loading = signal(false);
  saving = signal(false);
  weekStart = signal(startOfWeek(new Date()));
  weekEnd = computed(() => new Date(this.weekStart().getTime() + 6 * DAY));
  days = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(this.weekStart().getTime() + i * DAY);
      const next = date.getTime() + DAY;
      const items = this.bookings().filter((b) => {
        const s = new Date(b.start).getTime();
        return s >= date.getTime() && s < next;
      });
      return { date, items };
    }),
  );

  showForm = false;
  resourceFilter = '';
  form = inject(FormBuilder).group({
    resourceId: ['', Validators.required],
    title: ['', Validators.required],
    date: [this.today as Date | null, Validators.required],
    from: ['09:00', Validators.required],
    to: ['10:00', Validators.required],
    attendeeIds: [[] as string[]],
    note: [''],
  });

  ngOnInit() {
    this.api.get<Resource[]>('/resources').subscribe((r) => this.resources.set(r));
    this.lookup.users().subscribe((u) => this.users.set(u));
    this.load();
  }

  load() {
    this.loading.set(true);
    const from = this.weekStart();
    const to = new Date(from.getTime() + 7 * DAY);
    this.api
      .get<Booking[]>('/bookings', { from: from.toISOString(), to: to.toISOString(), resourceId: this.resourceFilter })
      .subscribe({
        next: (b) => {
          this.bookings.set(b);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.notify.apiError(e);
        },
      });
  }

  shiftWeek(n: number) {
    this.weekStart.set(new Date(this.weekStart().getTime() + n * 7 * DAY));
    this.load();
  }

  goToday() {
    this.weekStart.set(startOfWeek(new Date()));
    this.load();
  }

  isToday(d: Date) {
    return d.getTime() === this.today.getTime();
  }

  canDelete(b: Booking) {
    return refId(b.bookedBy) === this.auth.user()?._id || this.auth.hasRole('admin', 'director');
  }

  book() {
    const v = this.form.getRawValue();
    if (!v.date || !v.from || !v.to) return;
    const start = combine(new Date(v.date), v.from);
    const end = combine(new Date(v.date), v.to);
    if (end <= start) {
      this.notify.error('Giờ kết thúc phải sau giờ bắt đầu');
      return;
    }
    this.saving.set(true);
    this.api
      .post('/bookings', {
        resourceId: v.resourceId,
        title: v.title,
        start: start.toISOString(),
        end: end.toISOString(),
        attendeeIds: v.attendeeIds ?? [],
        note: v.note || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notify.success('Đặt lịch thành công');
          this.form.patchValue({ title: '', note: '', attendeeIds: [] });
          this.showForm = false;
          this.weekStart.set(startOfWeek(start));
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.notify.apiError(e);
        },
      });
  }

  remove(b: Booking) {
    confirmDialog(this.dialog, { title: 'Hủy lịch đặt?', message: b.title, danger: true, confirmText: 'Hủy lịch' })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.delete(`/bookings/${b._id}`).subscribe({
          next: () => this.load(),
          error: (e) => this.notify.apiError(e),
        });
      });
  }
}
