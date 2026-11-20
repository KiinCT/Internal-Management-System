import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { ApproverType, RequestStatus, Role, WorkflowType } from '../../../common/enums';

export const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

@Schema({ _id: false })
export class FormField {
  @Prop({ required: true }) key: string;
  @Prop({ required: true }) label: string;
  @Prop({ type: String, enum: FIELD_TYPES, default: 'text' }) type: FieldType;
  @Prop({ default: false }) required: boolean;
  @Prop({ type: [String], default: [] }) options: string[];
}
const FormFieldSchema = SchemaFactory.createForClass(FormField);

@Schema({ _id: false })
export class WorkflowStep {
  @Prop({ required: true }) order: number;
  @Prop({ required: true }) name: string;
  @Prop({ type: String, enum: ApproverType, required: true }) approverType: ApproverType;
  @Prop({ type: String, enum: Role }) approverRole?: Role;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) approverId?: Types.ObjectId;
  /** Điều kiện: bước chỉ áp dụng khi formData.amount >= minAmount. */
  @Prop() minAmount?: number;
}
const WorkflowStepSchema = SchemaFactory.createForClass(WorkflowStep);

export type WorkflowTemplateDocument = HydratedDocument<WorkflowTemplate>;

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class WorkflowTemplate {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ type: String, enum: WorkflowType, default: WorkflowType.GENERAL }) type: WorkflowType;
  @Prop() description?: string;
  @Prop({ type: [FormFieldSchema], default: [] }) formFields: FormField[];
  @Prop({ type: [WorkflowStepSchema], default: [] }) steps: WorkflowStep[];
  @Prop({ default: true }) isActive: boolean;
}
export const WorkflowTemplateSchema = SchemaFactory.createForClass(WorkflowTemplate);

/* ---------- Request (đơn đề xuất) ---------- */
export enum StepStatus {
  WAITING = 'waiting',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

@Schema({ _id: false })
export class RequestStep {
  @Prop({ required: true }) order: number;
  @Prop({ required: true }) name: string;
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] }) approverIds: Types.ObjectId[];
  @Prop({ type: String, enum: StepStatus, default: StepStatus.WAITING }) status: StepStatus;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) actedBy?: Types.ObjectId;
  @Prop() comment?: string;
  @Prop() actedAt?: Date;
}
const RequestStepSchema = SchemaFactory.createForClass(RequestStep);

export type RequestDocument = HydratedDocument<WorkRequest>;

@Schema({ collection: 'requests', timestamps: true, toJSON: { versionKey: false } })
export class WorkRequest {
  @Prop({ required: true, unique: true }) code: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'WorkflowTemplate', required: true }) templateId: Types.ObjectId;
  @Prop({ required: true }) templateName: string;
  @Prop({ type: String, enum: WorkflowType }) type: WorkflowType;
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true }) requesterId: Types.ObjectId;
  @Prop({ type: Object, default: {} }) formData: Record<string, unknown>;
  @Prop({ type: [RequestStepSchema], default: [] }) steps: RequestStep[];
  /** Index trong mảng steps đang chờ duyệt, -1 khi đã kết thúc. */
  @Prop({ default: 0 }) currentStep: number;
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] }) currentApproverIds: Types.ObjectId[];
  @Prop({ type: String, enum: RequestStatus, default: RequestStatus.PENDING }) status: RequestStatus;
  @Prop() completedAt?: Date;
}
export const WorkRequestSchema = SchemaFactory.createForClass(WorkRequest);
WorkRequestSchema.index({ requesterId: 1, createdAt: -1 });
WorkRequestSchema.index({ status: 1, currentApproverIds: 1 });
