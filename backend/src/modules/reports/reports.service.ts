import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators';
import { ProjectStatus, RequestStatus, TaskStatus } from '../../common/enums';
import { Project } from '../projects/schemas/project.schema';
import { ProjectsService } from '../projects/projects.service';
import { Task } from '../tasks/schemas/task.schema';
import { WorkRequest } from '../workflows/schemas/workflow.schema';

export class ReportQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsMongoId() projectId?: string;
}

const OPEN = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW];
const DAY = 24 * 3600 * 1000;
/** Báo cáo theo múi giờ Việt Nam (UTC+7). */
const TZ_OFFSET = 7 * 3600 * 1000;

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(WorkRequest.name) private requestModel: Model<WorkRequest>,
    private readonly projects: ProjectsService,
  ) {}

  /** Phạm vi task user được xem trong báo cáo. */
  private async taskScope(user: AuthUser, projectId?: string): Promise<FilterQuery<Task>> {
    if (projectId) {
      await this.projects.assertAccess(user, projectId);
      return { projectId: new Types.ObjectId(projectId) };
    }
    if (ProjectsService.isPrivileged(user)) return {};
    const ids = await this.projectModel.distinct('_id', this.projects.accessFilter(user));
    return { $or: [{ projectId: { $in: ids } }, { assigneeId: new Types.ObjectId(user.sub) }] };
  }

  async overview(user: AuthUser, q: ReportQueryDto) {
    const scope = await this.taskScope(user, q.projectId);
    const uid = new Types.ObjectId(user.sub);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const open = { ...scope, status: { $in: OPEN } };
    const [projects, total, openCount, overdue, doneThisWeek, myOpen, pendingApprovals, myPendingRequests] =
      await Promise.all([
        this.projectModel.countDocuments({
          ...this.projects.accessFilter(user),
          status: ProjectStatus.ACTIVE,
        }),
        this.taskModel.countDocuments(scope),
        this.taskModel.countDocuments(open),
        this.taskModel.countDocuments({ ...open, dueDate: { $lt: now } }),
        this.taskModel.countDocuments({ ...scope, status: TaskStatus.DONE, completedAt: { $gte: weekAgo } }),
        this.taskModel.countDocuments({ assigneeId: uid, status: { $in: OPEN } }),
        this.requestModel.countDocuments({ status: RequestStatus.PENDING, currentApproverIds: uid }),
        this.requestModel.countDocuments({ status: RequestStatus.PENDING, requesterId: uid }),
      ]);
    return {
      projects,
      total,
      open: openCount,
      overdue,
      doneThisWeek,
      myOpen,
      pendingApprovals,
      myPendingRequests,
    };
  }

  async tasksByStatus(user: AuthUser, q: ReportQueryDto) {
    const scope = await this.taskScope(user, q.projectId);
    const rows = await this.taskModel.aggregate<{ _id: string; count: number }>([
      { $match: scope },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const result: Record<string, number> = Object.fromEntries(
      Object.values(TaskStatus).map((s) => [s, 0]),
    );
    rows.forEach((r) => (result[r._id] = r.count));
    return result;
  }

  async overdue(user: AuthUser, q: ReportQueryDto) {
    const scope = await this.taskScope(user, q.projectId);
    return this.taskModel
      .find({ ...scope, status: { $in: OPEN }, dueDate: { $lt: new Date() } })
      .sort({ dueDate: 1 })
      .limit(50)
      .select('title dueDate priority status assigneeId projectId')
      .populate('assigneeId', 'fullName')
      .populate('projectId', 'name code')
      .lean();
  }

  /** Khối lượng việc đang mở theo người thực hiện. */
  async workload(user: AuthUser, q: ReportQueryDto) {
    const scope = await this.taskScope(user, q.projectId);
    const now = new Date();
    return this.taskModel.aggregate([
      { $match: { ...scope, status: { $in: OPEN }, assigneeId: { $ne: null } } },
      {
        $group: {
          _id: '$assigneeId',
          open: { $sum: 1 },
          overdue: {
            $sum: {
              $cond: [{ $and: [{ $gt: ['$dueDate', null] }, { $lt: ['$dueDate', now] }] }, 1, 0],
            },
          },
          estimatedHours: { $sum: { $ifNull: ['$estimatedHours', 0] } },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          fullName: '$user.fullName',
          open: 1,
          overdue: 1,
          estimatedHours: 1,
        },
      },
      { $sort: { open: -1 } },
      { $limit: 50 },
    ]);
  }

  /** Số task hoàn thành theo ngày (giờ VN) trong 14 ngày gần nhất. */
  async completedTrend(user: AuthUser, q: ReportQueryDto) {
    const scope = await this.taskScope(user, q.projectId);
    const todayVn = new Date(Date.now() + TZ_OFFSET).toISOString().slice(0, 10);
    const startVn = Date.parse(todayVn) - 13 * DAY; // 00:00 ngày đầu (giờ VN) biểu diễn như UTC
    const since = new Date(startVn - TZ_OFFSET);
    const rows = await this.taskModel.aggregate<{ _id: string; count: number }>([
      { $match: { ...scope, status: TaskStatus.DONE, completedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: '+07:00' } },
          count: { $sum: 1 },
        },
      },
    ]);
    const map = new Map(rows.map((r) => [r._id, r.count]));
    return Array.from({ length: 14 }, (_, i) => {
      const key = new Date(startVn + i * DAY).toISOString().slice(0, 10);
      return { date: key, count: map.get(key) ?? 0 };
    });
  }
}
