import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators';
import { PRIVILEGED_ROLES } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.module';
import {
  Booking,
  CreateBookingDto,
  CreateResourceDto,
  QueryBookingDto,
  Resource,
  UpdateResourceDto,
} from './booking.schema';

const MAX_RANGE_MS = 92 * 24 * 3600 * 1000;

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<Resource>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    private readonly notifications: NotificationsService,
  ) {}

  listResources(all = false) {
    return this.resourceModel.find(all ? {} : { isActive: true }).sort({ name: 1 }).lean();
  }

  createResource(dto: CreateResourceDto) {
    return this.resourceModel.create(dto);
  }

  async updateResource(id: string, dto: UpdateResourceDto) {
    const r = await this.resourceModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!r) throw new NotFoundException('Không tìm thấy tài nguyên');
    return r;
  }

  list(q: QueryBookingDto) {
    const from = new Date(q.from);
    const to = new Date(q.to);
    if (from >= to) throw new BadRequestException('Khoảng thời gian không hợp lệ');
    if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
      throw new BadRequestException('Khoảng thời gian tối đa 3 tháng');
    }
    const filter: FilterQuery<Booking> = { start: { $lt: to }, end: { $gt: from } };
    if (q.resourceId) filter.resourceId = new Types.ObjectId(q.resourceId);
    return this.bookingModel
      .find(filter)
      .sort({ start: 1 })
      .populate('resourceId', 'name location')
      .populate('bookedBy', 'fullName email')
      .lean();
  }

  async create(user: AuthUser, dto: CreateBookingDto) {
    const start = new Date(dto.start);
    const end = new Date(dto.end);
    if (start >= end) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    if (end < new Date()) throw new BadRequestException('Không thể đặt lịch trong quá khứ');
    const resource = await this.resourceModel.findOne({ _id: dto.resourceId, isActive: true });
    if (!resource) throw new NotFoundException('Không tìm thấy phòng/tài nguyên');

    // [s1,e1) và [s2,e2) trùng nhau khi s1 < e2 && e1 > s2
    const conflict = await this.bookingModel
      .findOne({ resourceId: dto.resourceId, start: { $lt: end }, end: { $gt: start } })
      .populate('bookedBy', 'fullName');
    if (conflict) {
      const who = (conflict.bookedBy as unknown as { fullName?: string })?.fullName ?? '';
      throw new ConflictException(`Trùng lịch với "${conflict.title}" (${who})`);
    }
    const booking = await this.bookingModel.create({ ...dto, start, end, bookedBy: user.sub });
    await this.notifications.notify(
      dto.attendeeIds ?? [],
      {
        type: 'booking_invite',
        title: `Mời họp: ${dto.title} tại ${resource.name}`,
        message: start.toLocaleString('vi-VN'),
        link: '/bookings',
      },
      user.sub,
    );
    return booking;
  }

  async remove(user: AuthUser, id: string) {
    const b = await this.bookingModel.findById(id);
    if (!b) throw new NotFoundException('Không tìm thấy lịch đặt');
    if (String(b.bookedBy) !== user.sub && !PRIVILEGED_ROLES.includes(user.role)) {
      throw new ForbiddenException('Chỉ người đặt mới được hủy lịch');
    }
    await b.deleteOne();
    return { deleted: true };
  }
}
