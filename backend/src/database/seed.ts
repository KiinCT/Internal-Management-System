/**
 * Tạo dữ liệu mẫu. Chạy: npm run seed   (thêm -- --reset để xóa dữ liệu cũ)
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { ProjectStatus, Role, TaskPriority, TaskStatus } from '../common/enums';
import { Asset } from '../modules/assets/asset.schema';
import { Resource } from '../modules/bookings/booking.schema';
import { Department } from '../modules/departments/departments.module';
import { Project } from '../modules/projects/schemas/project.schema';
import { Task } from '../modules/tasks/schemas/task.schema';
import { User } from '../modules/users/schemas/user.schema';
import { WorkflowTemplate } from '../modules/workflows/schemas/workflow.schema';
import * as data from './seed-data';

const log = new Logger('Seed');
const DAY = 24 * 3600 * 1000;

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const model = <T>(name: string) => app.get<Model<T>>(getModelToken(name));
  const users = model<User>(User.name);
  const depts = model<Department>(Department.name);
  const projects = model<Project>(Project.name);
  const tasks = model<Task>(Task.name);

  if (process.argv.includes('--reset')) {
    await users.db.dropDatabase();
    log.warn('Da xoa toan bo du lieu cu');
  }
  if (await users.exists({})) {
    log.warn('Du lieu da ton tai, bo qua (dung seed:reset de tao lai)');
    await app.close();
    return;
  }
  // Đảm bảo index (unique...) được tạo trước khi insert
  await Promise.all(
    [User, Department, Project, Task, WorkflowTemplate, Asset, Resource].map((s) =>
      model(s.name).syncIndexes(),
    ),
  );

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@demo.com';
  const adminPw = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
  const adminHash = await bcrypt.hash(adminPw, 10);
  const userHash = await bcrypt.hash('User@123', 10);

  const [bgd, it, hr, acc] = await depts.insertMany([
    { name: 'Ban Giám đốc', code: 'BGD' },
    { name: 'Phòng Công nghệ', code: 'IT' },
    { name: 'Phòng Nhân sự - Hành chính', code: 'HCNS' },
    { name: 'Phòng Kế toán', code: 'KT' },
  ]);
  await depts.updateMany({ _id: { $in: [it._id, hr._id, acc._id] } }, { parentId: bgd._id });

  const mk = (email: string, fullName: string, role: Role, dept: Types.ObjectId, extra: Partial<User> = {}) =>
    users.create({ email, fullName, role, departmentId: dept, passwordHash: userHash, ...extra });

  const admin = await users.create({
    email: adminEmail, passwordHash: adminHash, fullName: 'Quản trị hệ thống', role: Role.ADMIN, departmentId: bgd._id,
  });
  const director = await mk('director@demo.com', 'Nguyễn Văn Giám', Role.DIRECTOR, bgd._id, { position: 'Giám đốc' });
  const mgr = { managerId: director._id };
  const itLead = await mk('manager.it@demo.com', 'Trần Thị Quản', Role.MANAGER, it._id, { ...mgr, position: 'Trưởng phòng IT' });
  const hrLead = await mk('manager.hr@demo.com', 'Lê Văn Nhân', Role.MANAGER, hr._id, { ...mgr, position: 'Trưởng phòng HCNS' });
  const accLead = await mk('manager.kt@demo.com', 'Phạm Thị Toán', Role.MANAGER, acc._id, { ...mgr, position: 'Kế toán trưởng' });
  const dev1 = await mk('dev1@demo.com', 'Hoàng Minh Dev', Role.STAFF, it._id, { managerId: itLead._id, position: 'Lập trình viên' });
  const dev2 = await mk('dev2@demo.com', 'Vũ Thu Test', Role.STAFF, it._id, { managerId: itLead._id, position: 'Tester' });

  await Promise.all([
    depts.updateOne({ _id: bgd._id }, { headId: director._id }),
    depts.updateOne({ _id: it._id }, { headId: itLead._id }),
    depts.updateOne({ _id: hr._id }, { headId: hrLead._id }),
    depts.updateOne({ _id: acc._id }, { headId: accLead._id }),
  ]);

  const now = Date.now();
  const p = await projects.create({
    name: 'Xây dựng hệ thống quản lý nội bộ',
    code: 'WMS',
    description: 'Dự án demo',
    ownerId: itLead._id,
    memberIds: [itLead._id, dev1._id, dev2._id],
    departmentId: it._id,
    status: ProjectStatus.ACTIVE,
    startDate: new Date(now - 14 * DAY),
    endDate: new Date(now + 60 * DAY),
  });

  const task = (title: string, status: TaskStatus, assignee: Types.ObjectId, order: number, dueDays: number, priority = TaskPriority.MEDIUM) => ({
    title, status, order, priority,
    projectId: p._id,
    assigneeId: assignee,
    reporterId: itLead._id,
    estimatedHours: 8,
    dueDate: new Date(now + dueDays * DAY),
    completedAt: status === TaskStatus.DONE ? new Date(now + Math.min(dueDays, 0) * DAY) : undefined,
  });
  await tasks.insertMany([
    task('Phân tích yêu cầu', TaskStatus.DONE, itLead._id, 0, -10, TaskPriority.HIGH),
    task('Thiết kế cơ sở dữ liệu', TaskStatus.DONE, dev1._id, 1, -2),
    task('API xác thực JWT', TaskStatus.IN_PROGRESS, dev1._id, 0, 2, TaskPriority.HIGH),
    task('Giao diện Kanban', TaskStatus.TODO, dev1._id, 0, 7),
    task('Viết test case đăng nhập', TaskStatus.REVIEW, dev2._id, 0, -1, TaskPriority.URGENT),
    task('Kiểm thử luồng phê duyệt', TaskStatus.TODO, dev2._id, 1, 10, TaskPriority.LOW),
  ]);

  await model<WorkflowTemplate>(WorkflowTemplate.name).insertMany(data.workflowTemplates(hrLead._id, accLead._id));
  await model<Asset>(Asset.name).insertMany(data.assets(dev1._id, admin._id));
  await model<Resource>(Resource.name).insertMany(data.resources);

  // Dùng warn vì context được tạo với logger chỉ bật error/warn
  log.warn('Seed thanh cong. Tai khoan:');
  log.warn(`  ${adminEmail} / ${adminPw} (admin)`);
  log.warn('  director@demo.com | manager.it@demo.com | manager.hr@demo.com | manager.kt@demo.com');
  log.warn('  dev1@demo.com | dev2@demo.com  -> mat khau: User@123');
  await app.close();
}

run().catch((e) => {
  log.error(e);
  process.exit(1);
});
