export enum Role {
  ADMIN = 'admin',
  DIRECTOR = 'director',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum WorkflowType {
  LEAVE = 'leave',
  PURCHASE = 'purchase',
  ADVANCE = 'advance',
  GENERAL = 'general',
}

export enum ApproverType {
  MANAGER = 'manager',
  ROLE = 'role',
  USER = 'user',
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum AssetStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

/** Vai trò có quyền quản lý (xem toàn bộ dữ liệu). */
export const PRIVILEGED_ROLES: Role[] = [Role.ADMIN, Role.DIRECTOR];
