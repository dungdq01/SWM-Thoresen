# Module 1 - Foundation Database

## 1. Mục tiêu database của module
Database của `foundation` là lớp dữ liệu nền cho các concern dùng chung trong toàn backend:
- RBAC
- reason code
- number sequence
- governance catalog
- audit / exception / idempotency

Thiết kế hiện tại dùng `PostgreSQL` qua Prisma và được khai báo tại:
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260308030000_init_module_1/migration.sql`
- `backend/prisma/seed.ts`

## 2. Danh sách bảng thực tế
### Nhóm RBAC
- `app_user`
- `role`
- `permission`
- `role_permission`
- `user_role`

### Nhóm reason / sequence
- `reason_code`
- `number_sequence`
- `number_sequence_counter`

### Nhóm governance
- `business_rule_catalog`
- `decision_log`
- `change_control_record`

### Nhóm logging / safety
- `audit_log`
- `exception_log`
- `idempotency_record`

## 3. Mô tả từng bảng

### `app_user`
- **Để làm gì**
  - Lưu user nội bộ dùng cho RBAC và audit actor.
- **Field chính**
  - `id`
  - `user_code`
  - `username`
  - `full_name`
  - `email`
  - `is_active`
  - `created_at`
  - `updated_at`
- **Quan hệ**
  - 1 user có nhiều `user_role`

### `role`
- **Để làm gì**
  - Lưu danh mục role.
- **Field chính**
  - `role_code`
  - `role_name`
  - `description`
  - `is_system_role`
  - `is_active`
- **Quan hệ**
  - 1 role có nhiều `role_permission`
  - 1 role được gán cho nhiều `user_role`

### `permission`
- **Để làm gì**
  - Lưu catalog permission theo module/resource/action.
- **Field chính**
  - `permission_code`
  - `module_code`
  - `resource_code`
  - `action_code`
  - `is_sensitive`
  - `is_active`
- **Index/constraint đáng chú ý**
  - unique `permission_code`
  - unique `(module_code, resource_code, action_code)`

### `role_permission`
- **Để làm gì**
  - Nối role với permission.
- **Field chính**
  - `role_id`
  - `permission_id`
  - `effect`
  - `scope_type`
  - `scope_value`
- **Constraint**
  - unique `(role_id, permission_id)`

### `user_role`
- **Để làm gì**
  - Gán role cho user, có thể kèm `warehouse_code` và `owner_id`.
- **Field chính**
  - `user_id`
  - `role_id`
  - `warehouse_code`
  - `owner_id`
  - `is_primary`
  - `is_active`
  - `assigned_at`
- **Index/constraint đáng chú ý**
  - index `(user_id, is_active)`
  - index `(role_id, is_active)`
  - unique partial cho assignment active theo scope

### `reason_code`
- **Để làm gì**
  - Lưu reason code dùng chung cho action nhạy cảm.
- **Field chính**
  - `code`
  - `description`
  - `category`
  - `domain_code`
  - `requires_approval`
  - `affects_billing`
  - `requires_note`
  - `sort_order`
  - `is_active`
- **Index/constraint đáng chú ý**
  - unique `code`
  - index `(domain_code, category, is_active)`

### `number_sequence`
- **Để làm gì**
  - Lưu cấu hình rule cấp số.
- **Field chính**
  - `sequence_code`
  - `scope_type`
  - `reset_policy`
  - `prefix_template`
  - `format_template`
  - `running_no_length`
  - `allow_gap`
  - `is_active`

### `number_sequence_counter`
- **Để làm gì**
  - Lưu counter nóng cho mỗi tổ hợp `sequence + scope + date`.
- **Field chính**
  - `sequence_id`
  - `scope_key`
  - `counter_date`
  - `last_number`
  - `version_no`
  - `updated_at`
- **Constraint**
  - unique `(sequence_id, scope_key, counter_date)`
- **Lưu ý kỹ thuật**
  - service hiện dùng upsert để đảm bảo row tồn tại trước khi tăng số
  - sau đó dùng câu `UPDATE ... RETURNING` để lấy `last_number` mới nhất

### `business_rule_catalog`
- **Để làm gì**
  - Lưu catalog rule nền.
- **Field chính**
  - `rule_code`
  - `domain`
  - `title`
  - `description`
  - `current_status`
  - `source_of_truth`
  - `effective_phase`
  - `owner_role`

### `decision_log`
- **Để làm gì**
  - Lưu các quyết định kỹ thuật/nghiệp vụ đã chốt.
- **Field chính**
  - `decision_no`
  - `decision_type`
  - `context_domain`
  - `summary`
  - `decided_value`
  - `status`
  - `source_refs`
  - `impacted_modules`

### `change_control_record`
- **Để làm gì**
  - Lưu đề xuất thay đổi có kiểm soát.
- **Field chính**
  - `change_no`
  - `change_type`
  - `title`
  - `description`
  - `priority`
  - `impact_summary`
  - `status`
  - `target_release`

### `audit_log`
- **Để làm gì**
  - Lưu lịch sử thao tác để truy vết.
- **Field chính**
  - `entity_type`
  - `entity_id`
  - `action`
  - `old_value`
  - `new_value`
  - `user_id`
  - `user_role`
  - `occurred_at`
  - `correlation_id`
  - `request_id`
  - `source_module`
- **Index đáng chú ý**
  - `(entity_type, entity_id, occurred_at)`
  - `(user_id, occurred_at)`
  - `(correlation_id)`
  - `(source_module, occurred_at)`

### `exception_log`
- **Để làm gì**
  - Lưu lỗi nghiệp vụ / lỗi duplicate / lỗi ngăn chặn cần xử lý.
- **Field chính**
  - `exception_no`
  - `exception_type`
  - `severity`
  - `source_module`
  - `message`
  - `details`
  - `correlation_id`
  - `is_resolved`
  - `resolved_at`
  - `resolved_by`

### `idempotency_record`
- **Để làm gì**
  - Lưu trạng thái xử lý của command có idempotency.
- **Field chính**
  - `idempotency_key`
  - `command_name`
  - `source_module`
  - `request_hash`
  - `request_payload`
  - `response_code`
  - `response_body`
  - `resource_type`
  - `resource_id`
  - `status`
  - `locked_until`
  - `expired_at`
- **Rule quan trọng**
  - cùng key nhưng khác `request_hash` sẽ bị conflict
  - key thành công có thể trả lại `response_body` đã lưu

## 4. Quan hệ dữ liệu tổng quát
```text
app_user ---< user_role >--- role ---< role_permission >--- permission

