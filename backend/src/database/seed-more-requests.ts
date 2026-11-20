/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthUser } from '../common/decorators';
import { WorkflowsService } from '../modules/workflows/workflows.service';
import { ADVANCE_PURPOSES, LEAVE_REASONS, PURCHASE_ITEMS } from './seed-more-data';
import { Ctx, DAY, int, isoDate, log, pick, sample, weighted } from './seed-util';

const asAuth = (u: any): AuthUser => ({
  sub: String(u._id),
  email: u.email,
  role: u.role,
  departmentId: u.departmentId ? String(u.departmentId) : null,
});

type Outcome = 'approved' | 'rejected' | 'pending' | 'partial' | 'cancelled';

const REJECT_REASONS = [
  'Chưa phù hợp với ngân sách',
  'Vui lòng bổ sung thông tin',
  'Thời điểm này chưa cần thiết',
];

/**
 * Tạo đơn qua WorkflowsService thật (đúng nghiệp vụ), rồi xử lý theo kết quả mong muốn.
 * Sau đó dời createdAt về quá khứ để danh sách trông tự nhiên.
 */
export async function seedRequests(ctx: Ctx) {
  const wf = ctx.app.get(WorkflowsService, { strict: false });
  const Request = ctx.model('WorkRequest');
  const { r, now } = ctx;

  if ((await Request.countDocuments({ title: /^\[Demo\]/ })) > 0) {
    log('Đơn phê duyệt demo đã có, bỏ qua');
    return;
  }
  const templates: any[] = await wf.listTemplates();
  const byType = (t: string) => templates.find((x) => x.type === t);
  const leave = byType('leave');
  const purchase = byType('purchase');
  const advance = byType('advance');
  if (!leave || !purchase || !advance) {
    log('Thiếu mẫu quy trình, hãy chạy "npm run seed" trước');
    return;
  }

  const actors = new Map([...ctx.users.values()].map((u) => [String(u._id), u]));
  const staff = [...ctx.users.values()].filter((u) => u.role === 'staff' && u.email.startsWith('nv'));
  const stats: Record<string, number> = {};
  let failed = 0;

  const run = async (requester: any, tpl: any, title: string, formData: any, outcome: Outcome) => {
    try {
      let cur: any = await wf.createRequest(asAuth(requester), {
        templateId: String(tpl._id),
        title: `[Demo] ${title}`,
        formData,
      });
      const maxSteps =
        outcome === 'approved' || outcome === 'partial' ? 99 : outcome === 'rejected' ? int(r, 0, 1) : 0;

      for (let i = 0; i < maxSteps && cur.status === 'pending'; i++) {
        const approver = actors.get(String(cur.currentApproverIds[0]));
        if (!approver) break;
        const hasNext = cur.steps.some((s: any, idx: number) => idx > cur.currentStep && s.status === 'waiting');
        if (outcome === 'partial' && !hasNext) break; // để lại bước cuối cho đơn "đang chờ"
        cur = await wf.approve(asAuth(approver), String(cur._id), pick(r, ['OK', 'Đồng ý', 'Duyệt']));
      }
      if (outcome === 'rejected' && cur.status === 'pending') {
        const approver = actors.get(String(cur.currentApproverIds[0]));
        cur = await wf.reject(asAuth(approver), String(cur._id), pick(r, REJECT_REASONS));
      }
      if (outcome === 'cancelled') cur = await wf.cancel(asAuth(requester), String(cur._id));

      // Dời thời gian về quá khứ (ghi trực tiếp để bỏ qua timestamps tự động)
      const ago = now - int(r, 1, 40) * DAY - int(r, 0, 12) * 3600_000;
      await Request.collection.updateOne({ _id: cur._id }, { $set: { createdAt: new Date(ago) } });
      stats[cur.status] = (stats[cur.status] ?? 0) + 1;
    } catch (e: any) {
      failed++;
      const detail = typeof e.getResponse === 'function' ? JSON.stringify(e.getResponse()) : e.message;
      if (failed <= 3) log(`Bo qua 1 don (${title}): ${detail}`);
    }
  };

  const outcome = (): Outcome =>
    weighted<Outcome>(r, [['approved', 4], ['pending', 3], ['partial', 2], ['rejected', 2], ['cancelled', 1]]);

  for (const u of sample(r, staff, 14)) {
    const from = now + int(r, -20, 25) * DAY;
    await run(u, leave, `Nghỉ phép - ${u.fullName}`, {
      fromDate: isoDate(from),
      toDate: isoDate(from + int(r, 0, 3) * DAY),
      leaveType: pick(r, ['Phép năm', 'Nghỉ ốm', 'Việc riêng']),
      reason: pick(r, LEAVE_REASONS),
    }, outcome());
  }
  for (const u of sample(r, staff, 12)) {
    const [item, base] = pick(r, PURCHASE_ITEMS);
    await run(u, purchase, `Mua ${item.toLowerCase()}`, {
      item,
      quantity: int(r, 1, 5),
      amount: Math.round((base * (0.8 + r() * 0.5)) / 1000) * 1000,
      reason: 'Phục vụ công việc của phòng',
    }, outcome());
  }
  for (const u of sample(r, staff, 8)) {
    const [purpose, amount] = pick(r, ADVANCE_PURPOSES);
    await run(u, advance, `Tạm ứng: ${purpose}`, { amount, purpose }, outcome());
  }
  log(`Don phe duyet: ${JSON.stringify(stats)}${failed ? `, loi bo qua: ${failed}` : ''}`);
}
