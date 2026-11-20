import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Role } from '../../../common/enums';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.passwordHash;
      delete ret.refreshTokenHash;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  position?: string;

  @Prop({ type: String, enum: Role, default: Role.STAFF })
  role: Role;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Department', default: null })
  departmentId?: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  managerId?: Types.ObjectId | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, select: false, default: null })
  refreshTokenHash?: string | null;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ departmentId: 1 });
UserSchema.index({ fullName: 'text', email: 'text' });
