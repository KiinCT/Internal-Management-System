import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'users',
    title: 'Người dùng',
    loadComponent: () => import('./user-admin.component').then((m) => m.UserAdminComponent),
  },
  {
    path: 'departments',
    title: 'Phòng ban',
    loadComponent: () => import('./department-admin.component').then((m) => m.DepartmentAdminComponent),
  },
  {
    path: 'workflows',
    title: 'Mẫu quy trình',
    loadComponent: () => import('./workflow-admin.component').then((m) => m.WorkflowAdminComponent),
  },
  {
    path: 'resources',
    title: 'Tài nguyên',
    loadComponent: () => import('./resource-admin.component').then((m) => m.ResourceAdminComponent),
  },
  {
    path: 'audit-logs',
    title: 'Nhật ký hệ thống',
    loadComponent: () => import('./audit-log.component').then((m) => m.AuditLogComponent),
    // Trang nhật ký dùng chung cho admin
  },
];
