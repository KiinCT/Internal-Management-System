import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  buildMeta,
  escapeRegex,
  Paginated,
  parseSort,
} from '../../common/dto/pagination.dto';
import { CreateUserDto, QueryUserDto, UpdateUserDto } from './dto/user.dto';
import { User, UserDocument } from './schemas/user.schema';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const exists = await this.userModel.exists({ email: dto.email.toLowerCase() });
    if (exists) throw new ConflictException('Email đã được sử dụng');
    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return this.userModel.create({ ...rest, passwordHash });
  }

  async findAll(query: QueryUserDto): Promise<Paginated<UserDocument>> {
    const filter: FilterQuery<User> = {};
    if (query.role) filter.role = query.role;
    if (query.departmentId) filter.departmentId = new Types.ObjectId(query.departmentId);
    if (query.q) {
      const rx = new RegExp(escapeRegex(query.q), 'i');
      filter.$or = [{ fullName: rx }, { email: rx }];
    }
    const sort = parseSort(query.sort, ['fullName', 'email', 'createdAt', 'role'], {
      fullName: 1,
    });
    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort(sort)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .populate('departmentId', 'name code')
        .exec(),
      this.userModel.countDocuments(filter),
    ]);
    return { data, meta: buildMeta(query.page, query.limit, total) };
  }

  /** Danh sách rút gọn cho dropdown chọn người. */
  findLookup() {
    return this.userModel
      .find({ isActive: true }, 'fullName email role departmentId')
      .sort({ fullName: 1 })
      .lean();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .populate('departmentId', 'name code')
      .populate('managerId', 'fullName email');
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  findByEmailWithSecrets(email: string) {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash +refreshTokenHash');
  }

  findByIdWithSecrets(id: string) {
    return this.userModel.findById(id).select('+passwordHash +refreshTokenHash');
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    if (dto.managerId && dto.managerId === id) {
      throw new BadRequestException('Người dùng không thể là quản lý của chính mình');
    }
    const { password, ...rest } = dto;
    const update: Record<string, unknown> = { ...rest };
    if (password) {
      update.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      update.refreshTokenHash = null; // buộc đăng nhập lại
    }
    if (dto.isActive === false) update.refreshTokenHash = null;
    const user = await this.userModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  /** Vô hiệu hóa thay vì xóa cứng để giữ lịch sử dữ liệu. */
  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }

  setRefreshTokenHash(id: string, hash: string | null) {
    return this.userModel.updateOne({ _id: id }, { refreshTokenHash: hash });
  }

  touchLogin(id: string) {
    return this.userModel.updateOne({ _id: id }, { lastLoginAt: new Date() });
  }

  setPassword(id: string, passwordHash: string) {
    return this.userModel.updateOne({ _id: id }, { passwordHash, refreshTokenHash: null });
  }

  /** Tìm user active theo role (dùng cho phê duyệt theo vai trò). */
  findActiveByRole(role: string) {
    return this.userModel.find({ role, isActive: true }, '_id fullName').lean();
  }
}
