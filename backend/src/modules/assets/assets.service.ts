import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators';
import { buildMeta, escapeRegex, parseSort } from '../../common/dto/pagination.dto';
import { AssetStatus, PRIVILEGED_ROLES, Role } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.module';
import { Asset, AssignAssetDto, CreateAssetDto, QueryAssetDto, UpdateAssetDto } from './asset.schema';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private model: Model<Asset>,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser, q: QueryAssetDto) {
    const filter: FilterQuery<Asset> = {};
    // Nhân viên thường chỉ xem tài sản được cấp cho mình
    if (!PRIVILEGED_ROLES.includes(user.role) && user.role !== Role.MANAGER) {
      filter.assignedTo = new Types.ObjectId(user.sub);
    } else if (q.assignedTo) {
      filter.assignedTo = new Types.ObjectId(q.assignedTo);
    }
    if (q.status) filter.status = q.status;
    if (q.category) filter.category = q.category;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      filter.$or = [{ name: rx }, { code: rx }, { serialNumber: rx }];
    }
    const sort = parseSort(q.sort, ['code', 'name', 'category', 'status', 'createdAt'], { code: 1 });
    const [data, total] = await Promise.all([
      this.model
        .find(filter, '-history')
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate('assignedTo', 'fullName email')
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  }

  async get(user: AuthUser, id: string) {
    const a = await this.model
      .findById(id)
      .populate('assignedTo', 'fullName email')
      .populate('history.userId', 'fullName')
      .populate('history.byUserId', 'fullName');
    if (!a) throw new NotFoundException('Không tìm thấy tài sản');
    const canSeeAll = PRIVILEGED_ROLES.includes(user.role) || user.role === Role.MANAGER;
    const assignee = a.assignedTo as unknown as { _id?: Types.ObjectId } | null;
    if (!canSeeAll && String(assignee?._id) !== user.sub) {
      throw new NotFoundException('Không tìm thấy tài sản');
    }
    return a;
  }

  create(dto: CreateAssetDto) {
    return this.model.create(dto);
  }

  async update(user: AuthUser, id: string, dto: UpdateAssetDto) {
    const a = await this.model.findById(id);
    if (!a) throw new NotFoundException('Không tìm thấy tài sản');
    if (dto.status && dto.status !== a.status) {
      if (dto.status === AssetStatus.IN_USE) {
        throw new BadRequestException('Dùng chức năng cấp phát để chuyển sang đang sử dụng');
      }
      if (a.assignedTo) throw new BadRequestException('Thu hồi tài sản trước khi đổi trạng thái');
    }
    a.set(dto);
    a.history.push({ action: 'update', byUserId: new Types.ObjectId(user.sub), note: dto.note, at: new Date() });
    await a.save();
    return a;
  }

  async assign(user: AuthUser, id: string, dto: AssignAssetDto) {
    const a = await this.model.findOneAndUpdate(
      { _id: id, status: AssetStatus.AVAILABLE },
      {
        status: AssetStatus.IN_USE,
        assignedTo: dto.userId,
        $push: {
          history: { action: 'assign', userId: dto.userId, byUserId: user.sub, note: dto.note, at: new Date() },
        },
      },
      { new: true },
    );
    if (!a) throw new BadRequestException('Tài sản không tồn tại hoặc không ở trạng thái sẵn sàng');
    await this.notifications.notify(
      [dto.userId],
      { type: 'asset_assigned', title: `Bạn được cấp tài sản ${a.code} - ${a.name}`, link: '/assets' },
      user.sub,
    );
    return a;
  }

  async return(user: AuthUser, id: string, note?: string) {
    const current = await this.model.findById(id, 'assignedTo status');
    if (!current || current.status !== AssetStatus.IN_USE) {
      throw new BadRequestException('Tài sản không ở trạng thái đang sử dụng');
    }
    const a = await this.model.findOneAndUpdate(
      { _id: id, status: AssetStatus.IN_USE, assignedTo: current.assignedTo },
      {
        status: AssetStatus.AVAILABLE,
        assignedTo: null,
        $push: {
          history: { action: 'return', userId: current.assignedTo, byUserId: user.sub, note, at: new Date() },
        },
      },
      { new: true },
    );
    if (!a) throw new BadRequestException('Thu hồi thất bại, vui lòng thử lại');
    return a;
  }
}
