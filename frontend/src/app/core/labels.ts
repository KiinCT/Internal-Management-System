/** Nhãn tiếng Việt cho các giá trị enum. */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị',
  director: 'Giám đốc',
  manager: 'Trưởng phòng',
  staff: 'Nhân viên',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Chờ duyệt',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: 'Lên kế hoạch',
  active: 'Đang chạy',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
};

export const STEP_STATUS_LABELS: Record<string, string> = {
  waiting: 'Chưa đến lượt',
  pending: 'Đang chờ',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  skipped: 'Bỏ qua',
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  available: 'Sẵn sàng',
  in_use: 'Đang sử dụng',
  maintenance: 'Bảo trì',
  retired: 'Thanh lý',
};

export const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  leave: 'Nghỉ phép',
  purchase: 'Mua sắm',
  advance: 'Tạm ứng',
  general: 'Chung',
};

export const APPROVER_TYPE_LABELS: Record<string, string> = {
  manager: 'Quản lý trực tiếp',
  role: 'Theo vai trò',
  user: 'Người cụ thể',
};

export const BOARD_COLUMNS = ['todo', 'in_progress', 'review', 'done'] as const;
