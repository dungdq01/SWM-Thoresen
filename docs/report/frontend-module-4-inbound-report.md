# Frontend Module 4 — Inbound Operations

**Ngày:** 2026-03-10 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Giao diện vận hành nhập kho: quản lý Purchase Orders, PO Receipts, thực thi cân (Weighbridge execution), xử lý exception, xác nhận putaway.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/inbound-operations/purchase-orders` | `PurchaseOrdersPage` | CRUD PO: tạo/confirm/close/cancel, expand lines — **MỚI** |
| `/app/inbound-operations/receipts` | `InboundReceiptsPage` | Danh sách PO receipts, tạo mới, xem trạng thái |
| `/app/inbound-operations/execution` | `InboundExecutionPage` | Thực thi nhập kho: cân từng xe, confirm received |
| `/app/inbound-operations/exceptions` | `InboundExceptionsPage` | Danh sách receipts tolerance FAIL → REJECTED |
| `/app/inbound-operations/putaway` | `InboundPutawayPage` | Xác nhận putaway tasks cho từng receipt |

**Default redirect:** `/app/inbound-operations` → `/app/inbound-operations/purchase-orders`

**Tổng:** 5 pages + 1 layout

## 3. PurchaseOrdersPage — Chi tiết

Full CRUD với PO lines (multi-line):
- **State machine:** `DRAFT → CONFIRMED → CLOSED / CANCELLED`
- **Actions:** Create (multi-line), Edit (khi DRAFT), Confirm, Close, Cancel
- **Line fields:** `itemId`, `expectedQty`, `uomId`, `unitPrice`, `notes`
- **Header fields:** `ownerId`, `vendorId`, `warehouseId`, `expectedDeliveryDate`, `notes`, `currency`
- **UI:** Expandable rows hiển thị PO lines bên dưới header row

## 4. Domain Layer

**Thư mục:** `src/domains/inbound-operations/`

| File | Nội dung |
|------|---------|
| `api/inboundOperations.api.js` | purchaseOrderApi, receiptApi, executionApi, exceptionsApi, putawayApi |
| `hooks/useInboundOperations.js` | usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useConfirmPurchaseOrder, useClosePurchaseOrder, useCancelPurchaseOrder, useReceiptList, useReceiptDetail, useCreateReceipt, useConfirmReceived, useReceiptExceptions, usePutawayTasks |

## 5. Mock Data

**File:** `src/mocks/inboundOperations.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_purchase_orders` | POs với lines: states DRAFT, CONFIRMED, CLOSED |
| `swm_mock_po_receipts` | 10 receipts: states PENDING, WEIGHING, RECEIVED, REJECTED, PUTAWAY_DONE |
| `swm_mock_wb_logs_inbound` | Weighbridge log entries (xe số, gross/tare/net weight, timestamp) |
| `swm_mock_inbound_exceptions` | 3 REJECTED receipts với tolerance detail |
| `swm_mock_putaway_tasks` | Tasks chờ confirm putaway location |

## 6. Backend API Endpoints Wired

```
GET/POST /api/v1/inbound/purchase-orders
GET/PUT  /api/v1/inbound/purchase-orders/:id
POST     /api/v1/inbound/purchase-orders/:id/confirm
POST     /api/v1/inbound/purchase-orders/:id/close
POST     /api/v1/inbound/purchase-orders/:id/cancel

GET  /api/v1/inbound/receipts
POST /api/v1/inbound/receipts
GET  /api/v1/inbound/receipts/:id
POST /api/v1/inbound/receipts/:id/confirm-received
POST /api/v1/inbound/receipts/:id/reject
GET  /api/v1/inbound/exceptions
GET  /api/v1/inbound/putaway
POST /api/v1/inbound/putaway/:id/confirm
```

## 7. Business Rules hiển thị

| Rule | Cách hiển thị |
|------|--------------|
| Tolerance FAIL → REJECTED (không approval) | `InboundExceptionsPage` badge màu đỏ "REJECTED". Không có nút "Approve" |
| PP-1 = RECEIVED state | Sau confirm received, transaction được sinh (hiển thị link sang InventTrans) |
| Hàng bao: cân từng xe tại PO level | `InboundExecutionPage` hiển thị cột "PO Total" vs "Weighed Total" |
| DPM dual tracking | Hiển thị cả actual weight và bag_count × nominal side-by-side |

## 8. Ghi chú

- `PurchaseOrdersPage` là điểm khởi đầu của luồng Inbound — tạo PO → tạo Receipt từ PO
- `InboundExecutionPage` là page WB_OPERATOR dùng nhiều nhất — cần optimize cho màn hình cảm ứng
- Weighbridge input: hiện dùng manual input field (không live từ COM port — cần IMP-02 và hardware integration)
- Putaway confirm: WH_KEEPER scan LOCATION QR → input location code → confirm
