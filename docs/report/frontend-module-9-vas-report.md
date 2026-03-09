# Frontend Module 9 — VAS / Bagging

**Ngày:** 2026-03-09 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Giao diện dịch vụ giá trị gia tăng (VAS): quản lý Work Orders đóng bao, thực thi session, theo dõi dashboard.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/vas/work-orders` | `VasWorkOrdersPage` | Danh sách VAS WOs, tạo mới, xem state |
| `/app/vas/execution` | `VasExecutionPage` | Thực thi session: nhập actual qty, record output |
| `/app/vas/dashboard` | `VasDashboardPage` | Tổng hợp VAS throughput, packaging consumption |

**Default redirect:** `/app/vas` → `/app/vas/work-orders`

## 3. Domain Layer

**Thư mục:** `src/domains/vas/`

| File | Nội dung |
|------|---------|
| `api/vas.api.js` | vasWorkOrderApi, vasSessionApi, vasDashboardApi |
| `hooks/useVas.js` | useVasWorkOrderList, useCreateVasWorkOrder, useVasSessionList, useStartVasSession, useCompleteVasWorkOrder, useVasDashboard |

## 4. Mock Data

**File:** `src/mocks/vas.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_vas_work_orders` | 5 WOs: DRAFT, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED |
| `swm_mock_vas_sessions` | 8 sessions với actual_qty_bagged, packaging_used per session |
| `swm_mock_packaging_inventory` | Packaging stock (TVL bags, CLIENT bags) |
| `swm_mock_vas_dashboard` | Throughput stats, packaging consumption rate |

## 5. Backend API Endpoints Wired

```
GET  /api/v1/vas/work-orders
POST /api/v1/vas/work-orders
GET  /api/v1/vas/work-orders/:id
POST /api/v1/vas/work-orders/:id/confirm
POST /api/v1/vas/work-orders/:id/complete
POST /api/v1/vas/work-orders/:id/cancel
GET  /api/v1/vas/sessions
POST /api/v1/vas/sessions
POST /api/v1/vas/sessions/:id/close
GET  /api/v1/vas/dashboard
```

## 6. Business Rules hiển thị

| Rule | Cách hiển thị |
|------|--------------|
| VAS WO state machine | `VasWorkOrdersPage` badge đúng state + action buttons theo state |
| Sessions = progress log (không post inventory) | `VasExecutionPage` rõ label "Session Log — không ảnh hưởng tồn kho cho đến khi WO COMPLETED" |
| Posting chỉ tại WO COMPLETED (3 trans atomic) | Sau complete, success message "Đã ghi 3 inventory transactions" |
| reserved_qty_vas tăng khi tạo WO | `VasDashboardPage` hiển thị reserved_qty_vas tách biệt với reserved_qty_shipment |
| Packaging ownership TVL / CLIENT | `VasExecutionPage` dropdown chọn packaging type với label owner rõ ràng |

## 7. Ghi chú

- Backend M9 score 9.2/10 PASS (cao nhất cùng M7) — frontend wired hoàn toàn
- `VasDashboardPage` hiện dùng mock data cho charts — cần connect thật khi backend StorageSnapshot xong (IMP-03)
- TO-CONFIRM còn mở: Tier pricing reset và VAS reservation level — UI chưa implement logic này (chờ confirm)
