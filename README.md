# WMS - Hệ thống quản lý công việc và vận hành nội bộ

Stack: **Angular 16** (frontend) · **NestJS 10** (backend) · **MongoDB** (Mongoose) · **JWT** (access + refresh token) · **RESTful API** · Git/GitHub.

## Cấu trúc

```
backend/    NestJS API  (prefix /api/v1, Swagger tại /api/docs)
frontend/   Angular 16 SPA (Angular Material, ng2-charts, CDK drag-drop)
docs/       Tài liệu bổ sung
```

## Yêu cầu

- Node.js 18+ (đã kiểm tra với 18.20.4)
- MongoDB 6+ đang chạy tại `mongodb://localhost:27017`

## Chạy nhanh

```powershell
# 1. Backend
cd backend
copy .env.example .env        # sau đó đổi JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm install
npm run seed:reset            # tạo dữ liệu mẫu (xóa dữ liệu cũ)
npm run start:dev             # http://localhost:3000/api/v1

# 2. Frontend (terminal khác)
cd frontend
npm install
npm start                     # http://localhost:4200 (proxy /api -> :3000)
```

Tài khoản demo:

| Email | Mật khẩu | Vai trò |
|---|---|---|
| admin@demo.com | Admin@123 | admin |
| director@demo.com | User@123 | director |
| manager.it@demo.com | User@123 | manager |
| dev1@demo.com | User@123 | staff |

### Thêm nhiều dữ liệu mẫu

```powershell
cd backend
npm run seed:more   # bổ sung dữ liệu, KHÔNG xóa dữ liệu cũ, chạy lại nhiều lần vẫn an toàn
```

Thêm: 4 phòng ban, 28 người dùng (mật khẩu `User@123`: `manager.kd/mkt/vh/cskh@demo.com`, `nv01`…`nv24@demo.com`), 8 dự án, khoảng 90 công việc kèm bình luận,
36 đơn phê duyệt đủ trạng thái (tạo qua `WorkflowsService` thật), 29 tài sản, 4 tài nguyên và khoảng 100 lịch đặt phòng.
Muốn làm lại từ đầu: `npm run seed:reset` rồi `npm run seed:more`.

## Tính năng

- **Xác thực:** JWT access token (15 phút) + refresh token xoay vòng (lưu hash, dùng lại token cũ sẽ thu hồi phiên), đổi mật khẩu, rate-limit đăng nhập.
- **Phân quyền:** `admin`, `director`, `manager`, `staff` kết hợp kiểm tra quyền theo từng bản ghi (dự án, công việc, đơn).
- **Dự án & công việc:** CRUD, việc con, checklist, bình luận có @nhắc tên, file đính kèm, ghi giờ, bảng Kanban kéo-thả, lọc/sắp xếp/phân trang.
- **Đề xuất & phê duyệt:** mẫu quy trình tùy chỉnh (trường form động, nhiều bước, người duyệt theo quản lý/vai trò/cá nhân, điều kiện số tiền), duyệt/từ chối/hủy, chống xử lý trùng.
- **Tài sản:** danh mục, cấp phát, thu hồi, lịch sử.
- **Đặt phòng / tài nguyên:** lịch tuần, kiểm tra trùng lịch.
- **Báo cáo:** tổng quan, theo trạng thái, quá hạn, khối lượng công việc, xu hướng hoàn thành.
- **Quản trị:** người dùng, phòng ban (cây), mẫu quy trình, tài nguyên, nhật ký thao tác (audit log, tự xóa sau 180 ngày).
- **Thông báo:** trong ứng dụng, polling 30 giây.

## Lệnh hữu ích

| Thư mục | Lệnh | Tác dụng |
|---|---|---|
| backend | `npm run build` | Biên dịch |
| backend | `npm run seed` / `seed:reset` | Tạo dữ liệu mẫu |
| frontend | `npm run build` | Build production |

## Ghi chú

- File upload lưu tại `backend/uploads`, chặn các định dạng thực thi (.exe, .bat, .js, .html...).
- Dùng `bcryptjs` (thuần JS) thay `bcrypt` để tránh build native trên Windows.
- MongoDB chạy standalone nên không dùng transaction; các thao tác phê duyệt dùng cập nhật có điều kiện (`findOneAndUpdate`).
- Trước khi triển khai thật: đổi toàn bộ secret trong `.env`, đặt `CORS_ORIGIN` đúng domain, bật HTTPS.
