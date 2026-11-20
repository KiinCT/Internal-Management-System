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
import { PRIVILEGED_ROLES, ProjectStatus, Role } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.module';
import { CreateProjectDto, QueryProjectDto, UpdateProjectDto } from './dto/project.dto';
import { Project, ProjectDocument } from './schemas/project.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private model: Model<Project>,
    private readonly notifications: NotificationsService,
  ) {}

  static isPrivileged(user: AuthUser) {
    return PRIVILEGED_ROLES.includes(user.role);
  }

  /** Điều kiện lọc các dự án mà user được xem. */
  accessFilter(user: AuthUser): FilterQuery<Project> {
    if (ProjectsService.isPrivileged(user)) return {};
    const uid = new Types.ObjectId(user.sub);
    const or: FilterQuery<Project>[] = [{ ownerId: uid }, { memberIds: uid }];
    // Trưởng phòng xem được dự án thuộc phòng mình
    if (user.role === Role.MANAGER && user.departmentId) {
      or.push({ departmentId: new Types.ObjectId(user.departmentId) });
    }
    return { $or: or };
  }

  async findAll(user: AuthUser, q: QueryProjectDto) {
    const filter: FilterQuery<Project> = { ...this.accessFilter(user) };
    if (q.status) filter.status = q.status;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      filter.$and = [{ $or: [{ name: rx }, { code: rx }] }];
    }
    const sort = parseSort(q.sort, ['name', 'code', 'createdAt', 'endDate', 'status']);
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate('ownerId', 'fullName email')
        .populate('departmentId', 'name code')
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  }

  async findOne(user: AuthUser, id: string) {
    const project = await this.model
      .findOne({ _id: id, ...this.accessFilter(user) })
      .populate('ownerId', 'fullName email')
      .populate('memberIds', 'fullName email role')
      .populate('departmentId', 'name code');
    if (!project) throw new NotFoundException('Không tìm thấy dự án hoặc bạn không có quyền xem');
    return project;
  }

  /** Đảm bảo user có quyền truy cập dự án (dùng cho module Tasks). */
  async assertAccess(user: AuthUser, projectId: string): Promise<ProjectDocument> {
    const p = await this.model.findOne({ _id: projectId, ...this.accessFilter(user) });
    if (!p) throw new NotFoundException('Không tìm thấy dự án hoặc bạn không có quyền truy cập');
    return p;
  }

  /** Chỉ owner hoặc admin/director được sửa dự án. */
  async assertManage(user: AuthUser, projectId: string): Promise<ProjectDocument> {
    const p = await this.model.findById(projectId);
    if (!p) throw new NotFoundException('Không tìm thấy dự án');
    if (!ProjectsService.isPrivileged(user) && String(p.ownerId) !== user.sub) {
      throw new ForbiddenException('Chỉ chủ dự án mới được thực hiện thao tác này');
    }
    return p;
  }

  async create(user: AuthUser, dto: CreateProjectDto) {
    this.validateDates(dto.startDate, dto.endDate);
    const memberIds = [...new Set([user.sub, ...(dto.memberIds ?? [])])];
    const project = await this.model.create({ ...dto, ownerId: user.sub, memberIds });
    await this.notifications.notify(
      memberIds,
      { type: 'project_added', title: `Bạn được thêm vào dự án ${project.name}`, link: `/projects/${project.id}` },
      user.sub,
    );
    return project;
  }

  async update(user: AuthUser, id: string, dto: UpdateProjectDto) {
    const p = await this.assertManage(user, id);
    this.validateDates(dto.startDate ?? p.startDate, dto.endDate ?? p.endDate);
    if (dto.memberIds) {
      dto.memberIds = [...new Set([String(dto.ownerId ?? p.ownerId), ...dto.memberIds])];
    }
    Object.assign(p, dto);
    await p.save();
    return p;
  }

  async updateMembers(user: AuthUser, id: string, memberIds: string[]) {
    const p = await this.assertManage(user, id);
    const before = new Set(p.memberIds.map(String));
    const next = [...new Set([String(p.ownerId), ...memberIds])];
    p.memberIds = next.map((m) => new Types.ObjectId(m));
    await p.save();
    const added = next.filter((m) => !before.has(m));
    await this.notifications.notify(
      added,
      { type: 'project_added', title: `Bạn được thêm vào dự án ${p.name}`, link: `/projects/${p.id}` },
      user.sub,
    );
    return p;
  }

  async remove(user: AuthUser, id: string) {
    const p = await this.assertManage(user, id);
    // Lưu trữ thay vì xóa để giữ lại công việc
    p.status = ProjectStatus.CANCELLED;
    await p.save();
    return p;
  }

  private validateDates(start?: string | Date, end?: string | Date) {
    if (start && end && new Date(start) > new Date(end)) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }
  }
}
