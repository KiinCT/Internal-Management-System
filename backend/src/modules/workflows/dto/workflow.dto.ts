import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApproverType, RequestStatus, Role, WorkflowType } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { FIELD_TYPES, FieldType } from '../schemas/workflow.schema';

export class FormFieldDto {
  @ApiProperty() @IsString() @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, { message: 'key chỉ gồm chữ, số, _' }) key: string;
  @ApiProperty() @IsString() label: string;
  @ApiProperty({ enum: FIELD_TYPES }) @IsIn(FIELD_TYPES as unknown as string[]) type: FieldType;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() required?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
}

export class WorkflowStepDto {
  @ApiProperty() @IsInt() @Min(1) order: number;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: ApproverType }) @IsEnum(ApproverType) approverType: ApproverType;

  @ApiPropertyOptional({ enum: Role })
  @ValidateIf((o) => o.approverType === ApproverType.ROLE) @IsEnum(Role)
  approverRole?: Role;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.approverType === ApproverType.USER) @IsMongoId()
  approverId?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minAmount?: number;
}

export class CreateWorkflowTemplateDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiPropertyOptional({ enum: WorkflowType }) @IsOptional() @IsEnum(WorkflowType) type?: WorkflowType;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiProperty({ type: [FormFieldDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => FormFieldDto)
  formFields: FormFieldDto[];

  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray() @ArrayMinSize(1, { message: 'Quy trình cần ít nhất 1 bước duyệt' })
  @ValidateNested({ each: true }) @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateWorkflowTemplateDto extends PartialType(CreateWorkflowTemplateDto) {}

export class CreateRequestDto {
  @ApiProperty() @IsMongoId() templateId: string;
  @ApiProperty() @IsString() @MaxLength(300) title: string;
  @ApiProperty({ type: Object }) @IsObject() formData: Record<string, unknown>;
}

export class ActionRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class QueryRequestDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['mine', 'pending', 'all'], default: 'mine' })
  @IsOptional() @IsIn(['mine', 'pending', 'all'])
  scope?: 'mine' | 'pending' | 'all' = 'mine';

  @ApiPropertyOptional({ enum: RequestStatus }) @IsOptional() @IsEnum(RequestStatus) status?: RequestStatus;
  @ApiPropertyOptional({ enum: WorkflowType }) @IsOptional() @IsEnum(WorkflowType) type?: WorkflowType;
}
