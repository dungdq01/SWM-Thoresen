# Frontend Module 6 — Inventory Control

**Ngày:** 2026-03-09 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Giao diện kiểm soát tồn kho: Move Orders, Transfer Orders, Status Change, Cycle Count, Adjustments, Movement History.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/inventory-control/move-orders` | `MoveOrdersPage` | Di chuyển hàng trong kho (cùng warehouse) |
| `/app/inventory-control/transfers` | `TransferOrdersPage` | Chuyển kho (khác warehouse) — state machine TR-01..TR-06 |
| `/app/inventory-control/status-change` | `StatusChangePage` | Đổi trạng thái hàng: AVAILABLE ↔ DAMAGED ↔ BLOCKED |
| `/app/inventory-control/cycle-count` | `CycleCountPage` | Tạo và thực hiện kiểm kê |
| `/app/inventory-control/adjustments` | `AdjustmentsPage` | Điều chỉnh tồn kho (sau count) |
| `/app/inventory-control/history` | `MovementHistoryPage` | Lịch sử di chuyển/transfer |

**Default redirect:** `/app/inventory-control` → `/app/inventory-control/move-orders`

## 3. Domain Layer

**Thư mục:** `src/domains/inventory-control/`

| File | Nội dung |
|------|---------|
| `api/inventoryControl.api.js` | moveOrderApi, transferOrderApi, statusChangeApi, cycleCountApi, adjustmentApi, historyApi |
| `hooks/useInventoryControl.js` | useMoveOrderList, useTransferOrderList, useCreateTransferOrder, useTransferStateTransition, useCycleCountList, useCreateCycleCount, useAdjustmentList, useCreateAdjustment |

## 4. Mock Data

**File:** `src/mocks/inventoryControl.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_move_orders` | 5 move orders: PENDING → COMPLETED |
| `swm_mock_transfer_orders` | 4 transfer orders với đủ states CREATED/RELEASED/SHIPPED/IN_TRANSIT/RECEIVED/CLOSED |
| `swm_mock_status_changes` | 3 status change records |
| `swm_mock_cycle_counts` | 2 count sessions: OPEN và CLOSED |
| `swm_mock_adjustments` | 3 adjustments với reason codes |
| `swm_mock_movement_history` | 20+ movement records |

## 5. Backend API Endpoints Wired

```
GET/POST /api/v1/inventory-control/move-orders
POST     /api/v1/inventory-control/move-orders/:id/complete
GET/POST /api/v1/inventory-control/transfers
POST     /api/v1/inventory-control/transfers/:id/release
POST     /api/v1/inventory-control/transfers/:id/ship
POST     /api/v1/inventory-control/transfers/:id/receive
POST     /api/v1/inventory-control/transfers/:id/close
GET/POST /api/v1/inventory-control/status-changes
GET/POST /api/v1/inventory-control/cycle-counts
POST     /api/v1/inventory-control/cycle-counts/:id/submit
GET/POST /api/v1/inventory-control/adjustments
GET      /api/v1/inventory-control/history
```

## 6. Business Rules hiển thị

| Rule | Cách hiển thị |
|------|--------------|
| Transfer state: RELEASED (không phải CONFIRMED) | Badge trên `TransferOrdersPage` hiển thị đúng "RELEASED" |
| PP-5 = MOVE/TRANSFER posting | Sau complete, hiện link sang InventTrans |
| PP-6 = ADJUSTMENT posting | Sau submit adjustment, hiển thị posting ref |
| Cycle count approval flow (COND PASS) | Nút "Submit for Approval" có nhưng approval flow chưa hoàn chỉnh |

## 7. Ghi chú

- `TransferOrdersPage` là page phức tạp nhất — hiển thị state machine với các action buttons theo đúng state
- Cycle count approval flow chưa hoàn chỉnh (backend COND PASS) — UI render đủ nhưng logic backend chưa xong
- `MovementHistoryPage` = read-only, hỗ trợ filter theo date, location, item
