import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { Response } from 'express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { Model } from 'mongoose';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ProjectsService } from '../projects/projects.service';
import { Attachment } from './schemas/task.schema';
import { TasksService } from './tasks.service';

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? 'uploads');
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10) * 1024 * 1024;
const BLOCKED_EXT = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.js', '.html', '.htm', '.svg'];

class UploadDto {
  @IsIn(['task']) refType: 'task';
  @IsMongoId() refId: string;
}

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(
    @InjectModel(Attachment.name) private model: Model<Attachment>,
    private readonly tasks: TasksService,
  ) {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        refType: { type: 'string', enum: ['task'] },
        refId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (BLOCKED_EXT.includes(ext)) return cb(new BadRequestException('Loại file không được phép'), false);
        cb(null, true);
      },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDto,
  ) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    try {
      await this.tasks.getAccessible(user, dto.refId);
    } catch (e) {
      await unlink(file.path).catch(() => undefined);
      throw e;
    }
    return this.model.create({
      refType: dto.refType,
      refId: dto.refId,
      // multer đọc tên file dạng latin1, chuyển lại sang utf8 để giữ tiếng Việt
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: user.sub,
    });
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('refType') refType: string,
    @Query('refId', ParseObjectIdPipe) refId: string,
  ) {
    if (refType !== 'task') throw new BadRequestException('refType không hợp lệ');
    await this.tasks.getAccessible(user, refId);
    return this.model.find({ refType, refId }).sort({ createdAt: -1 }).populate('uploadedBy', 'fullName').lean();
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const att = await this.model.findById(id);
    if (!att) throw new NotFoundException('Không tìm thấy file');
    await this.tasks.getAccessible(user, String(att.refId));
    const path = join(UPLOAD_DIR, att.storedName);
    if (!existsSync(path)) throw new NotFoundException('File không còn tồn tại trên máy chủ');
    res.set({
      'Content-Type': att.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(att.fileName)}`,
    });
    return new StreamableFile(createReadStream(path));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    const att = await this.model.findById(id);
    if (!att) throw new NotFoundException('Không tìm thấy file');
    if (String(att.uploadedBy) !== user.sub && !ProjectsService.isPrivileged(user)) {
      throw new ForbiddenException('Chỉ người tải lên mới được xóa file');
    }
    await att.deleteOne();
    await unlink(join(UPLOAD_DIR, att.storedName)).catch(() => undefined);
    return { deleted: true };
  }
}
