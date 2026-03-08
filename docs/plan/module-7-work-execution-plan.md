# Module 7 — Work Execution & Mobile Operations
## Implementation Plan

**Ngày tạo:** 2026-03-08  
**Phiên bản:** 1.0  
**Module:** work-execution  
**Folder:** `backend/src/modules/work-execution`

---

## 1. Mô tả nghiệp vụ Module

Module 7 là **execution orchestration layer** của kho, chịu trách nhiệm:

- Quản lý lifecycle của work (tạo, claim, start, execute, skip, cancel, complete)
- Hỗ trợ mobile execution với offline sync capability
- Tạo inventory posting effects qua M3 cho putaway/pick/move/transfer
- Callback/handoff về module nguồn (M4/M5/M6) sau khi work hoàn tất
- Dashboard supervisor và SLA monitoring

**Quan trọng:**
- M7 **không sở hữu** inbound receipt posting của M4
- M7 **không sở hữu** outbound ship posting của M5
- M7 chỉ post **movement inventory effects** thông qua M3 Inventory Core Engine

---

## 2. Entities/Bảng Data Model

### 2.1 Runtime Core Tables

| Bảng | Mô tả |
|------|-------|
| `we_work_header` | Container nghiệp vụ của task |
| `we_work_line` | Đơn vị thực thi và posting nhỏ nhất |
| `we_work_assignment_history` | Lịch sử claim/release/reassign |
| `we_work_status_history` | Lịch sử chuyển trạng thái |
| `we_work_posting_link` | Liên kết với inventory posting M3 |

### 2.2 Trace/Support Tables

| Bảng | Mô tả |
|------|-------|
| `we_work_event_log` | Event log cho audit |
| `we_work_exception` | Exception tracking |
| `we_mobile_sync_batch` | Batch sync từ mobile |
| `we_mobile_sync_event` | Event trong batch sync |
| `we_work_outbox_event` | Outbox cho callback async |

---

## 3. Dependencies (Modules phải xong trước)

| Module | Dependency |
|--------|-----------|
| M1 Foundation | RBAC, reason code, audit, idempotency, number sequence |
| M2 Master Data | warehouse, location, item, owner, inventory_status |
| M3 Inventory Core | posting engine, query posting result |
| M4 Inbound | nguồn trigger putaway work, callback target |
| M5 Outbound | nguồn trigger pick work, callback target |
| M6 Inventory Control | nguồn trigger move/transfer work, callback target |

---

## 4. Danh sách API Endpoints

### 4.1 Query APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/works` | List works (web dashboard) |
| GET | `/api/v1/works/:workId` | Work detail |
| GET | `/api/v1/works/:workId/history` | Timeline status/event |
| GET | `/api/v1/works/:workId/exceptions` | Exceptions của work |
| GET | `/api/v1/works/dashboard/summary` | Dashboard summary |
| GET | `/api/v1/mobile/works/available` | Works available để claim (mobile) |
| GET | `/api/v1/mobile/works/my` | My claimed works (mobile) |

### 4.2 Command APIs - Header Level

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/works/:workId/claim` | Claim work |
| POST | `/api/v1/works/:workId/release` | Release claim |
| POST | `/api/v1/works/:workId/start` | Start work header |
| POST | `/api/v1/works/:workId/cancel` | Cancel work |

### 4.3 Command APIs - Line Level

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/works/:workId/lines/:lineNum/start` | Start line |
| POST | `/api/v1/works/:workId/lines/:lineNum/complete` | Complete line |
| POST | `/api/v1/works/:workId/lines/:lineNum/skip` | Skip line |
| POST | `/api/v1/works/:workId/manager-override-complete` | Manager override |

### 4.4 Mobile Utility APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/mobile/scan/validate` | Validate QR scan |
| POST | `/api/v1/mobile/works/sync` | Batch sync offline events |

### 4.5 Internal APIs (cho M4/M5/M6 trigger)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/internal/works/generate` | Generate work từ source trigger |

---

## 5. Business Rules & Acceptance Criteria

### 5.1 State Machine Rules

**Work Header:**
- `OPEN -> IN_PROGRESS -> COMPLETED`
- `OPEN -> CANCELLED`
- `IN_PROGRESS -> CANCELLED` (manager only, có reason)
- Claim không đổi status, chỉ gắn `assigned_to`
- Chỉ `start` mới đổi `OPEN -> IN_PROGRESS`
- Header `COMPLETED` khi tất cả lines ở terminal state