reason_code -> dùng bởi audit_log / exception_log / downstream modules

number_sequence ---< number_sequence_counter

business_rule_catalog (catalog rule)
decision_log (quyết định chốt)
change_control_record (yêu cầu thay đổi)

audit_log / exception_log / idempotency_record là bảng runtime safety và truy vết
```

## 5. Seed data đang có
`seed.ts` hiện đang nạp:

### Users
- `admin`, `gov_manager`

### Roles go-live (theo spec)
- `ADMIN`, `GOVERNANCE_MANAGER`, `WH_MANAGER`, `WH_KEEPER`, `WB_OPERATOR`, `BILLING_OFC`, `OPS_SUPER`, `CUST_VIEWER`

### Permission catalog
- Cho toàn bộ endpoint đã implement

### Reason codes go-live (theo spec)
| Domain | Codes |
|---|---|
| INBOUND | `DAMAGED`, `SHORT_DELIVERY`, `OVER_DELIVERY`, `WRONG_ITEM`, `SCALE_CALIBRATION`, `DOCUMENTATION_ERROR` |
| OUTBOUND | `CUSTOMER_REJECT`, `WEIGHT_MISMATCH`, `QUALITY_ISSUE` |
| INVENTORY | `CYCLE_COUNT_ADJUST`, `DAMAGE_WRITEOFF`, `STATUS_CHANGE`, `SHRINKAGE` |
| FOUNDATION | `OTHER`, `MANUAL_WEIGHT`, `MANUAL_ADJUST`, `DUPLICATE_RETRY` |

### Number sequences
- `RCV`, `SHP`, `WRK`, `TRX`, `DN`

### Governance
- business rule mẫu
- decision log mẫu
- change control mẫu

## 6. File code nào đang thao tác bảng nào?
### RBAC
- `repositories/user.repository.ts`
  - `app_user`
- `repositories/role.repository.ts`
  - `role`
  - `role_permission`
  - `user_role`
- `repositories/permission.repository.ts`
  - `permission`
  - `user_role`
  - `role_permission`

### Reason code
- `repositories/reason-code.repository.ts`
  - `reason_code`

### Number sequence
- `repositories/number-sequence.repository.ts`
  - `number_sequence`
  - `number_sequence_counter`

### Governance
- `repositories/governance.repository.ts`
  - `business_rule_catalog`
  - `decision_log`
  - `change_control_record`

### Logging / idempotency
- `repositories/log.repository.ts`
  - `audit_log`
  - `exception_log`
  - `idempotency_record`

## 7. Lưu ý cho dev mới
- `number_sequence_counter` là bảng nóng, không nên sửa tay.
- `idempotency_record` là source of truth cho retry-safe command.
- `audit_log` và `exception_log` nên được đọc qua API/service, không nên query ad-hoc không có filter.
- Khi bổ sung bảng mới cho `foundation`, cần giữ đúng nguyên tắc: controller mỏng, service xử lý rule, repository chỉ truy cập DB.
