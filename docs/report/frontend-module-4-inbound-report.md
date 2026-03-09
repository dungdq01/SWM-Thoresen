# Frontend Module 4 — Inbound Operations

**Ngày:** 2026-03-09 | **Trạng thái:** ✅ DONE

---

## 1. Scope

Giao diện vận hành nhập kho: quản lý PO Receipts, thực thi cân (Weighbridge execution), xử lý exception, xác nhận putaway.

## 2. Pages & Routes

| Route | Page Component | Mô tả |
|-------|---------------|-------|
| `/app/inbound-operations/receipts` | `InboundReceiptsPage` | Danh sách PO receipts, tạo mới, xem trạng thái |
| `/app/inbound-operations/execution` | `InboundExecutionPage` | Thực thi nhập kho: cân từng xe, confirm received |
| `/app/inbound-operations/exceptions` | `InboundExceptionsPage` | Danh sách receipts tolerance FAIL → REJECTED |
| `/app/inbound-operations/putaway` | `InboundPutawayPage` | Xác nhận putaway tasks cho từng receipt |

**Default redirect:** `/app/inbound-operations` → `/app/inbound-operations/receipts`

## 3. Domain Layer

**Thư mục:** `src/domains/inbound-operations/`

| File | Nội dung |
|------|---------|
| `api/inboundOperations.api.js` | receiptApi, executionApi, exceptionsApi, putawayApi |
| `hooks/useInboundOperations.js` | useReceiptList, useReceiptDetail, useCreateReceipt, useConfirmReceived, useReceiptExceptions, usePutawayTasks |

## 4. Mock Data

**File:** `src/mocks/inboundOperations.mock.js`

| Collection | Sample data |
|-----------|-------------|
| `swm_mock_po_receipts` | 10 receipts: states PENDING, WEIGHING, RECEIVED, REJECTED, PUTAWAY_DONE |
| `swm_mock_wb_logs_inbound` | Weighbridge log entries (xe số, gross/tare/net weight, timestamp) |
| `swm_mock_inbound_exceptions` | 3 REJECTED receipts với tolerance detail |
| `swm_mock_putaway_tasks` | Tasks chờ confirm putaway location |

## 5. Backend API Endpoints Wired

```
GET  /api/v1/inbound/receipts
POST /api/v1/inbound/receipts
GET  /api/v1/inbound/receipts/:id
POST /api/v1/inbound/receipts/:id/confirm-received
POST /api/v1/inbound/receipts/:id/reject
GET  /api/v1/inbound/exceptions
GET  /api/v1/inbound/putaway
POST /api/v1/inbound/putaway/:id/confirm
```

## 6. Business Rules hiển thị

| Rule | Cách hiển thị |
|------|--------------|
| Tolerance FAIL → REJECTED (không approval) | `InboundExceptionsPage` badge màu đỏ "REJECTED". Không có nút "Approve" |
| PP-1 = RECEIVED state | Sau confirm received, transaction được sinh (hiển thị link sang InventTrans) |
| Hàng bao: cân từng xe tại PO level | `InboundExecutionPage` hiển thị cột "PO Total" vs "Weighed Total" |
| DPM dual tracking | Hiển thị cả actual weight và bag_count × nominal side-by-side |

## 7. Ghi chú

- `InboundExecutionPage` là page WB_OPERATOR dùng nhiều nhất — cần optimize cho màn hình cảm ứng
- Weighbridge input: hiện dùng manual input field (không live từ COM port — cần IMP-02 OCR và hardware integration)
- Putaway confirm: WH_KEEPER scan LOCATION QR → input location code → confirm
