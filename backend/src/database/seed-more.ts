/**
 * Bổ sung thêm dữ liệu mẫu MÀ KHÔNG xóa dữ liệu hiện có.
 * Chạy: npm run seed:more   (có thể chạy lại nhiều lần, mục đã tồn tại sẽ được bỏ qua)
 * Yêu cầu đã chạy "npm run seed" trước đó (cần admin, mẫu quy trình, tài nguyên).
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { seedBookings, seedAssets } from './seed-more-ops';
import { seedPeople } from './seed-more-people';
import { seedProjects } from './seed-more-projects';
import { seedRequests } from './seed-more-requests';
import { Ctx, log, makeRng, modelOf } from './seed-util';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const model = (name: string) => modelOf(app, name);

  if (!(await model('User').exists({ email: 'admin@demo.com' }))) {
    log('Chưa có dữ liệu gốc. Hãy chạy "npm run seed" trước.');
    await app.close();
    process.exit(1);
  }

  const ctx: Ctx = { app, r: makeRng(20261120), now: Date.now(), users: new Map(), depts: new Map(), model };
  await seedPeople(ctx);
  await seedProjects(ctx);
  await seedRequests(ctx);
  await seedAssets(ctx);
  await seedBookings(ctx);

  const counts: Record<string, number> = {};
  for (const n of ['User', 'Department', 'Project', 'Task', 'TaskComment', 'WorkRequest', 'Asset', 'Booking', 'Notification']) {
    counts[n] = await model(n).countDocuments({});
  }
  log(`Tổng số bản ghi hiện có: ${JSON.stringify(counts)}`);
  await app.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
