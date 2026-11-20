import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { TaskPriority, TaskStatus } from '../../../common/enums';

@Schema({ _id: true })
export class ChecklistItem {
  @Prop({ required: true, trim: true })
  text: string;

  @Prop({ default: false })
  done: boolean;
}
const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItem);

export type TaskDocument = HydratedDocument<Task>;

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Task', default: null })
  parentTaskId?: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  assigneeId?: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  reporterId: Types.ObjectId;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] })
  watcherIds: Types.ObjectId[];

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Prop()
  startDate?: Date;

  @Prop()
  dueDate?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: [String], default: [] })
  labels: string[];

  @Prop({ type: [ChecklistItemSchema], default: [] })
  checklist: ChecklistItem[];

  /** Vị trí trong cột Kanban (số nhỏ đứng trước). */
  @Prop({ default: 0 })
  order: number;

  @Prop({ min: 0 })
  estimatedHours?: number;

  @Prop({ default: 0, min: 0 })
  loggedHours: number;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ projectId: 1, status: 1, order: 1 });
TaskSchema.index({ assigneeId: 1, dueDate: 1 });
TaskSchema.index({ title: 'text', description: 'text' });

/* ---------- Comment ---------- */
@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class TaskComment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Task', required: true, index: true })
  taskId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] })
  mentions: Types.ObjectId[];
}
export const TaskCommentSchema = SchemaFactory.createForClass(TaskComment);

/* ---------- Attachment ---------- */
@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Attachment {
  @Prop({ required: true })
  refType: string; // 'task' | 'request'

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  refId: Types.ObjectId;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  storedName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;
}
export const AttachmentSchema = SchemaFactory.createForClass(Attachment);
AttachmentSchema.index({ refType: 1, refId: 1 });
