import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags, PartialType } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { HydratedDocument, Model, SchemaTypes, Types } from 'mongoose';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { User } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';

/* ---------- Schema ---------- */
@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Department {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Department', default: null })
  parentId?: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  headId?: Types.ObjectId | null;
}
export type DepartmentDocument = HydratedDocument<Department>;
export const DepartmentSchema = SchemaFactory.createForClass(Department);

/* ---------- DTO ---------- */
export class CreateDepartmentDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty() @IsString() @MaxLength(20) code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() parentId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() headId?: string | null;
}
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

export interface DepartmentNode {
  _id: string;
  name: string;
  code: string;
  headId?: unknown;
  children: DepartmentNode[];
}

/* ---------- Service ---------- */
@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name) private model: Model<Department>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  findAll() {
    return this.model.find().sort({ name: 1 }).populate('headId', 'fullName email').lean();
  }

  async tree(): Promise<DepartmentNode[]> {
    const all = await this.findAll();
    const map = new Map<string, DepartmentNode>();
    all.forEach((d) =>
      map.set(String(d._id), { ...(d as any), _id: String(d._id), children: [] }),
    );
    const roots: DepartmentNode[] = [];
    all.forEach((d) => {
      const node = map.get(String(d._id))!;
      const parent = d.parentId ? map.get(String(d.parentId)) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    });
    return roots;
  }

  async findOne(id: string) {
    const d = await this.model.findById(id).populate('headId', 'fullName email');
    if (!d) throw new NotFoundException('Không tìm thấy phòng ban');
    return d;
  }

  create(dto: CreateDepartmentDto) {
    return this.model.create(dto);
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    if (dto.parentId) await this.assertNoCycle(id, dto.parentId);
    const d = await this.model.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!d) throw new NotFoundException('Không tìm thấy phòng ban');
    return d;
  }

  async remove(id: string) {
    const [children, members] = await Promise.all([
      this.model.countDocuments({ parentId: id }),
      this.userModel.countDocuments({ departmentId: id, isActive: true }),
    ]);
    if (children || members) {
      throw new BadRequestException('Phòng ban còn phòng ban con hoặc nhân viên, không thể xóa');
    }
    const d = await this.model.findByIdAndDelete(id);
    if (!d) throw new NotFoundException('Không tìm thấy phòng ban');
    return { deleted: true };
  }

  /** Chặn việc đặt phòng ban cha là chính nó hoặc con cháu của nó. */
  private async assertNoCycle(id: string, parentId: string) {
    let current: string | null = parentId;
    const seen = new Set<string>();
    while (current) {
      if (current === id) throw new BadRequestException('Cấu trúc phòng ban bị lặp vòng');
      if (seen.has(current)) break;
      seen.add(current);
      const parent = await this.model.findById(current, 'parentId').lean();
      current = parent?.parentId ? String(parent.parentId) : null;
    }
  }
}

/* ---------- Controller ---------- */
@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get('tree') tree() { return this.service.tree(); }
  @Get(':id') findOne(@Param('id', ParseObjectIdPipe) id: string) { return this.service.findOne(id); }

  @Post() @Roles(Role.ADMIN)
  create(@Body() dto: CreateDepartmentDto) { return this.service.create(dto); }

  @Patch(':id') @Roles(Role.ADMIN)
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @Roles(Role.ADMIN)
  remove(@Param('id', ParseObjectIdPipe) id: string) { return this.service.remove(id); }
}

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Department.name, schema: DepartmentSchema }]),
    UsersModule,
  ],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
