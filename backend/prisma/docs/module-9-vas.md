# Module 9: VAS / Bagging Operations — Database Documentation

**Module:** VAS / Bagging Operations  
**Schema Location:** `prisma/schema.prisma`  
**Tables:** 5  
**Enums:** 6

---

## 1. Enums

### VasWoStatus
Trạng thái Work Order

| Value | Description |
|-------|-------------|
| DRAFT | Mới tạo, chưa xác nhận |
| CONFIRMED | Đã xác nhận, đã reserve stock |
| IN_PROGRESS | Đang thực hiện (có session) |
| COMPLETED | Hoàn thành, đã post inventory |
| CANCELLED | Đã hủy |

### VasPackagingOwnership
Quyền sở hữu bao bì

| Value | Description |
|-------|-------------|
| TVL_OWNED | TVL sở hữu bao bì |
| CLIENT_OWNED | Khách hàng sở hữu bao bì |

### VasShiftCode
Ca làm việc

| Value | Description |
|-------|-------------|
| MORNING | Ca sáng |
| AFTERNOON | Ca chiều |
| NIGHT | Ca đêm |

### VasOutboxStatus
Trạng thái outbox event

| Value | Description |
|-------|-------------|
| PENDING | Chờ gửi |
| SENT | Đã gửi thành công |
| FAILED | Gửi thất bại, chờ retry |
| DEAD | Dead letter (hết retry) |

### VasStateAction
Loại action chuyển trạng thái

| Value | Description |
|-------|-------------|
| CREATE | Tạo mới |
| CONFIRM | Xác nhận |
| START | Bắt đầu (session đầu) |
| ADD_SESSION | Thêm session |
| COMPLETE | Hoàn thành |
| CANCEL | Hủy |

### VasExceptionSeverity
Mức độ nghiêm trọng exception

| Value | Description |
|-------|-------------|
| INFO | Thông tin |
| WARN | Cảnh báo |
| ERROR | Lỗi |

---

## 2. Tables

### 2.1 vas_work_order

Header work order đóng bao.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| wo_number | varchar(30) | NO | Số WO (unique, format: VAS-YYYYMMDD-NNNNNN) |
| status | VasWoStatus | NO | Trạng thái hiện tại |
| owner_id | uuid | NO | FK → md_owner (chủ hàng) |
| warehouse_id | uuid | NO | FK → md_warehouse |
| bulk_source_item_id | uuid | NO | FK → md_item (hàng xá nguồn) |
| bagged_output_item_id | uuid | NO | FK → md_item (hàng bao đầu ra) |
| planned_qty_kg | decimal(18,3) | NO | Khối lượng kế hoạch (kg) |
| actual_consumed_qty_kg | decimal(18,3) | YES | Khối lượng tiêu hao thực tế |
| actual_output_qty_kg | decimal(18,3) | YES | Khối lượng đầu ra thực tế |
| process_loss_qty_kg | decimal(18,3) | YES | Hao hụt quá trình |
| actual_bag_count | int | YES | Số bao thực tế |
| packaging_ownership | VasPackagingOwnership | NO | Quyền sở hữu bao bì |
| packaging_item_id | uuid | NO | FK → md_item (vật tư bao bì) |
| packaging_owner_id | uuid | NO | FK → md_owner (chủ bao bì) |
| packaging_qty_planned | int | NO | Số bao bì kế hoạch |
| packaging_qty_actual | int | YES | Số bao bì tiêu hao thực tế |
| start_date | date | NO | Ngày bắt đầu dự kiến |
| estimated_completion_date | date | YES | Ngày hoàn thành dự kiến |
| confirmed_at | timestamp | YES | Thời điểm xác nhận |
| confirmed_by | uuid | YES | Người xác nhận |
| started_at | timestamp | YES | Thời điểm bắt đầu thực tế |
| completed_at | timestamp | YES | Thời điểm hoàn thành |
| completed_by | uuid | YES | Người hoàn thành |
| cancelled_at | timestamp | YES | Thời điểm hủy |
| cancelled_by | uuid | YES | Người hủy |
| cancel_reason_code | varchar(50) | YES | Mã lý do hủy |
| yield_variance_reason_code | varchar(50) | YES | Mã lý do chênh lệch yield |
| notes | text | YES | Ghi chú |
| external_id | varchar(100) | NO | External ID (unique, idempotency) |
| correlation_id | uuid | NO | Correlation ID |
| created_by | uuid | NO | Người tạo |
| created_at | timestamp | NO | Thời điểm tạo |
| updated_at | timestamp | NO | Thời điểm cập nhật |
| row_version | bigint | NO | Version cho optimistic lock |

**Indexes:**
- `(warehouse_id, status, created_at DESC)`
- `(owner_id, status, created_at DESC)`
- `(bulk_source_item_id, status)`
- `(bagged_output_item_id, status)`
- `(correlation_id)`

**Relations:**
- `owner` → MdOwner
- `warehouse` → MdWarehouse
- `bulkSourceItem` → MdItem
- `baggedOutputItem` → MdItem
- `packagingItem` → MdItem
- `packagingOwner` → MdOwner

---

### 2.2 vas_session

