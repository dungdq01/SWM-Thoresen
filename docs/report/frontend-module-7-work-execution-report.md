# Frontend Module 7 — Work Execution & Mobile

**Ngày:** 2026-03-09 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Giao diện thực thi công việc kho: Work Queue, My Work, Execute task, Monitor. Thiết kế cho cả desktop và mobile (WH_KEEPER dùng tablet/điện thoại).

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/work-execution/queue` | `WorkQueuePage` | Danh sách tất cả WorkHeader/WorkLine chờ thực thi |
| `/app/work-execution/my-work` | `MyWorkPage` | Tasks được giao cho user hiện tại |
| `/app/work-execution/execute` | `WorkExecutePage` | Thực thi 1 task: scan location → confirm complete |
| `/app/work-execution/monitor` | `WorkMonitorPage` | OPS_SUPER xem tổng thể tiến độ công việc |

**Default redirect:** `/app/work-execution` → `/app/work-execution/queue`

## 3. Domain Layer

**Thư mục:** `src/domains/work-execution/`

| File | Nội dung |
|------|---------|
| `api/workExecution.api.js` | workHeaderApi, workLineApi, executionApi, monitorApi |
| `hooks/useWorkExecution.js` | useWorkQueue, useMyWork, useWorkDetail, useCompleteWorkLine, useWorkMonitor |

## 4. Mock Data

**File:** `src/mocks/workExecution.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_work_headers` | 8 WorkHeaders: PUTAWAY, PICK, MOVE tasks — states OPEN/IN_PROGRESS/COMPLETED |
| `swm_mock_work_lines` | 20+ WorkLines với source/target location, qty, status |
| `swm_mock_work_assignments` | Assignment records: user → WorkLine |

## 5. Backend API Endpoints Wired

```
GET  /api/v1/work/headers
GET  /api/v1/work/headers/:id
GET  /api/v1/work/lines
GET  /api/v1/work/lines/my-work
POST /api/v1/work/lines/:id/start
POST /api/v1/work/lines/:id/complete
GET  /api/v1/work/monitor
```

## 6. Business Rules hiển thị

| Rule | Cách hiển thị |
|------|--------------|
| WorkLine COMPLETED → sinh InventTrans | Sau complete, success toast + link "Xem giao dịch" |
| QR scan = LOCATION QR | WorkExecutePage có field "Scan Location QR" với validation format |
| PP-2 PUTAWAY-MOVE | Sau complete PUTAWAY task, hiển thị posting confirmation |

## 7. Ghi chú về Mobile

- `WorkExecutePage` và `MyWorkPage` được thiết kế responsive — dùng được trên mobile browser
- **Chưa có Offline PWA:** Không có Service Worker → nếu mất mạng, WH_KEEPER không dùng được (IMP-13)
- QR scan: dùng input field thủ công hoặc keyboard wedge scanner. Camera-based scan chưa có (IMP-32)
- Work module (M12) scaffold chưa connect vào actual flows (IMP-08) — WorkQueuePage hiện hiển thị mock data

## 8. Ghi chú

- `WorkMonitorPage` là dashboard mini cho OPS_SUPER — hiển thị completion rate, pending count theo loại task
- Backend M7 score 9.2/10 PASS — frontend wired đúng nhưng M12 scaffold issue cần track riêng
