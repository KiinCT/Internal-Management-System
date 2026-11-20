import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { Model, SchemaTypes, Types } from 'mongoose';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { buildMeta, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Notification {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  type: string; // task_assigned, task_comment, request_pending, request_approved...

  @Prop({ required: true })
  title: string;

  @Prop()
  message?: string;

  @Prop()
  link?: string; // đường dẫn frontend, vd: /tasks/123

  @Prop({ default: false })
  isRead: boolean;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export interface NotifyInput {
  type: string;
  title: string;
  message?: string;
  link?: string;
}

class QueryNotificationDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private model: Model<Notification>) {}

  /** Gửi thông báo cho nhiều người, bỏ qua người thực hiện hành động. */
  async notify(userIds: (string | Types.ObjectId | null | undefined)[], input: NotifyInput, exceptUserId?: string) {
    const unique = [...new Set(userIds.filter(Boolean).map(String))].filter(
      (id) => id !== exceptUserId,
    );
    if (!unique.length) return;
    await this.model.insertMany(unique.map((userId) => ({ userId, ...input })));
  }

  async list(userId: string, q: QueryNotificationDto) {
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (q.unreadOnly) filter.isRead = false;
    const [data, total, unread] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      this.model.countDocuments(filter),
      this.model.countDocuments({ userId, isRead: false }),
    ]);
    return { data, meta: { ...buildMeta(q.page, q.limit, total), unread } };
  }

  unreadCount(userId: string) {
    return this.model.countDocuments({ userId, isRead: false }).then((count) => ({ count }));
  }

  async markRead(userId: string, id: string) {
    const n = await this.model.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
    if (!n) throw new NotFoundException('Không tìm thấy thông báo');
    return n;
  }

  async markAllRead(userId: string) {
    const r = await this.model.updateMany({ userId, isRead: false }, { isRead: true });
    return { updated: r.modifiedCount };
  }
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: QueryNotificationDto) {
    return this.service.list(user.sub, q);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: AuthUser) {
    return this.service.unreadCount(user.sub);
  }

  @Patch('read-all')
  readAll(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user.sub);
  }

  @Patch(':id/read')
  read(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.markRead(user.sub, id);
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