Session progress đóng bao theo ca.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| wo_id | uuid | NO | FK → vas_work_order |
| session_num | int | NO | Số thứ tự session |
| session_date | date | NO | Ngày làm việc |
| shift_code | VasShiftCode | NO | Ca làm việc |
| session_qty_kg | decimal(18,3) | NO | Khối lượng session (kg) |
| session_bag_count | int | NO | Số bao trong session |
| work_hours | decimal(8,2) | YES | Số giờ làm việc |
| productivity_rate | decimal(18,3) | YES | Năng suất (kg/giờ) |
| is_overtime | boolean | NO | Có phải overtime không |
| start_time | timestamp | YES | Thời gian bắt đầu |
| end_time | timestamp | YES | Thời gian kết thúc |
| notes | text | YES | Ghi chú |
| external_id | varchar(100) | NO | External ID (unique) |
| created_by | uuid | NO | Người tạo |
| created_at | timestamp | NO | Thời điểm tạo |

**Constraints:**
- UNIQUE `(wo_id, session_num)`

**Indexes:**
- `(wo_id, session_date)`

---

### 2.3 vas_state_history

Lịch sử chuyển trạng thái WO (audit trail).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| wo_id | uuid | NO | FK → vas_work_order |
| from_status | VasWoStatus | YES | Trạng thái trước |
| to_status | VasWoStatus | NO | Trạng thái sau |
| action | VasStateAction | NO | Loại action |
| reason_code | varchar(50) | YES | Mã lý do |
| remarks | text | YES | Ghi chú |
| actor_id | uuid | NO | ID người thực hiện |
| actor_role | varchar(30) | NO | Role người thực hiện |
| correlation_id | uuid | NO | Correlation ID |
| created_at | timestamp | NO | Thời điểm |

**Indexes:**
- `(wo_id, created_at DESC)`
- `(correlation_id)`

---

### 2.4 vas_exception_log

Log exception nghiệp vụ.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| wo_id | uuid | NO | FK → vas_work_order |
| exception_code | varchar(50) | NO | Mã exception |
| severity | VasExceptionSeverity | NO | Mức độ |
| payload_json | jsonb | YES | Payload chi tiết |
| reason_code | varchar(50) | YES | Mã lý do |
| resolved_at | timestamp | YES | Thời điểm giải quyết |
| resolved_by | uuid | YES | Người giải quyết |
| created_at | timestamp | NO | Thời điểm tạo |

**Indexes:**
- `(wo_id, created_at DESC)`
- `(exception_code, severity)`

---

### 2.5 vas_outbox

Outbox pattern cho billing events.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| event_type | varchar(50) | NO | Loại event (BAGGING_FEE_CAPTURE) |
| aggregate_type | varchar(50) | NO | VAS_WORK_ORDER |
| aggregate_id | uuid | NO | FK → vas_work_order |
| aggregate_number | varchar(30) | NO | WO number |
| event_key | varchar(120) | NO | Unique key (dedup) |
| payload_json | jsonb | NO | Event payload |
| status | VasOutboxStatus | NO | Trạng thái gửi |
| retry_count | int | NO | Số lần retry |
| next_retry_at | timestamp | YES | Thời điểm retry tiếp |
| last_error | text | YES | Lỗi gần nhất |
| created_at | timestamp | NO | Thời điểm tạo |
| sent_at | timestamp | YES | Thời điểm gửi thành công |

**Indexes:**
- `(status, next_retry_at)`
- `(aggregate_id, event_type)`

---

## 3. Entity Relationship Diagram

```
┌─────────────────┐
│    md_owner     │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│ vas_work_order  │───────│  md_warehouse   │
└────────┬────────┘       └─────────────────┘
         │
    ┌────┼────┬────────────┐
    │    │    │            │
    ▼    ▼    ▼            ▼
┌──────┐┌──────┐┌──────────┐┌──────────┐
│session││history││exception ││  outbox  │
└──────┘└──────┘└──────────┘└──────────┘
```

---

## 4. Migration Notes

### Forward Migration
```sql
-- Create enums
CREATE TYPE "VasWoStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "VasPackagingOwnership" AS ENUM ('TVL_OWNED', 'CLIENT_OWNED');
CREATE TYPE "VasShiftCode" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');
CREATE TYPE "VasOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DEAD');
CREATE TYPE "VasStateAction" AS ENUM ('CREATE', 'CONFIRM', 'START', 'ADD_SESSION', 'COMPLETE', 'CANCEL');
CREATE TYPE "VasExceptionSeverity" AS ENUM ('INFO', 'WARN', 'ERROR');

-- Create tables (see schema.prisma)
```

### Rollback Migration
```sql
DROP TABLE IF EXISTS vas_outbox;
DROP TABLE IF EXISTS vas_exception_log;
DROP TABLE IF EXISTS vas_state_history;
DROP TABLE IF EXISTS vas_session;
DROP TABLE IF EXISTS vas_work_order;
DROP TYPE IF EXISTS "VasExceptionSeverity";
DROP TYPE IF EXISTS "VasStateAction";
DROP TYPE IF EXISTS "VasOutboxStatus";
DROP TYPE IF EXISTS "VasShiftCode";
DROP TYPE IF EXISTS "VasPackagingOwnership";
DROP TYPE IF EXISTS "VasWoStatus";
```

---

## 5. Seed Data

Không có seed data bắt buộc cho Module 9. WO được tạo runtime từ business operations.

Tuy nhiên, cần đảm bảo:
- Có ReasonCode cho `VAS_CANCEL`, `PROCESS_LOSS_*` trong M1
- Có NumberSequence pattern `VAS-*` trong M1
