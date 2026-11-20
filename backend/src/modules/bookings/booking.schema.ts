import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SchemaTypes, Types } from 'mongoose';

/** Tài nguyên dùng chung: phòng họp, xe, máy chiếu... */
@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Resource {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ default: 'meeting_room' }) type: string;
  @Prop() location?: string;
  @Prop({ min: 0 }) capacity?: number;
  @Prop({ default: true }) isActive: boolean;
}
export const ResourceSchema = SchemaFactory.createForClass(Resource);

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Booking {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Resource', required: true }) resourceId: Types.ObjectId;
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ required: true }) start: Date;
  @Prop({ required: true }) end: Date;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true }) bookedBy: Types.ObjectId;
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] }) attendeeIds: Types.ObjectId[];
  @Prop() note?: string;
}
export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ resourceId: 1, start: 1, end: 1 });

/* ---------- DTO ---------- */
export class CreateResourceDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateResourceDto extends PartialType(CreateResourceDto) {}

export class CreateBookingDto {
  @ApiProperty() @IsMongoId() resourceId: string;
  @ApiProperty() @IsString() @MaxLength(200) title: string;
  @ApiProperty() @IsDateString() start: string;
  @ApiProperty() @IsDateString() end: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsMongoId({ each: true })
  attendeeIds?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class QueryBookingDto {
  @ApiProperty() @IsDateString() from: string;
  @ApiProperty() @IsDateString() to: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() resourceId?: string;
}
