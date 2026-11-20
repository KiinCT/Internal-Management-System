export type Role = 'admin' | 'director' | 'manager' | 'staff';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type StepStatus = 'waiting' | 'pending' | 'approved' | 'rejected' | 'skipped';
export type AssetStatus = 'available' | 'in_use' | 'maintenance' | 'retired';
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';

/** Tham chiếu đã populate (hoặc chỉ là id). */
export interface UserRef { _id: string; fullName: string; email?: string; role?: Role }
export type Ref<T> = T | string | null | undefined;

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; unread?: number };
}

export interface User {
  _id: string;
  email: string;
  fullName: string;
  phone?: string;
  position?: string;
  role: Role;
  departmentId?: Ref<Department>;
  managerId?: Ref<UserRef>;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string | null;
  headId?: Ref<UserRef>;
  children?: Department[];
}

export interface Project {
  _id: string;
  name: string;
  code: string;
  description?: string;
  ownerId: Ref<UserRef>;
  memberIds: (UserRef | string)[];
  departmentId?: Ref<Department>;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export interface ChecklistItem { _id?: string; text: string; done: boolean }

export interface Task {
  _id: string;
  title: string;
  description?: string;
  projectId: Ref<{ _id: string; name: string; code: string; ownerId?: string; memberIds?: string[] }>;
  parentTaskId?: Ref<{ _id: string; title: string; status: TaskStatus }>;
  assigneeId?: Ref<UserRef>;
  reporterId?: Ref<UserRef>;
  watcherIds?: (UserRef | string)[];
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  labels: string[];
  checklist: ChecklistItem[];
  order: number;
  estimatedHours?: number;
  loggedHours: number;
  subtasks?: Task[];
  createdAt?: string;
}

export type Board = Record<'todo' | 'in_progress' | 'review' | 'done', Task[]>;

export interface Comment { _id: string; content: string; authorId: UserRef; createdAt: string }

export interface Attachment {
  _id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy: Ref<UserRef>;
  createdAt: string;
}

export interface FormField { key: string; label: string; type: FieldType; required: boolean; options: string[] }
export interface WorkflowStep {
  order: number;
  name: string;
  approverType: 'manager' | 'role' | 'user';
  approverRole?: Role;
  approverId?: string;
  minAmount?: number;
}
export interface WorkflowTemplate {
  _id: string;
  name: string;
  type: 'leave' | 'purchase' | 'advance' | 'general';
  description?: string;
  formFields: FormField[];
  steps: WorkflowStep[];
  isActive: boolean;
}

export interface RequestStep {
  order: number;
  name: string;
  approverIds: (UserRef | string)[];
  status: StepStatus;
  actedBy?: Ref<UserRef>;
  comment?: string;
  actedAt?: string;
}
export interface WorkRequest {
  _id: string;
  code: string;
  templateId: string;
  templateName: string;
  type: string;
  title: string;
  requesterId: Ref<UserRef>;
  formData: Record<string, unknown>;
  steps: RequestStep[];
  currentStep: number;
  currentApproverIds: string[];
  status: RequestStatus;
  createdAt: string;
  completedAt?: string;
}

export interface Asset {
  _id: string;
  code: string;
  name: string;
  category: string;
  serialNumber?: string;
  purchaseDate?: string;
  price?: number;
  status: AssetStatus;
  assignedTo?: Ref<UserRef>;
  note?: string;
}

export interface Resource { _id: string; name: string; type: string; location?: string; capacity?: number; isActive: boolean }
export interface Booking {
  _id: string;
  resourceId: Ref<Resource>;
  title: string;
  start: string;
  end: string;
  bookedBy: Ref<UserRef>;
  note?: string;
}

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Overview {
  projects: number;
  total: number;
  open: number;
  overdue: number;
  doneThisWeek: number;
  myOpen: number;
  pendingApprovals: number;
  myPendingRequests: number;
}

/** Lấy tên hiển thị từ ref đã populate. */
export function refName(ref: Ref<{ fullName?: string; name?: string }> | unknown): string {
  if (!ref || typeof ref !== 'object') return '';
  const r = ref as { fullName?: string; name?: string };
  return r.fullName ?? r.name ?? '';
}

/** Lấy id từ ref (đã populate hoặc chưa). */
export function refId(ref: unknown): string | null {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return (ref as { _id?: string })._id ?? null;
}
