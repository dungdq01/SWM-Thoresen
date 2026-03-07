# Module 1 - Foundation - report

## Trạng thái tổng quan
| Step | Hạng mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 0 | `plan_implement.md` | Done | Đã chốt scope Module 1 `foundation`, entities, dependencies, API và acceptance criteria. |
| 1 | Database schema + migration + seed | Done | Đã tạo `schema.prisma`, `migration.sql`, `seed.ts` cho PostgreSQL. |
| 2 | Mapping data + DTO + relational constraints | Done | Đã tách DTO/query DTO, repository layer và mapping theo module `foundation`. |
| 3 | Backend API | Done | Đã scaffold NestJS app, guard, interceptor, filter, controller/service/repository cho Module 1. |
| 4 | Chạy backend để kiểm tra lỗi | Done | Backend chạy OK. Database `swms` đã migrate và seed thành công. |
| 5 | Review code so với spec/techstack/architecture | Done | Đã bổ sung roles go-live, reason codes go-live, helper methods cho services. |

## Ghi nhận tiến độ
### 2026-03-08
- Đã đọc `docs/stack/Module_1_techstack.md`.
- Đã đọc `.windsurf/workflows/skill-code.md` và bám theo Step 0 -> Step 3.
- Đã đọc `docs/architecture/architecture-be.md` để bám kiến trúc modular monolith, repository/service/controller, Prisma + PostgreSQL.
- Đã xác nhận `backend/` hiện đang là khung trống, cần scaffold mới.
- Đã tạo file `plan_implement.md` và cấu hình backend nền.
- Đã tạo Prisma schema cho các bảng `app_user`, `role`, `permission`, `role_permission`, `user_role`, `reason_code`, `number_sequence`, `number_sequence_counter`, `business_rule_catalog`, `decision_log`, `change_control_record`, `audit_log`, `exception_log`, `idempotency_record`.
- Đã tạo migration SQL khởi tạo Module 1.
- Đã tạo seed data mẫu cho users, roles, permissions, reason codes, number sequences, governance records.
- Đã tạo lớp hạ tầng NestJS gồm `main.ts`, `app.module.ts`, health endpoint, auth guard, permission guard, exception filter, response interceptor và Prisma service/module.
- Đã tạo repository/service/controller cho toàn bộ nhóm API của `foundation`: RBAC, reason code, number sequence, governance, audit/exception/idempotency.
- Đã tạo tài liệu module tại `backend/docs/module-1-foundation.md`.
- Đã tạo tài liệu database tại `backend/prisma/docs/module-11-foundation.md`.

## Rủi ro / lưu ý
- Vì repo chưa có backend code sẵn, cần dựng module từ đầu nhưng vẫn bám đúng structure trong tài liệu kiến trúc.
- Việc chạy backend thực tế cần cài dependencies và cần `DATABASE_URL` trỏ tới PostgreSQL khả dụng.
- Trước khi test API có DB, cần chạy `prisma generate`, migrate và seed.

## Hướng dẫn chạy backend

### 1. Tạo database PostgreSQL
```bash
# Dùng psql hoặc GUI tool (pgAdmin, DBeaver, etc.) để tạo database
createdb -U postgres swms_module1

# Hoặc dùng psql
psql -U postgres -c "CREATE DATABASE swms_module1;"
```

**Lưu ý:** File `.env` đang config `DATABASE_URL` trỏ tới `swms_module1`. Nếu muốn dùng database khác, sửa lại biến này.

### 2. Chạy migration và seed
```bash
cd backend
npx prisma migrate dev --name init
npm run prisma:seed
```

### 3. Khởi động backend
```bash
npm run start
# hoặc
npm run start:dev
```

### 4. Test API
```bash
# Health check
curl http://localhost:3000/health

# Lấy danh sách roles (bypass auth)
curl -H "x-user-code: admin" http://localhost:3000/api/v1/foundation/roles

# Lấy permissions của user hiện tại
curl -H "x-user-code: admin" http://localhost:3000/api/v1/foundation/me/permissions
```
