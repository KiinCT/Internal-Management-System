import { Types } from 'mongoose';
import { ApproverType, AssetStatus, Role, WorkflowType } from '../common/enums';

export function workflowTemplates(hrLeadId: Types.ObjectId, accLeadId: Types.ObjectId) {
  return [
    {
      name: 'Đơn xin nghỉ phép',
      type: WorkflowType.LEAVE,
      formFields: [
        { key: 'fromDate', label: 'Từ ngày', type: 'date', required: true },
        { key: 'toDate', label: 'Đến ngày', type: 'date', required: true },
        {
          key: 'leaveType',
          label: 'Loại nghỉ',
          type: 'select',
          required: true,
          options: ['Phép năm', 'Nghỉ ốm', 'Việc riêng'],
        },
        { key: 'reason', label: 'Lý do', type: 'textarea', required: true },
      ],
      steps: [
        { order: 1, name: 'Quản lý trực tiếp duyệt', approverType: ApproverType.MANAGER },
        { order: 2, name: 'HCNS xác nhận', approverType: ApproverType.USER, approverId: hrLeadId },
      ],
    },
    {
      name: 'Đề nghị mua sắm',
      type: WorkflowType.PURCHASE,
      formFields: [
        { key: 'item', label: 'Hàng hóa / dịch vụ', type: 'text', required: true },
        { key: 'quantity', label: 'Số lượng', type: 'number', required: true },
        { key: 'amount', label: 'Tổng tiền (VNĐ)', type: 'number', required: true },
        { key: 'reason', label: 'Mục đích', type: 'textarea' },
      ],
      steps: [
        { order: 1, name: 'Trưởng phòng duyệt', approverType: ApproverType.MANAGER },
        { order: 2, name: 'Kế toán kiểm tra', approverType: ApproverType.USER, approverId: accLeadId },
        {
          order: 3,
          name: 'Giám đốc duyệt (từ 10 triệu)',
          approverType: ApproverType.ROLE,
          approverRole: Role.DIRECTOR,
          minAmount: 10_000_000,
        },
      ],
    },
    {
      name: 'Đề nghị tạm ứng',
      type: WorkflowType.ADVANCE,
      formFields: [
        { key: 'amount', label: 'Số tiền (VNĐ)', type: 'number', required: true },
        { key: 'purpose', label: 'Mục đích', type: 'textarea', required: true },
      ],
      steps: [
        { order: 1, name: 'Quản lý duyệt', approverType: ApproverType.MANAGER },
        { order: 2, name: 'Kế toán chi', approverType: ApproverType.USER, approverId: accLeadId },
      ],
    },
  ];
}

export function assets(dev1Id: Types.ObjectId, adminId: Types.ObjectId) {
  return [
    {
      code: 'LAP-001',
      name: 'Laptop Dell Latitude 5440',
      category: 'Laptop',
      status: AssetStatus.IN_USE,
      assignedTo: dev1Id,
      price: 25_000_000,
      history: [{ action: 'assign', userId: dev1Id, byUserId: adminId, at: new Date() }],
    },
    { code: 'LAP-002', name: 'MacBook Air M2', category: 'Laptop', status: AssetStatus.AVAILABLE, price: 28_000_000 },
    { code: 'MON-001', name: 'Màn hình LG 27 inch', category: 'Màn hình', status: AssetStatus.AVAILABLE, price: 5_000_000 },
    { code: 'PRJ-001', name: 'Máy chiếu Epson', category: 'Thiết bị phòng họp', status: AssetStatus.MAINTENANCE },
  ];
}

export const resources = [
  { name: 'Phòng họp A (Tầng 3)', location: 'Tầng 3', capacity: 10 },
  { name: 'Phòng họp B (Tầng 5)', location: 'Tầng 5', capacity: 20 },
  { name: 'Xe công ty 7 chỗ', type: 'vehicle', capacity: 7 },
];
