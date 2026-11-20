import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { AttachmentsController } from './attachments.controller';
import {
  Attachment,
  AttachmentSchema,
  Task,
  TaskComment,
  TaskCommentSchema,
  TaskSchema,
} from './schemas/task.schema';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: TaskComment.name, schema: TaskCommentSchema },
      { name: Attachment.name, schema: AttachmentSchema },
    ]),
    ProjectsModule,
    NotificationsModule,
  ],
  controllers: [TasksController, AttachmentsController],
  providers: [TasksService],
  exports: [TasksService, MongooseModule],
})
export class TasksModule {}
