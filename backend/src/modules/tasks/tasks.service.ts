import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators';
import { buildMeta, escapeRegex, parseSort } from '../../common/dto/pagination.dto';
import { TaskStatus } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.module';
import { Project } from '../projects/schemas/project.schema';
import { ProjectsService } from '../projects/projects.service';
import {
  CreateCommentDto,
  CreateTaskDto,
  QueryTaskDto,
  ReorderTasksDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { Task, TaskComment, TaskDocument } from './schemas/task.schema';

const POPULATE_USER = 'fullName email';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(TaskComment.name) private commentModel: Model<TaskComment>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private readonly projects: ProjectsService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ---------------- Query ---------------- */

  async findAll(user: AuthUser, q: QueryTaskDto) {
    const filter: FilterQuery<Task> = {};
    if (q.projectId) {
      await this.projects.assertAccess(user, q.projectId);
      filter.projectId = new Types.ObjectId(q.projectId);
    } else if (!ProjectsService.isPrivileged(user)) {
      const ids = await this.projectModel.distinct('_id', this.projects.accessFilter(user));
      filter.$or = [{ projectId: { $in: ids } }, { assigneeId: new Types.ObjectId(user.sub) }];
    }
    if (q.assigneeId) filter.assigneeId = new Types.ObjectId(q.assigneeId);
    if (q.parentTaskId) filter.parentTaskId = new Types.ObjectId(q.parentTaskId);
    if (q.status?.length) filter.status = { $in: q.status };
    if (q.priority) filter.priority = q.priority;
    if (q.overdue) {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $nin: [TaskStatus.DONE, TaskStatus.CANCELLED] };
    }
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      filter.$and = [{ $or: [{ title: rx }, { labels: rx }] }];
    }
    const sort = parseSort(
      q.sort,
      ['title', 'dueDate', 'priority', 'status', 'createdAt', 'updatedAt', 'order'],
      { status: 1, order: 1, createdAt: -1 },
    );
    const [data, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate('assigneeId', POPULATE_USER)
        .populate('reporterId', POPULATE_USER)
        .populate('projectId', 'name code')
        .lean(),
      this.taskModel.countDocuments(filter),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  }

  findMine(user: AuthUser, q: QueryTaskDto) {
    return this.findAll(user, Object.assign(q, { assigneeId: user.sub }));
  }

  /** Toàn bộ task gốc của dự án cho bảng Kanban (không phân trang). */
  async board(user: AuthUser, projectId: string) {
    await this.projects.assertAccess(user, projectId);
    const tasks = await this.taskModel
      .find({ projectId, parentTaskId: null, status: { $ne: TaskStatus.CANCELLED } })
      .sort({ order: 1, createdAt: 1 })
      .populate('assigneeId', POPULATE_USER)
      .lean();
    const columns: Record<string, typeof tasks> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.REVIEW]: [],
      [TaskStatus.DONE]: [],
    };
    tasks.forEach((t) => columns[t.status]?.push(t));
    return columns;
  }

  async findOne(user: AuthUser, id: string) {
    const task = await this.getAccessible(user, id);
    await task.populate([
      { path: 'assigneeId', select: POPULATE_USER },
      { path: 'reporterId', select: POPULATE_USER },
      { path: 'watcherIds', select: POPULATE_USER },
      { path: 'projectId', select: 'name code ownerId memberIds' },
      { path: 'parentTaskId', select: 'title status' },
    ]);
    const subtasks = await this.taskModel
      .find({ parentTaskId: id })
      .select('title status assigneeId dueDate priority')
      .populate('assigneeId', POPULATE_USER)
      .lean();
    return { ...task.toJSON(), subtasks };
  }

  /* ---------------- Mutations ---------------- */

  async create(user: AuthUser, dto: CreateTaskDto) {
    const project = await this.projects.assertAccess(user, dto.projectId);
    if (dto.parentTaskId) {
      const parent = await this.taskModel.findById(dto.parentTaskId, 'projectId');
      if (!parent || String(parent.projectId) !== dto.projectId) {
        throw new BadRequestException('Công việc cha không thuộc dự án này');
      }
    }
    if (dto.assigneeId) this.assertMember(project, dto.assigneeId);
    this.validateDates(dto.startDate, dto.dueDate);

    const status = dto.status ?? TaskStatus.TODO;
    const last = await this.taskModel
      .findOne({ projectId: dto.projectId, status }, 'order')
      .sort({ order: -1 })
      .lean();
    const task = await this.taskModel.create({
      ...dto,
      status,
      reporterId: user.sub,
      order: (last?.order ?? -1) + 1,
      completedAt: status === TaskStatus.DONE ? new Date() : undefined,
    });
    if (task.assigneeId) {
      await this.notifications.notify(
        [task.assigneeId],
        { type: 'task_assigned', title: `Bạn được giao việc: ${task.title}`, link: `/tasks/${task.id}` },
        user.sub,
      );
    }
    return task;
  }

  async update(user: AuthUser, id: string, dto: UpdateTaskDto) {
    const task = await this.getAccessible(user, id);
    await this.assertCanEdit(user, task);
    if (dto.assigneeId) {
      this.assertMember(await this.projectModel.findById(task.projectId), dto.assigneeId);
    }
    if (dto.parentTaskId) {
      if (dto.parentTaskId === id) throw new BadRequestException('Công việc không thể là cha của chính nó');
      const parent = await this.taskModel.findById(dto.parentTaskId, 'projectId');
      if (!parent || String(parent.projectId) !== String(task.projectId)) {
        throw new BadRequestException('Công việc cha không thuộc dự án này');
      }
    }
    this.validateDates(dto.startDate ?? task.startDate, dto.dueDate ?? task.dueDate);

    const prevAssignee = task.assigneeId ? String(task.assigneeId) : null;
    const prevStatus = task.status;
    task.set(dto);
    this.applyCompletion(task, prevStatus);
    await task.save();

    if (dto.assigneeId && dto.assigneeId !== prevAssignee) {
      await this.notifications.notify(
        [dto.assigneeId],
        { type: 'task_assigned', title: `Bạn được giao việc: ${task.title}`, link: `/tasks/${task.id}` },
        user.sub,
      );
    }
    if (dto.status && dto.status !== prevStatus) await this.notifyStatus(user, task);
    return task;
  }

  async updateStatus(user: AuthUser, id: string, status: TaskStatus) {
    const task = await this.getAccessible(user, id);
    await this.assertCanEdit(user, task);
    const prev = task.status;
    if (prev === status) return task;
    task.status = status;
    this.applyCompletion(task, prev);
    await task.save();
    await this.notifyStatus(user, task);
    return task;
  }

  /** Cập nhật trạng thái + vị trí hàng loạt sau khi kéo-thả Kanban. */
  async reorder(user: AuthUser, dto: ReorderTasksDto) {
    await this.projects.assertAccess(user, dto.projectId);
    const ids = dto.items.map((i) => new Types.ObjectId(i.id));
    const existing = await this.taskModel
      .find({ _id: { $in: ids }, projectId: dto.projectId }, 'status')
      .lean();
    if (existing.length !== dto.items.length) {
      throw new BadRequestException('Có công việc không thuộc dự án này');
    }
    const prevStatus = new Map(existing.map((t) => [String(t._id), t.status]));
    await this.taskModel.bulkWrite(
      dto.items.map((i) => {
        const set: Record<string, unknown> = { status: i.status, order: i.order };
        const before = prevStatus.get(i.id);
        if (i.status === TaskStatus.DONE && before !== TaskStatus.DONE) set.completedAt = new Date();
        if (i.status !== TaskStatus.DONE && before === TaskStatus.DONE) set.completedAt = null;
        return { updateOne: { filter: { _id: i.id }, update: { $set: set } } };
      }),
    );
    return { updated: dto.items.length };
  }

  async logTime(user: AuthUser, id: string, hours: number) {
    const task = await this.getAccessible(user, id);
    await this.assertCanEdit(user, task);
    task.loggedHours = Math.round(((task.loggedHours ?? 0) + hours) * 100) / 100;
    await task.save();
    return task;
  }

  async remove(user: AuthUser, id: string) {
    const task = await this.getAccessible(user, id);
    const project = await this.projectModel.findById(task.projectId, 'ownerId');
    const allowed =
      ProjectsService.isPrivileged(user) ||
      String(task.reporterId) === user.sub ||
      String(project?.ownerId) === user.sub;
    if (!allowed) throw new ForbiddenException('Bạn không có quyền xóa công việc này');
    const children = await this.taskModel.find({ parentTaskId: id }, '_id').lean();
    const allIds = [task._id, ...children.map((c) => c._id)];
    await Promise.all([
      this.taskModel.deleteMany({ _id: { $in: allIds } }),
      this.commentModel.deleteMany({ taskId: { $in: allIds } }),
    ]);
    return { deleted: allIds.length };
  }

  /* ---------------- Comments ---------------- */

  async listComments(user: AuthUser, taskId: string) {
    await this.getAccessible(user, taskId);
    return this.commentModel
      .find({ taskId })
      .sort({ createdAt: 1 })
      .populate('authorId', POPULATE_USER)
      .lean();
  }

  async addComment(user: AuthUser, taskId: string, dto: CreateCommentDto) {
    const task = await this.getAccessible(user, taskId);
    const comment = await this.commentModel.create({
      taskId,
      authorId: user.sub,
      content: dto.content,
      mentions: dto.mentions ?? [],
    });
    const link = `/tasks/${taskId}`;
    const preview = dto.content.slice(0, 200);
    await this.notifications.notify(
      [task.assigneeId, task.reporterId, ...task.watcherIds],
      { type: 'task_comment', title: `Bình luận mới trong: ${task.title}`, message: preview, link },
      user.sub,
    );
    if (dto.mentions?.length) {
      await this.notifications.notify(
        dto.mentions,
        { type: 'mention', title: `Bạn được nhắc đến trong: ${task.title}`, message: preview, link },
        user.sub,
      );
    }
    return comment.populate('authorId', POPULATE_USER);
  }

  async removeComment(user: AuthUser, commentId: string) {
    const c = await this.commentModel.findById(commentId);
    if (!c) throw new NotFoundException('Không tìm thấy bình luận');
    if (String(c.authorId) !== user.sub && !ProjectsService.isPrivileged(user)) {
      throw new ForbiddenException('Chỉ người viết mới được xóa bình luận');
    }
    await c.deleteOne();
    return { deleted: true };
  }

  /* ---------------- Helpers ---------------- */

  /** Lấy task nếu user có quyền với dự án chứa task (hoặc là người được giao). */
  async getAccessible(user: AuthUser, id: string): Promise<TaskDocument> {
    const task = await this.taskModel.findById(id);
    if (!task) throw new NotFoundException('Không tìm thấy công việc');
    if (ProjectsService.isPrivileged(user) || String(task.assigneeId) === user.sub) return task;
    await this.projects.assertAccess(user, String(task.projectId));
    return task;
  }

  private async assertCanEdit(user: AuthUser, task: TaskDocument) {
    if (ProjectsService.isPrivileged(user)) return;
    if ([String(task.assigneeId), String(task.reporterId)].includes(user.sub)) return;
    const project = await this.projectModel.findById(task.projectId, 'ownerId');
    if (String(project?.ownerId) === user.sub) return;
    throw new ForbiddenException(
      'Chỉ người giao, người thực hiện hoặc chủ dự án được sửa công việc',
    );
  }

  private assertMember(
    project: { memberIds: Types.ObjectId[]; ownerId: Types.ObjectId } | null,
    userId: string,
  ) {
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    const members = [String(project.ownerId), ...project.memberIds.map(String)];
    if (!members.includes(userId)) {
      throw new BadRequestException('Người được giao phải là thành viên dự án');
    }
  }

  private applyCompletion(task: TaskDocument, prevStatus: TaskStatus) {
    if (task.status === TaskStatus.DONE && prevStatus !== TaskStatus.DONE) {
      task.completedAt = new Date();
    }
    if (task.status !== TaskStatus.DONE) task.completedAt = undefined;
  }

  private validateDates(start?: string | Date | null, due?: string | Date | null) {
    if (start && due && new Date(start) > new Date(due)) {
      throw new BadRequestException('Ngày bắt đầu phải trước hạn chót');
    }
  }

  private notifyStatus(user: AuthUser, task: TaskDocument) {
    return this.notifications.notify(
      [task.reporterId, task.assigneeId, ...task.watcherIds],
      {
        type: 'task_status',
        title: `"${task.title}" chuyển sang trạng thái ${task.status}`,
        link: `/tasks/${task.id}`,
      },
      user.sub,
    );
  }
}
