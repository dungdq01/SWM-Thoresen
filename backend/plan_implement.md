# Module 1 - Foundation - plan_implement

## 1. Mô tả nghiệp vụ module
Module 1 `foundation` là lớp nền dùng chung cho toàn backend SWMS TVL. Module này không xử lý luồng nhập, xuất hay tồn kho trực tiếp mà cung cấp các năng lực điều khiển và governance để các module khác dùng chung:
- RBAC và kiểm tra quyền thao tác.
- Gán role cho user theo warehouse scope.
- Catalog permission.
- Reason code dùng chung cho các thao tác nhạy cảm.
- Number sequence để cấp số chứng từ.
- Business rule catalog, decision log, change control.
- Audit log, exception log, idempotency registry.

## 2. Entities / Bảng dữ liệu chính
- `app_user`
- `role`
- `permission`
- `role_permission`
- `user_role`
- `reason_code`
- `number_sequence`
- `number_sequence_counter`
- `business_rule_catalog`
- `decision_log`
- `change_control_record`
- `audit_log`
- `exception_log`
- `idempotency_record`

## 3. Dependencies
- Không phụ thuộc module nghiệp vụ khác.
- Dùng `PostgreSQL` qua `Prisma` làm source of truth.
- Các module downstream sẽ gọi vào service/API của `foundation` để kiểm tra quyền, cấp số, reason code, audit và idempotency.

## 4. API endpoints dự kiến
### RBAC
- `GET /api/v1/foundation/roles`
- `POST /api/v1/foundation/roles`
- `PUT /api/v1/foundation/roles/:id`
- `POST /api/v1/foundation/roles/:id/permissions`
- `GET /api/v1/foundation/permissions`
- `POST /api/v1/foundation/users/:userId/roles`
- `GET /api/v1/foundation/me/permissions`

### Reason code
- `GET /api/v1/foundation/reason-codes`
- `POST /api/v1/foundation/reason-codes`
- `PUT /api/v1/foundation/reason-codes/:id`
- `POST /api/v1/foundation/reason-codes/:id/deactivate`

### Number sequence
- `GET /api/v1/foundation/number-sequences`
- `POST /api/v1/foundation/number-sequences`
- `PUT /api/v1/foundation/number-sequences/:id`
- `POST /api/v1/foundation/number-sequences/:code/next`

### Governance
- `GET /api/v1/foundation/rules`
- `POST /api/v1/foundation/rules`
- `PUT /api/v1/foundation/rules/:id`
- `GET /api/v1/foundation/decision-logs`
- `POST /api/v1/foundation/decision-logs`
- `POST /api/v1/foundation/change-controls`

### Logs & idempotency
- `GET /api/v1/foundation/audit-logs`
- `GET /api/v1/foundation/exception-logs`
- `POST /api/v1/foundation/exception-logs/:id/resolve`
- `GET /api/v1/foundation/idempotency/:key`

## 5. Business rules
- Mọi API thay đổi dữ liệu phải đi qua service layer, không xử lý business rule trong controller.
- Mọi API thay đổi cấu hình quan trọng phải ghi audit log.
- Các API side effect quan trọng phải hỗ trợ `Idempotency-Key`.
- `same key + different payload` phải trả conflict.
- Permission được tính theo tập role active của user.
- User chỉ được thao tác dữ liệu nằm trong warehouse scope của mình khi scope được gửi kèm.
- Sequence phải cấp số an toàn theo `sequence_code + scope_key + counter_date`.
- Reason code không được xóa cứng nếu đã dùng lịch sử, chỉ deactivate.
- Exception log phải hỗ trợ đánh dấu đã xử lý.

## 6. Acceptance criteria
- Có schema Prisma, migration SQL và seed data cho Module 1.
- Có repository layer, service layer, controller layer rõ ràng.
- Có guard cho auth và permission.
- Có API response/error rõ ràng để dev FE/dev mới đọc dễ hiểu.
- Có tài liệu module và tài liệu database phản ánh đúng code thực tế.
- Backend có thể khởi động được sau khi cài dependencies và cấu hình env.
