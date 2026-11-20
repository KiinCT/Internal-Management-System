import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { ProjectStatus } from '../../../common/enums';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] })
  memberIds: Types.ObjectId[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Department', default: null })
  departmentId?: Types.ObjectId | null;

  @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ memberIds: 1 });
ProjectSchema.index({ ownerId: 1 });
