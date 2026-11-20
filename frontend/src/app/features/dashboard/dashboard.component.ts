import { Component, inject, OnInit, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../core/labels';
import { Overview, Task } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SHARED_IMPORTS } from '../../shared/material';
import { LabelPipe, RefNamePipe } from '../../shared/pipes';

interface Workload { userId: string; fullName: string; open: number; overdue: number; estimatedHours: number }

const STATUS_COLORS: Record<string, string> = {
  todo: '#9ca3af',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
  cancelled: '#ef4444',
};

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, NgChartsModule, LabelPipe, RefNamePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  auth = inject(AuthService);
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;

  loading = signal(true);
  overview = signal<Overview | null>(null);
  overdue = signal<Task[]>([]);
  workload = signal<Workload[]>([]);

  statusChart = signal<ChartConfiguration<'doughnut'>['data']>({ labels: [], datasets: [] });
  trendChart = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } },
  };
  readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  ngOnInit() {
    forkJoin({
      overview: this.api.get<Overview>('/reports/overview'),
      byStatus: this.api.get<Record<string, number>>('/reports/tasks-by-status'),
      overdue: this.api.get<Task[]>('/reports/overdue'),
      workload: this.api.get<Workload[]>('/reports/workload'),
      trend: this.api.get<{ date: string; count: number }[]>('/reports/completed-trend'),
    }).subscribe({
      next: (r) => {
        this.overview.set(r.overview);
        this.overdue.set(r.overdue);
        this.workload.set(r.workload);
        const keys = Object.keys(r.byStatus).filter((k) => k !== 'cancelled');
        this.statusChart.set({
          labels: keys.map((k) => TASK_STATUS_LABELS[k] ?? k),
          datasets: [{ data: keys.map((k) => r.byStatus[k]), backgroundColor: keys.map((k) => STATUS_COLORS[k]) }],
        });
        this.trendChart.set({
          labels: r.trend.map((d) => d.date.slice(8, 10) + '/' + d.date.slice(5, 7)),
          datasets: [{ data: r.trend.map((d) => d.count), label: 'Hoàn thành', backgroundColor: '#3b82f6' }],
        });
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.apiError(e, 'Không tải được dữ liệu tổng quan');
      },
    });
  }
}
