import { ProjectStatus } from '../common/enums';

export interface ProjectDef {
  code: string;
  name: string;
  dept: string;
  desc: string;
  status: ProjectStatus;
  startDays: number;
  endDays: number;
  tasks: string[];
}

export const PROJECTS: ProjectDef[] = [
  {
    code: 'CRM', name: 'Triển khai hệ thống CRM', dept: 'KD', status: ProjectStatus.ACTIVE,
    desc: 'Chọn và triển khai CRM để quản lý khách hàng tiềm năng.', startDays: -40, endDays: 50,
    tasks: ['Khảo sát nhu cầu phòng kinh doanh', 'So sánh 3 nhà cung cấp CRM', 'Chuẩn hóa dữ liệu khách hàng cũ', 'Cấu hình pipeline bán hàng', 'Tích hợp email và Zalo', 'Đào tạo nhân viên sử dụng', 'Chạy thử với nhóm pilot', 'Viết tài liệu hướng dẫn'],
  },
  {
    code: 'WEB2', name: 'Thiết kế lại website công ty', dept: 'MKT', status: ProjectStatus.ACTIVE,
    desc: 'Làm mới giao diện, tối ưu SEO và tốc độ tải trang.', startDays: -30, endDays: 35,
    tasks: ['Phân tích website hiện tại', 'Lập sitemap mới', 'Thiết kế wireframe trang chủ', 'Thiết kế giao diện mobile', 'Viết nội dung trang giới thiệu', 'Tối ưu SEO on-page', 'Cài đặt Google Analytics', 'Kiểm thử trước khi ra mắt'],
  },
  {
    code: 'ACC', name: 'Chuẩn hóa quy trình kế toán', dept: 'KT', status: ProjectStatus.ACTIVE,
    desc: 'Số hóa quy trình thanh toán và đối chiếu công nợ.', startDays: -60, endDays: 20,
    tasks: ['Rà soát quy trình thanh toán hiện tại', 'Thiết kế mẫu phiếu đề nghị thanh toán', 'Đối chiếu công nợ quý III', 'Chuẩn hóa danh mục tài khoản', 'Lập báo cáo thuế tháng 10', 'Kiểm tra hóa đơn điện tử'],
  },
  {
    code: 'HRM', name: 'Chương trình tuyển dụng và đào tạo 2027', dept: 'HCNS', status: ProjectStatus.PLANNING,
    desc: 'Kế hoạch tuyển dụng và đào tạo nội bộ năm 2027.', startDays: 10, endDays: 120,
    tasks: ['Lập kế hoạch nhân sự năm 2027', 'Soạn bộ mô tả công việc', 'Đăng tin tuyển dụng', 'Lên lịch phỏng vấn đợt 1', 'Xây dựng chương trình onboarding', 'Khảo sát nhu cầu đào tạo'],
  },
  {
    code: 'LOG', name: 'Tối ưu chuỗi cung ứng kho vận', dept: 'VH', status: ProjectStatus.ACTIVE,
    desc: 'Giảm thời gian giao hàng và tồn kho.', startDays: -20, endDays: 70,
    tasks: ['Đo thời gian xử lý đơn hàng hiện tại', 'Sắp xếp lại bố trí kho', 'Đánh giá nhà vận chuyển', 'Xây dựng quy trình kiểm kê', 'Triển khai mã vạch cho kho', 'Báo cáo hiệu quả tuần'],
  },
  {
    code: 'CS', name: 'Nâng cao chất lượng chăm sóc khách hàng', dept: 'CSKH', status: ProjectStatus.ON_HOLD,
    desc: 'Chuẩn hóa kịch bản và đo lường mức độ hài lòng.', startDays: -25, endDays: 40,
    tasks: ['Xây dựng kịch bản trả lời chuẩn', 'Thiết lập khảo sát CSAT', 'Phân loại khiếu nại thường gặp', 'Đào tạo kỹ năng giao tiếp', 'Lập dashboard theo dõi ticket'],
  },
  {
    code: 'APP', name: 'Ứng dụng di động cho khách hàng', dept: 'IT', status: ProjectStatus.ACTIVE,
    desc: 'Phát triển app iOS/Android cho khách hàng tra cứu đơn hàng.', startDays: -50, endDays: 80,
    tasks: ['Thiết kế luồng người dùng', 'Dựng API tra cứu đơn hàng', 'Màn hình đăng nhập và đăng ký', 'Màn hình danh sách đơn hàng', 'Thông báo đẩy', 'Kiểm thử trên thiết bị thật', 'Chuẩn bị hồ sơ lên App Store', 'Viết test tự động'],
  },
  {
    code: 'EVT', name: 'Tổ chức sự kiện tri ân khách hàng', dept: 'MKT', status: ProjectStatus.COMPLETED,
    desc: 'Sự kiện cuối năm dành cho khách hàng thân thiết.', startDays: -90, endDays: -10,
    tasks: ['Lập ngân sách sự kiện', 'Chọn địa điểm', 'Thiết kế thư mời', 'Gửi thư mời khách hàng', 'Chuẩn bị quà tặng', 'Tổng kết và báo cáo'],
  },
];
