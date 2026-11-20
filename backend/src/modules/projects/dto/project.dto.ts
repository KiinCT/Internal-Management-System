import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectStatus } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateProjectDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiProperty() @IsString() @MaxLength(20) code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayUnique() @IsMongoId({ each: true })
  memberIds?: string[];

  @ApiPropertyOptional() @IsOptional() @IsMongoId() departmentId?: string | null;
  @ApiPropertyOptional({ enum: ProjectStatus }) @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional() @IsOptional() @IsMongoId() ownerId?: string;
}

export class QueryProjectDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProjectStatus }) @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
}

export class UpdateMembersDto {
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayUnique() @IsMongoId({ each: true })
  memberIds: string[];
}
