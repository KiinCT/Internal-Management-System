/* eslint-disable @typescript-eslint/no-explicit-any */
import * as bcrypt from 'bcryptjs';
import { Role } from '../common/enums';
import {
  DEPT_MANAGER_EMAIL,
  NEW_DEPTS,
  NEW_MANAGERS,
  NEW_STAFF,
  PersonDef,
} from './seed-more-data';
import { Ctx, log } from './seed-util';

/** Thêm phòng ban + nhân sự mới (bỏ qua mục đã tồn tại) và nạp toàn bộ vào ctx. */
export async function seedPeople(ctx: Ctx) {
  const Dept = ctx.model('Department');
  const User = ctx.model('User');
  const hash = await bcrypt.hash('User@123', 10);

  const director = await User.findOne({ email: 'director@demo.com' });
  const bgd = await Dept.findOne({ code: 'BGD' });

  let newDepts = 0;
  for (const d of NEW_DEPTS) {
    if (await Dept.exists({ code: d.code })) continue;
    await Dept.create({ ...d, parentId: bgd?._id ?? null });
    newDepts++;
  }

  const make = async (def: PersonDef, role: Role, managerId: any) => {
    if (await User.exists({ email: def.email })) return false;
    const dept = await Dept.findOne({ code: def.dept });
    await User.create({
      email: def.email,
      fullName: def.fullName,
      passwordHash: hash,
      role,
      position: def.position,
      departmentId: dept?._id ?? null,
      managerId,
      phone: `09${Math.floor(10000000 + ctx.r() * 89999999)}`,
    });
    return true;
  };

  let newUsers = 0;
  for (const m of NEW_MANAGERS) if (await make(m, Role.MANAGER, director?._id ?? null)) newUsers++;

  // Gán trưởng phòng cho các phòng mới
  for (const m of NEW_MANAGERS) {
    const u = await User.findOne({ email: m.email });
    if (u) await Dept.updateOne({ code: m.dept, headId: null }, { headId: u._id });
  }

  for (const s of NEW_STAFF) {
    const mgr = await User.findOne({ email: DEPT_MANAGER_EMAIL[s.dept] });
    if (await make(s, Role.STAFF, mgr?._id ?? null)) newUsers++;
  }

  // Nạp lại toàn bộ vào ctx
  ctx.users.clear();
  ctx.depts.clear();
  for (const u of await User.find({})) ctx.users.set(u.email, u);
  for (const d of await Dept.find({})) ctx.depts.set(d.code, d);
  log(`Phòng ban mới: ${newDepts}, người dùng mới: ${newUsers} (mật khẩu User@123)`);
}
