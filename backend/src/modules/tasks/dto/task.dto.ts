import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ChecklistItemDto {
  @ApiPropertyOptional() @IsOptional() @IsMongoId() _id?: string;
  @ApiProperty() @IsString() @MaxLength(500) text: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() done?: boolean;
}

export class CreateTaskDto {
  @ApiProperty() @IsString() @MaxLength(300) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsMongoId() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() parentTaskId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() assigneeId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsMongoId({ each: true })
  watcherIds?: string[];

  @ApiPropertyOptional({ enum: TaskStatus }) @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({ type: [ChecklistItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedHours?: number;
}

export class UpdateTaskDto extends PartialType(OmitType(CreateTaskDto, ['projectId'] as const)) {}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus }) @IsEnum(TaskStatus) status: TaskStatus;
}

export class ReorderItemDto {
  @ApiProperty() @IsMongoId() id: string;
  @ApiProperty({ enum: TaskStatus }) @IsEnum(TaskStatus) status: TaskStatus;
  @ApiProperty() @IsInt() @Min(0) order: number;
}

export class ReorderTasksDto {
  @ApiProperty() @IsMongoId() projectId: string;

  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

export class LogTimeDto {
  @ApiProperty() @IsNumber() @Min(0.1) hours: number;
}

export class QueryTaskDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsMongoId() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() assigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() parentTaskId?: string;

  @ApiPropertyOptional({ description: 'Có thể truyền nhiều, phân cách bởi dấu phẩy' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsEnum(TaskStatus, { each: true })
  status?: TaskStatus[];

  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;

  @ApiPropertyOptional() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  overdue?: boolean;
}

export class CreateCommentDto {
  @ApiProperty() @IsString() @MaxLength(5000) content: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsMongoId({ each: true })
  mentions?: string[];
}
