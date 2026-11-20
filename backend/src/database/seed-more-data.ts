export interface PersonDef {
  email: string;
  fullName: string;
  dept: string;
  position: string;
}

export const NEW_DEPTS = [
  { name: 'Phòng Kinh doanh', code: 'KD' },
  { name: 'Phòng Marketing', code: 'MKT' },
  { name: 'Phòng Vận hành', code: 'VH' },
  { name: 'Phòng Chăm sóc khách hàng', code: 'CSKH' },
];

export const NEW_MANAGERS: PersonDef[] = [
  { email: 'manager.kd@demo.com', fullName: 'Đỗ Quốc Bán', dept: 'KD', position: 'Trưởng phòng Kinh doanh' },
  { email: 'manager.mkt@demo.com', fullName: 'Ngô Thị Quảng', dept: 'MKT', position: 'Trưởng phòng Marketing' },
  { email: 'manager.vh@demo.com', fullName: 'Bùi Văn Hành', dept: 'VH', position: 'Trưởng phòng Vận hành' },
  { email: 'manager.cskh@demo.com', fullName: 'Đặng Thị Chăm', dept: 'CSKH', position: 'Trưởng phòng CSKH' },
];

/** Quản lý trực tiếp của từng phòng (gồm cả phòng đã có từ seed gốc). */
export const DEPT_MANAGER_EMAIL: Record<string, string> = {
  IT: 'manager.it@demo.com',
  HCNS: 'manager.hr@demo.com',
  KT: 'manager.kt@demo.com',
  KD: 'manager.kd@demo.com',
  MKT: 'manager.mkt@demo.com',
  VH: 'manager.vh@demo.com',
  CSKH: 'manager.cskh@demo.com',
};

const p = (n: number, fullName: string, dept: string, position: string): PersonDef => ({
  email: `nv${String(n).padStart(2, '0')}@demo.com`,
  fullName,
  dept,
  position,
});

export const NEW_STAFF: PersonDef[] = [
  p(1, 'Lê Quang Huy', 'IT', 'Lập trình viên Backend'),
  p(2, 'Phạm Gia Bảo', 'IT', 'Lập trình viên Frontend'),
  p(3, 'Nguyễn Thanh Tùng', 'IT', 'DevOps'),
  p(4, 'Trần Mai Anh', 'IT', 'Business Analyst'),
  p(5, 'Võ Thị Hương', 'HCNS', 'Chuyên viên nhân sự'),
  p(6, 'Lý Minh Châu', 'HCNS', 'Nhân viên hành chính'),
  p(7, 'Huỳnh Ngọc Lan', 'KT', 'Kế toán tổng hợp'),
  p(8, 'Phan Văn Đức', 'KT', 'Kế toán thuế'),
  p(9, 'Trương Hoàng Nam', 'KD', 'Nhân viên kinh doanh'),
  p(10, 'Nguyễn Khánh Linh', 'KD', 'Nhân viên kinh doanh'),
  p(11, 'Đinh Công Thành', 'KD', 'Chuyên viên tư vấn'),
  p(12, 'Mai Phương Thảo', 'KD', 'Nhân viên kinh doanh'),
  p(13, 'Cao Đức Mạnh', 'KD', 'Quản lý khách hàng'),
  p(14, 'Lâm Bảo Ngọc', 'MKT', 'Content Marketing'),
  p(15, 'Tạ Quốc Việt', 'MKT', 'Thiết kế đồ họa'),
  p(16, 'Hà Thu Trang', 'MKT', 'Chuyên viên SEO'),
  p(17, 'Dương Minh Khôi', 'MKT', 'Performance Marketing'),
  p(18, 'Bành Văn Lộc', 'VH', 'Điều phối kho'),
  p(19, 'Châu Thị Nhung', 'VH', 'Nhân viên logistics'),
  p(20, 'Kiều Anh Tuấn', 'VH', 'Giám sát vận hành'),
  p(21, 'Tô Thị Hạnh', 'VH', 'Quản lý chất lượng'),
  p(22, 'Quách Thùy Dung', 'CSKH', 'Nhân viên CSKH'),
  p(23, 'Từ Văn Phúc', 'CSKH', 'Nhân viên CSKH'),
  p(24, 'La Mỹ Duyên', 'CSKH', 'Chuyên viên hỗ trợ'),
];

export const COMMENTS = [
  'Mình đã bắt đầu làm, dự kiến xong trong tuần này.',
  'Cần thêm thông tin từ bên kinh doanh để tiếp tục.',
  'Đã cập nhật xong, nhờ anh/chị kiểm tra giúp.',
  'Phần này đang bị vướng, mình sẽ trao đổi trực tiếp.',
  'OK, đã xác nhận với khách hàng, có thể triển khai.',
  'Đề nghị ưu tiên việc này vì sát deadline.',
  'Đã gửi bản nháp qua email, mọi người xem giúp nhé.',
  'Hoàn thành 80%, còn phần kiểm thử.',
  'Cảm ơn mọi người đã hỗ trợ.',
  'Đã sửa theo góp ý ở buổi họp hôm qua.',
];

export const LABELS = ['gấp', 'khách hàng', 'nội bộ', 'báo cáo', 'thiết kế', 'kiểm thử', 'hợp đồng', 'đào tạo'];
export const CHECKLIST = ['Thu thập yêu cầu', 'Làm bản nháp', 'Review nội bộ', 'Chỉnh sửa', 'Gửi duyệt', 'Bàn giao'];

export const LEAVE_REASONS = ['Việc gia đình', 'Khám sức khỏe định kỳ', 'Về quê', 'Du lịch cùng gia đình', 'Con ốm cần chăm sóc'];
export const PURCHASE_ITEMS: [string, number][] = [
  ['Văn phòng phẩm quý IV', 1_500_000],
  ['Chuột và bàn phím không dây', 3_200_000],
  ['Ghế công thái học', 12_500_000],
  ['Màn hình Dell 27 inch', 18_000_000],
  ['Máy in laser đa năng', 9_800_000],
  ['Bản quyền phần mềm thiết kế', 42_000_000],
  ['Nước uống và trà bánh cho văn phòng', 2_400_000],
  ['Máy chủ lưu trữ NAS', 65_000_000],
];
export const ADVANCE_PURPOSES: [string, number][] = [
  ['Công tác phí đi gặp khách hàng tại Đà Nẵng', 6_000_000],
  ['Tạm ứng tổ chức sự kiện nội bộ', 15_000_000],
  ['Chi phí đào tạo bên ngoài', 8_500_000],
  ['Tiếp khách đối tác', 3_000_000],
];
export const MEETING_TITLES = [
  'Họp giao ban tuần', 'Review sprint', 'Họp khách hàng', 'Phỏng vấn ứng viên',
  'Đào tạo nhân viên mới', 'Họp kế hoạch quý', 'Demo sản phẩm', 'Họp phòng ban',
];
