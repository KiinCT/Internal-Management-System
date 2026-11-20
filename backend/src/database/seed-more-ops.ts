/* eslint-disable @typescript-eslint/no-explicit-any */
import { AssetStatus } from '../common/enums';
import { MEETING_TITLES } from './seed-more-data';
import { Ctx, DAY, HOUR, int, log, pick, sample, weighted } from './seed-util';

const ASSET_CATALOG: { prefix: string; category: string; names: string[]; price: [number, number] }[] = [
  { prefix: 'LAP', category: 'Laptop', price: [18_000_000, 45_000_000], names: ['Dell Latitude 5440', 'Lenovo ThinkPad T14', 'MacBook Pro 14', 'HP EliteBook 840', 'Asus ExpertBook B5'] },
  { prefix: 'MON', category: 'Màn hình', price: [3_500_000, 9_000_000], names: ['LG 27 inch 4K', 'Dell UltraSharp 24', 'Samsung 32 inch cong'] },
  { prefix: 'PHN', category: 'Điện thoại', price: [6_000_000, 28_000_000], names: ['iPhone 14', 'Samsung Galaxy S23', 'Xiaomi Redmi Note 12'] },
  { prefix: 'PRN', category: 'Máy in', price: [4_000_000, 15_000_000], names: ['Canon LBP 2900', 'HP LaserJet Pro M404', 'Brother HL-L2321D'] },
  { prefix: 'FUR', category: 'Nội thất', price: [1_500_000, 14_000_000], names: ['Ghế công thái học', 'Bàn làm việc nâng hạ', 'Tủ hồ sơ 4 ngăn'] },
  { prefix: 'NET', category: 'Thiết bị mạng', price: [2_000_000, 30_000_000], names: ['Switch Cisco 24 cổng', 'Router Mikrotik', 'Access Point Ubiquiti'] },
];

export async function seedAssets(ctx: Ctx) {
  const Asset = ctx.model('Asset');
  const { r, now } = ctx;
  const people = [...ctx.users.values()].filter((u) => u.role !== 'admin');
  const admin = ctx.users.get('admin@demo.com');
  const docs: any[] = [];
  let n = await Asset.countDocuments({ code: /^[A-Z]{3}-1\d\d$/ });
  if (n > 0) {
    log('Tài sản demo đã có, bỏ qua');
    return;
  }

  let seq = 100;
  for (const cat of ASSET_CATALOG) {
    for (let i = 0; i < int(r, 4, 7); i++) {
      seq++;
      const status = weighted<AssetStatus>(r, [
        [AssetStatus.IN_USE, 6], [AssetStatus.AVAILABLE, 3], [AssetStatus.MAINTENANCE, 1], [AssetStatus.RETIRED, 0.5],
      ]);
      const holder = status === AssetStatus.IN_USE ? pick(r, people) : null;
      const bought = now - int(r, 30, 900) * DAY;
      const history: any[] = [];
      if (holder) {
        history.push({ action: 'assign', userId: holder._id, byUserId: admin?._id, at: new Date(bought + int(r, 1, 10) * DAY) });
      }
      docs.push({
        code: `${cat.prefix}-${seq}`, name: pick(r, cat.names), category: cat.category,
        serialNumber: `SN${int(r, 100000, 999999)}`, purchaseDate: new Date(bought),
        price: Math.round(int(r, cat.price[0], cat.price[1]) / 1000) * 1000,
        status, assignedTo: holder?._id ?? null, history,
        note: status === AssetStatus.MAINTENANCE ? 'Đang chờ linh kiện thay thế' : undefined,
      });
    }
  }
  await Asset.insertMany(docs);
  n = docs.length;
  log(`Tài sản mới: ${n}`);
}

export async function seedBookings(ctx: Ctx) {
  const Resource = ctx.model('Resource');
  const Booking = ctx.model('Booking');
  const { r, now } = ctx;

  const extra = [
    { name: 'Phòng họp C (Tầng 2)', location: 'Tầng 2', capacity: 6 },
    { name: 'Phòng đào tạo', location: 'Tầng 4', capacity: 40 },
    { name: 'Máy chiếu di động', type: 'equipment' },
    { name: 'Xe công ty 4 chỗ', type: 'vehicle', capacity: 4 },
  ];
  for (const e of extra) if (!(await Resource.exists({ name: e.name }))) await Resource.create(e);

  if ((await Booking.countDocuments({ title: /^\[Demo\]/ })) > 0) {
    log('Lịch đặt demo đã có, bỏ qua');
    return;
  }
  const resources = await Resource.find({ isActive: true });
  const people = [...ctx.users.values()].filter((u) => u.role !== 'admin');
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  let created = 0;
  for (let day = -7; day <= 14; day++) {
    const date = startOfToday.getTime() + day * DAY;
    if (new Date(date).getDay() === 0) continue; // chủ nhật
    for (const res of sample(r, resources, int(r, 2, 4))) {
      let cursor = 8 + int(r, 0, 3); // giờ bắt đầu sớm nhất
      for (let k = 0; k < int(r, 1, 3); k++) {
        const len = pick(r, [1, 1, 2]);
        if (cursor + len > 18) break;
        const start = date + cursor * HOUR + pick(r, [0, 30 * 60_000]);
        const end = start + len * HOUR;
        const owner = pick(r, people);
        await Booking.create({
          resourceId: res._id, title: `[Demo] ${pick(r, MEETING_TITLES)}`,
          start: new Date(start), end: new Date(end), bookedBy: owner._id,
          attendeeIds: sample(r, people, int(r, 0, 4)).map((p: any) => p._id),
        });
        created++;
        cursor += len + int(r, 1, 3);
      }
    }
  }
  log(`Lịch đặt phòng mới: ${created}`);
}
