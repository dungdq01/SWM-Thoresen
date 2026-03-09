# Frontend Module 5 — Outbound Operations

**Ngày:** 2026-03-09 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Giao diện vận hành xuất kho: quản lý Shipments, Allocation, cân xe xuất, duyệt tolerance.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/outbound-operations/shipments` | `OutboundShipmentsPage` | Danh sách SO/Shipments, tạo mới, xem trạng thái |
| `/app/outbound-operations/allocation` | `OutboundAllocationPage` | Xem allocation hold: reserved_qty_shipment per shipment |
| `/app/outbound-operations/weighing` | `OutboundWeighingPage` | Cân xe xuất kho (multi-trip weighing) |
| `/app/outbound-operations/approvals` | `OutboundApprovalsPage` | Shipments PENDING_APPROVAL chờ WH_MANAGER duyệt |

**Default redirect:** `/app/outbound-operations` → `/app/outbound-operations/shipments`

## 3. Domain Layer

**Thư mục:** `src/domains/outbound-operations/`

| File | Nội dung |
|------|---------|
| `api/outboundOperations.api.js` | shipmentApi, allocationApi, weighingApi, approvalsApi |
| `hooks/useOutboundOperations.js` | useShipmentList, useCreateShipment, useAllocationDetail, useWeighingLogs, usePendingApprovals, useApproveShipment, useRejectShipment |

## 4. Mock Data

**File:** `src/mocks/outboundOperations.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_shipments` | 10 shipments: DRAFT, ALLOCATED, PICKING, WEIGHING, PENDING_APPROVAL, SHIPPED |
| `swm_mock_allocations` | Allocation records với reserved_qty_shipment detail |
| `swm_mock_wb_logs_outbound` | Weighbridge logs cho multi-trip (tare + gross per trip) |
| `swm_mock_approvals` | 3 shipments PENDING_APPROVAL với tolerance detail |

## 5. Backend API Endpoints Wired

```
GET  /api/v1/outbound/shipments
POST /api/v1/outbound/shipments
GET  /api/v1/outbound/shipments/:id
POST /api/v1/outbound/shipments/:id/allocate
POST /api/v1/outbound/shipments/:id/ship
GET  /api/v1/outbound/allocations
GET  /api/v1/outbound/weighing
POST /api/v1/outbound/weighing/:id/record
GET  /api/v1/outbound/approvals
POST /api/v1/outbound/approvals/:id/approve
POST /api/v1/outbound/approvals/:id/reject
```

## 6. Business Rules hiển thị

| Rule | Cách hiển thị |
|------|--------------|
| Allocation-based Hold | `OutboundAllocationPage`: 3 cột — physical_qty / reserved / available |
| `available = physical_qty - reserved_qty_shipment - reserved_qty_vas` | Tính live, màu đỏ nếu available < 0 |
| Tolerance FAIL → PENDING_APPROVAL | `OutboundApprovalsPage` badge "PENDING APPROVAL", có nút Approve/Reject |
| PP-3 = SHIPPED state | Sau ship, transaction sinh và OnHand giảm |
| Multi-trip weighing | `OutboundWeighingPage` hiển thị từng trip, tính tổng net weight |

## 7. Ghi chú

- `OutboundApprovalsPage` chỉ WH_MANAGER mới thấy nút Approve — RBAC filter phía UI
- `OutboundAllocationPage` cho OPS_SUPER xem tổng thể available capacity
- Allocation REAL (không phải mock logic) — đã wired vào backend M5 (score 9.0 PASS)
