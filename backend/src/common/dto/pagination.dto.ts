import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 20;

  @ApiPropertyOptional({ description: 'Ví dụ: -createdAt, dueDate' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  @IsOptional()
  @IsString()
  q?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function buildMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
}

/** Chuyển '-createdAt,title' thành { createdAt: -1, title: 1 }, chỉ cho phép field trong whitelist. */
export function parseSort(
  sort: string | undefined,
  allowed: string[],
  fallback: Record<string, 1 | -1> = { createdAt: -1 },
): Record<string, 1 | -1> {
  if (!sort) return fallback;
  const result: Record<string, 1 | -1> = {};
  for (const part of sort.split(',')) {
    const desc = part.startsWith('-');
    const field = desc ? part.slice(1) : part;
    if (allowed.includes(field)) result[field] = desc ? -1 : 1;
  }
  return Object.keys(result).length ? result : fallback;
}

/** Escape ký tự đặc biệt cho regex tìm kiếm. */
export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
