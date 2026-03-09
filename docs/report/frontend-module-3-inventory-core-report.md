# Frontend Module 3 — Inventory Core Engine

**Ngày:** 2026-03-09 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Hiển thị và tra cứu dữ liệu inventory core: OnHand (tồn kho thực), InventTrans (sổ cái), Holds (reservation), Posting Workbench.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/inventory-core/on-hand` | `InventoryOnHandPage` | Xem tồn kho tổng hợp theo InventDim |
| `/app/inventory-core/transactions` | `InventoryTransactionsPage` | Lịch sử giao dịch (immutable ledger) |
| `/app/inventory-core/holds` | `InventoryHoldsPage` | Xem reserved_qty_shipment + reserved_qty_vas |
| `/app/inventory-core/workbench` | `InventoryPostingWorkbenchPage` | Posting workbench cho OPS_SUPER/ADMIN |

**Default redirect:** `/app/inventory-core` → `/app/inventory-core/on-hand`

## 3. Domain Layer

**Thư mục:** `src/domains/inventory-core/`

| File | Nội dung |
|------|---------|
| `api/inventoryCore.api.js` | onHandApi, inventTransApi, holdsApi, postingApi — đều có withDataSource() |
| `hooks/useInventoryCore.js` | useOnHandList, useInventTransList, useHoldsList, usePostingWorkbench |

## 4. Mock Data

**File:** `src/mocks/inventoryCore.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_on_hand` | 15+ records với physical_qty, reserved_qty_shipment, reserved_qty_vas theo InventDim |
| `swm_mock_invent_trans` | 30+ transactions: RECEIVE, SHIP, MOVE, ADJUST, VAS_CONSUME, VAS_PRODUCE |
| `swm_mock_holds` | Active holds theo shipment và VAS WO |

## 5. Backend API Endpoints Wired

```
GET /api/v1/inventory-core/on-hand
GET /api/v1/inventory-core/transactions
GET /api/v1/inventory-core/transactions/:id
GET /api/v1/inventory-core/holds
POST /api/v1/inventory-core/posting/workbench
```

## 6. Business Rules hiển thị trên UI

| Rule | Cách hiển thị |
|------|--------------|
| `available = physical_qty - reserved_qty_shipment - reserved_qty_vas` | Cột "Available" trong OnHandPage tính và hiển thị |
| InventTrans = immutable | Không có nút Edit/Delete trên TransactionsPage |
| Signed qty (M3 dùng qty + direction = sign) | TransactionsPage hiển thị qty với màu xanh (IN) / đỏ (OUT) |

## 7. Ghi chú

- `InventoryOnHandPage` là trang được xem nhiều nhất bởi WH_MANAGER và OPS_SUPER
- `InventoryPostingWorkbenchPage` — chỉ hiển thị cho role ADMIN/OPS_SUPER (RBAC filter phía UI)
- Reconciliation (RECON-001) chưa có UI — thuộc M11 (chưa build)
