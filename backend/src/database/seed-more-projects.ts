/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProjectStatus, TaskPriority, TaskStatus } from '../common/enums';
import { CHECKLIST, COMMENTS, DEPT_MANAGER_EMAIL, LABELS } from './seed-more-data';
import { PROJECTS, ProjectDef } from './seed-more-projects-data';
import { Ctx, DAY, HOUR, int, log, pick, sample, weighted } from './seed-util';

/** Dự án càng tiến xa thì càng nhiều việc đã xong. */
function statusFor(ctx: Ctx, proj: ProjectStatus, progress: number): TaskStatus {
  if (proj === ProjectStatus.COMPLETED) return TaskStatus.DONE;
  if (proj === ProjectStatus.PLANNING) {
    return weighted(ctx.r, [[TaskStatus.TODO, 9], [TaskStatus.IN_PROGRESS, 1]]);
  }
  const done = Math.max(0.1, progress);
  return weighted(ctx.r, [
    [TaskStatus.DONE, done * 10],
    [TaskStatus.IN_PROGRESS, 3],
    [TaskStatus.REVIEW, 1.5],
    [TaskStatus.TODO, (1 - done) * 5],
  ]);
}

function managerOf(ctx: Ctx, dept: string) {
  return ctx.users.get(DEPT_MANAGER_EMAIL[dept]);
}

function buildTasks(ctx: Ctx, def: ProjectDef, project: any, members: any[], manager: any) {
  const { r, now } = ctx;
  const span = def.endDays - def.startDays;
  const progress = Math.min(1, Math.max(0, -def.startDays / span));
  const order: Record<string, number> = {};

  return def.tasks.map((title) => {
    const status = statusFor(ctx, def.status, progress);
    const created = now + def.startDays * DAY + int(r, 0, Math.max(1, Math.floor(span * 0.5))) * DAY;
    const due = created + int(r, 5, 30) * DAY;
    const est = pick(r, [4, 8, 12, 16, 24, 40]);
    const doneAt = status === TaskStatus.DONE ? Math.min(now - HOUR, due + int(r, -6, 4) * DAY) : undefined;
    const checklist = sample(r, CHECKLIST, int(r, 0, 4)).map((text, i) => ({
      text,
      done: status === TaskStatus.DONE || i < int(r, 0, 3),
    }));
    return {
      title,
      description: `${title} — thuộc dự án ${def.name}.`,
      projectId: project._id,
      assigneeId: pick(r, members)._id,
      reporterId: r() < 0.6 ? manager._id : pick(r, members)._id,
      watcherIds: r() < 0.3 ? [pick(r, members)._id] : [],
      status,
      order: (order[status] = (order[status] ?? -1) + 1),
      priority: weighted(r, [
        [TaskPriority.LOW, 2], [TaskPriority.MEDIUM, 5], [TaskPriority.HIGH, 3], [TaskPriority.URGENT, 1],
      ]),
      startDate: new Date(created),
      dueDate: new Date(due),
      completedAt: doneAt ? new Date(doneAt) : undefined,
      estimatedHours: est,
      loggedHours: status === TaskStatus.TODO ? 0 : Math.round(est * (0.3 + r() * 0.9) * 2) / 2,
      labels: sample(r, LABELS, int(r, 0, 2)),
      checklist,
    };
  });
}

export async function seedProjects(ctx: Ctx) {
  const Project = ctx.model('Project');
  const Task = ctx.model('Task');
  const Comment = ctx.model('TaskComment');
  const { r, now } = ctx;
  let nProjects = 0;
  let nTasks = 0;
  let nComments = 0;

  for (const def of PROJECTS) {
    if (await Project.exists({ code: def.code })) continue;
    const dept = ctx.depts.get(def.dept);
    const manager = managerOf(ctx, def.dept);
    if (!dept || !manager) continue;

    const all = [...ctx.users.values()].filter((u) => u.role === 'staff');
    const own = all.filter((u) => String(u.departmentId) === String(dept._id));
    // Thêm 1-2 người ngoài phòng để có phối hợp liên phòng ban
    const others = sample(r, all.filter((u) => !own.includes(u)), int(r, 1, 2));
    const members = [manager, ...own, ...others];

    const project = await Project.create({
      name: def.name, code: def.code, description: def.desc, status: def.status,
      ownerId: manager._id, departmentId: dept._id, memberIds: members.map((m) => m._id),
      startDate: new Date(now + def.startDays * DAY), endDate: new Date(now + def.endDays * DAY),
    });
    nProjects++;

    const created = await Task.insertMany(buildTasks(ctx, def, project, members, manager));
    nTasks += created.length;

    // Việc con cho vài task chưa hoàn thành
    for (const parent of sample(r, created.filter((t: any) => t.status !== TaskStatus.DONE), 2)) {
      const names = ['Chuẩn bị tài liệu', 'Thực hiện chính', 'Rà soát lại'].slice(0, int(r, 2, 3));
      const subs = names.map((s, i) => ({
        title: `${s}: ${parent.title}`, projectId: project._id, parentTaskId: parent._id,
        assigneeId: pick(r, members)._id, reporterId: manager._id,
        status: i === 0 ? TaskStatus.DONE : weighted(r, [[TaskStatus.TODO, 3], [TaskStatus.IN_PROGRESS, 2]]),
        priority: TaskPriority.MEDIUM, dueDate: parent.dueDate, order: i,
        completedAt: i === 0 ? new Date(now - int(r, 1, 5) * DAY) : undefined,
      }));
      nTasks += (await Task.insertMany(subs)).length;
    }

    const comments: any[] = [];
    for (const t of created) {
      if (r() >= 0.55) continue;
      for (let i = 0; i < int(r, 1, 3); i++) {
        comments.push({
          taskId: t._id, authorId: pick(r, members)._id, content: pick(r, COMMENTS),
          createdAt: new Date(now - int(r, 1, 20) * DAY - int(r, 0, 20) * HOUR),
        });
      }
    }
    if (comments.length) {
      await Comment.insertMany(comments);
      nComments += comments.length;
    }
  }
  log(`Dự án mới: ${nProjects}, công việc: ${nTasks}, bình luận: ${nComments}`);
}
