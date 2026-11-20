import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsJWT, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsJWT({ message: 'Refresh token không hợp lệ' })
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới tối thiểu 6 ký tự' })
  newPassword: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
