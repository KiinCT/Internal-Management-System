import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SchemaTypes, Types } from 'mongoose';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AssetStatus } from '../../common/enums';

@Schema({ _id: false })
export class AssetHistory {
  @Prop({ required: true }) action: string; // assign | return | update
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) userId?: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) byUserId?: Types.ObjectId;
  @Prop() note?: string;
  @Prop({ default: () => new Date() }) at: Date;
}
const AssetHistorySchema = SchemaFactory.createForClass(AssetHistory);

@Schema({ timestamps: true, toJSON: { versionKey: false } })
export class Asset {
  @Prop({ required: true, unique: true, uppercase: true, trim: true }) code: string;
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, trim: true }) category: string;
  @Prop() serialNumber?: string;
  @Prop() purchaseDate?: Date;
  @Prop({ min: 0 }) price?: number;
  @Prop({ type: String, enum: AssetStatus, default: AssetStatus.AVAILABLE }) status: AssetStatus;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null }) assignedTo?: Types.ObjectId | null;
  @Prop() note?: string;
  @Prop({ type: [AssetHistorySchema], default: [] }) history: AssetHistory[];
}
export const AssetSchema = SchemaFactory.createForClass(Asset);
AssetSchema.index({ assignedTo: 1 });

/* ---------- DTO ---------- */
export class CreateAssetDto {
  @ApiProperty() @IsString() @MaxLength(30) code: string;
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiProperty() @IsString() category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @ApiPropertyOptional({ enum: AssetStatus }) @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
}

export class AssignAssetDto {
  @ApiProperty() @IsMongoId() userId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class NoteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class QueryAssetDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AssetStatus }) @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() assignedTo?: string;
}
