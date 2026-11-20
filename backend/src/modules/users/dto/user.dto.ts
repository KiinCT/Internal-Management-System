import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  managerId?: string | null;
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Admin đặt lại mật khẩu' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;
}