**Work Line:**
- `OPEN -> IN_PROGRESS -> COMPLETED`
- `OPEN -> IN_PROGRESS -> SKIPPED` (manager/policy)
- `OPEN/IN_PROGRESS -> CANCELLED` (khi header cancel)
- Không cho `OPEN -> COMPLETED` trực tiếp
- `COMPLETED` và `SKIPPED` là terminal

### 5.2 Validation Rules

- **Claim:** Header `OPEN`, `assigned_to` đang null, user có quyền warehouse scope
- **Start Header:** Đã claim, status = `OPEN`
- **Start Line:** Header `IN_PROGRESS`, Line `OPEN`
- **Complete Line:** Line `IN_PROGRESS`, actual_qty > 0, location scan hợp lệ
- **Skip Line:** Manager role, line chưa terminal, reason bắt buộc
- **Cancel Work:** Role phù hợp, state hợp lệ, chưa có posting irreversible

### 5.3 Posting Rules

- `1 WorkLine COMPLETED = 1 inventory posting request` tới M3
- Putaway complete: `MOVE RECEIVING -> STORAGE`
- Pick complete: `MOVE STORAGE -> STAGING`
- Transfer pick: `TRANSFER_SHIP`
- Transfer put: `TRANSFER_RECEIVE`

### 5.4 Exception Handling

- **Short pick:** variance > threshold -> block/require manager
- **Location mismatch:** scan sai -> block normal complete
- **Item not found:** skip + exception log

### 5.5 Idempotency

- Create work: unique theo `source_module + source_type + source_ref_id + work_type`
- Commands: unique theo `external_id`
- Sync events: unique theo event `external_id`

---

## 6. Cấu trúc Code

```
src/modules/work-execution/
├── work-execution.module.js
├── work-execution.routes.js
├── work-execution.controller.js
├── work-execution.schema.js
├── application/
│   ├── generateWork.usecase.js
│   ├── claimWork.usecase.js
│   ├── releaseWork.usecase.js
│   ├── startWork.usecase.js
│   ├── cancelWork.usecase.js
│   ├── startLine.usecase.js
│   ├── completeLine.usecase.js
│   ├── skipLine.usecase.js
│   ├── managerOverride.usecase.js
│   ├── syncBatch.usecase.js
│   ├── validateScan.usecase.js
│   ├── getWorkList.usecase.js
│   ├── getWorkDetail.usecase.js
│   ├── getDashboard.usecase.js
│   └── getMyWorks.usecase.js
├── domain/
│   ├── work.state-machine.js
│   ├── work.policy.js
│   ├── work.errors.js
│   └── work.types.js
└── infra/
    ├── workHeader.repository.js
    ├── workLine.repository.js
    ├── workEvent.repository.js
    ├── workException.repository.js
    ├── workOutbox.repository.js
    ├── mobileSync.repository.js
    ├── work.mapper.js
    └── inventoryAdapter.js
```

---

## 7. Checklist Implementation

### Step 1: Database
- [ ] Thêm enums vào schema.prisma
- [ ] Thêm models cho 10 bảng
- [ ] Tạo migration
- [ ] Tạo seed data

### Step 2: Mapping
- [ ] Verify FK với M1-M6
- [ ] Tạo DTO types
- [ ] Tạo mapper functions

### Step 3: Backend API
- [ ] Domain layer (state machine, policy, errors)
- [ ] Repository layer
- [ ] Application layer (usecases)
- [ ] Controller + Routes
- [ ] Validation schema

### Step 4: Test
- [ ] Unit tests cho state machine
- [ ] Integration tests cho APIs
- [ ] Concurrency tests

---

## 8. Error Codes

| Code | Mô tả |
|------|-------|
| WE-404-001 | Work not found |
| WE-404-002 | Work line not found |
| WE-409-001 | Work already claimed |
| WE-409-002 | Invalid state transition |
| WE-409-003 | Work already completed |
| WE-409-004 | Duplicate external_id |
| WE-422-001 | Invalid scanned location |
| WE-422-002 | Location type not allowed |
| WE-422-003 | Actual quantity invalid |
| WE-422-004 | Short pick threshold exceeded |
| WE-422-005 | Manager evidence required |
| WE-423-001 | Work locked by another action |
| WE-500-001 | Inventory posting failed |
| WE-500-002 | Callback delivery failed |

---

## 9. Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| Step 0-1 | 1 day | Plan + Database schema |
| Step 2 | 0.5 day | Mapping + DTO |
| Step 3 | 3 days | Backend APIs |
| Step 4 | 1 day | Testing |
| Documentation | 0.5 day | Docs |

**Total:** ~6 days

