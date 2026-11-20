import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Tổng quan',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'projects',
        title: 'Dự án',
        loadComponent: () => import('./features/projects/project-list.component').then((m) => m.ProjectListComponent),
      },
      {
        path: 'projects/:id',
        title: 'Chi tiết dự án',
        loadComponent: () => import('./features/projects/project-detail.component').then((m) => m.ProjectDetailComponent),
      },
      {
        path: 'tasks',
        title: 'Công việc',
        loadComponent: () => import('./features/tasks/task-list.component').then((m) => m.TaskListComponent),
      },
      {
        path: 'my-tasks',
        title: 'Việc của tôi',
        data: { mine: true },
        loadComponent: () => import('./features/tasks/task-list.component').then((m) => m.TaskListComponent),
      },
      {
        path: 'tasks/:id',
        title: 'Chi tiết công việc',
        loadComponent: () => import('./features/tasks/task-detail.component').then((m) => m.TaskDetailComponent),
      },
      {
        path: 'requests',
        title: 'Đề xuất',
        loadComponent: () => import('./features/requests/request-list.component').then((m) => m.RequestListComponent),
      },
      {
        path: 'requests/new',
        title: 'Tạo đề xuất',
        loadComponent: () => import('./features/requests/request-form.component').then((m) => m.RequestFormComponent),
      },
      {
        path: 'requests/:id',
        title: 'Chi tiết đề xuất',
        loadComponent: () => import('./features/requests/request-detail.component').then((m) => m.RequestDetailComponent),
      },
      {
        path: 'assets',
        title: 'Tài sản',
        loadComponent: () => import('./features/assets/asset-list.component').then((m) => m.AssetListComponent),
      },
      {
        path: 'bookings',
        title: 'Đặt phòng',
        loadComponent: () => import('./features/bookings/booking.component').then((m) => m.BookingComponent),
      },
      {
        path: 'notifications',
        title: 'Thông báo',
        loadComponent: () => import('./features/notifications/notification-list.component').then((m) => m.NotificationListComponent),
      },
      {
        path: 'profile',
        title: 'Tài khoản',
        loadComponent: () => import('./features/auth/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
