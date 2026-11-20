import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Role } from './enums';

export const IS_PUBLIC_KEY = 'isPublic';
/** Đánh dấu route không cần đăng nhập. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Giới hạn route cho các vai trò chỉ định. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  departmentId?: string | null;
}

/** Lấy user hiện tại (payload JWT) từ request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
