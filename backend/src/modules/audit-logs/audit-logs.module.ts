import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Logger,
  Module,
  NestInterceptor,
  Query,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { FilterQuery, Model, SchemaTypes, Types } from 'mongoose';
import { Observable, tap } from 'rxjs';
import { AuthUser, Roles } from '../../common/decorators';
import { buildMeta, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums';

@Schema({ collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false }, toJSON: { versionKey: false } })
export class AuditLog {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null }) userId?: Types.ObjectId | null;
  @Prop({ required: true }) method: string;
  @Prop({ required: true }) path: string;
  @Prop() entity?: string;
  @Prop() entityId?: string;
  @Prop() statusCode?: number;
  @Prop({ type: Object }) body?: Record<string, unknown>;
  @Prop() ip?: string;
}
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
// Tự xóa log sau 180 ngày
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

const SENSITIVE = ['password', 'currentPassword', 'newPassword', 'refreshToken', 'accessToken'];
const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];

function sanitize(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = SENSITIVE.includes(k) ? '***' : v;
  }
  const json = JSON.stringify(out);
  return json.length > 5000 ? { truncated: true } : out;
}

/** Ghi log mọi thao tác thay đổi dữ liệu thành công. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(@InjectModel(AuditLog.name) private model: Model<AuditLog>) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!MUTATING.includes(req.method)) return next.handle();
    return next.handle().pipe(
      tap((result) => {
        const segments = req.path.split('/').filter(Boolean);
        const user = req.user;
        const resultId = (result as { _id?: unknown; id?: string } | undefined)?._id ?? undefined;
        this.model
          .create({
            userId: user?.sub ?? null,
            method: req.method,
            path: req.originalUrl.slice(0, 500),
            entity: segments[2],
            entityId: (req.params?.id as string) ?? (resultId ? String(resultId) : undefined),
            statusCode: ctx.switchToHttp().getResponse().statusCode,
            body: sanitize(req.body),
            ip: req.ip,
          })
          .catch((e) => this.logger.warn(`Không ghi được audit log: ${e.message}`));
      }),
    );
  }
}

class QueryAuditDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsMongoId() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entity?: string;
}

@ApiTags('Audit logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(@InjectModel(AuditLog.name) private model: Model<AuditLog>) {}

  @Get()
  @Roles(Role.ADMIN)
  async list(@Query() q: QueryAuditDto) {
    const filter: FilterQuery<AuditLog> = {};
    if (q.userId) filter.userId = new Types.ObjectId(q.userId);
    if (q.entity) filter.entity = q.entity;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit)
        .populate('userId', 'fullName email').lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }])],
  controllers: [AuditLogsController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AuditLogsModule {}
