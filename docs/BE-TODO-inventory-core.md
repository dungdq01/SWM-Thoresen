# Backend TODO: Inventory Core Module Updates

**Ngày tạo:** 2026-03-10  
**Module:** Inventory Core  
**Mô tả:** Các thay đổi cần BE implement cho Inventory Core module

---

## Tổng quan

| Tính năng | Trạng thái BE | Chi tiết |
|-----------|--------------|----------|
| On-Hand API trả thêm `lotNumber` | ❌ CẦN SỬA | Section 1 |
| QTY decimal dựa theo UOM | ❌ CẦN SỬA | Section 2 |
| Receipt → On-Hand Sync | ❌ CẦN FIX | Section 3 |

---

## Section 1: On-Hand API — Thêm field `lotNumber`

### 1.1 Yêu cầu

Frontend cần hiển thị **LOT** trong grid view On-Hand. BE cần trả thêm field `lotNumber` trong response.

### 1.2 API cần sửa

```
GET /api/v1/inventory/on-hand
```

### 1.3 Response hiện tại (thiếu lotNumber)

```json
{
  "data": [
    {
      "id": "oh-001",
      "itemId": "item-001",
      "physicalQty": "30000",
      "reservedQty": "10000",
      "availableQty": "20000",
      "uomId": "uom-001",
      "inventDim": {
        "warehouseId": "wh-001",
        "locationId": "loc-001",
        "ownerId": "owner-001",
        "inventoryStatusId": "st-001"
      }
    }
  ]
}
```

### 1.4 Response cần trả (thêm lotNumber)

```json
{
  "data": [
    {
      "id": "oh-001",
      "itemId": "item-001",
      "lotNumber": "LOT-2026-001",
      "physicalQty": "30000",
      "reservedQty": "10000",
      "availableQty": "20000",
      "uomId": "uom-001",
      "inventDim": {
        "warehouseId": "wh-001",
        "locationId": "loc-001",
        "ownerId": "owner-001",
        "inventoryStatusId": "st-001"
      },
      "item": { "itemCode": "RICE001", "itemName": "Gạo 5% tấm" },
      "uom": { "uomCode": "KG", "description": "Kilogram", "decimalPrecision": 0 },
      "inventDim": {
        "warehouse": { "warehouseCode": "WH5.1" },
        "location": { "locationCode": "WH5.1-A-01-01" },
        "owner": { "ownerCode": "OWN001", "ownerName": "Thoresen Thai" },
        "inventoryStatus": { "statusCode": "AVAILABLE", "isAllocatable": true }
      }
    }
  ]
}
```

### 1.5 Grid columns thứ tự frontend hiển thị

| # | Column | Source |
|---|--------|--------|
| 1 | Owner | `inventDim.owner.ownerCode` |
| 2 | Owner Name | `inventDim.owner.ownerName` |
| 3 | Item Code | `item.itemCode` |
| 4 | Item Name | `item.itemName` |
| 5 | Status | `inventDim.inventoryStatus.statusCode` |
| 6 | Lot | `lotNumber` |
| 7 | Location | `inventDim.location.locationCode` |
| 8 | Physical | `physicalQty` |
| 9 | Reserved | `reservedQty` |
| 10 | Available | `availableQty` |
| 11 | UOM | `uom.uomCode` |

---

## Section 2: QTY Decimal Precision theo UOM

### 2.1 Yêu cầu

QTY fields (Physical, Reserved, Available) phải hiển thị đúng decimal theo loại UOM:

| UOM | decimalPrecision | Ví dụ |
|-----|-----------------|-------|
| KG | 0 | `30,000` |
| MT | 3 | `5,500.500` |
| BAG | 0 | `100` |
| L | 2 | `1,000.50` |
| M3 | 3 | `2,500.000` |

### 2.2 Frontend xử lý

Frontend đã implement `formatQty(value, uomCode)` để format theo UOM code.

**Tuy nhiên, để chính xác hơn**, BE nên:
1. Trả field `decimalPrecision` trong UOM object
2. QTY values nên được trả **không có trailing zeros không cần thiết** (VD: `30000` thay vì `30000.000` cho KG)

### 2.3 UOM model cần include `decimalPrecision`

```json
{
  "uom": {
    "uomCode": "KG",
    "description": "Kilogram",
    "decimalPrecision": 0
  }
}
```

Frontend sẽ dùng `decimalPrecision` để format thay vì hardcode theo uomCode.

---

## Section 3: Receipt → On-Hand Sync (BUG FIX)

### 3.1 Vấn đề

Khi Receipt chuyển sang trạng thái **RECEIVED** (qua weighbridge tolerance check), hệ thống phải **tạo Inventory Posting** và **cập nhật On-Hand** tương ứng.

Hiện tại frontend mock đã fix: `applyWeighOutDecision()` gọi `createPosting()` → cập nhật `onHand[]`.

### 3.2 Flow cần đảm bảo ở BE

```
Receipt WEIGHED_OUT → tolerance check → RECEIVED
    ↓
POST /inventory/postings  (eventCode: RECEIPT_IN)
    ↓
On-Hand record: find by (itemId + ownerId + warehouseId + locationId + statusId)
    → Nếu có: physicalQty += receivedQty, availableQty = physicalQty - reservedQty
    → Nếu chưa có: tạo mới với physicalQty = receivedQty, reservedQty = 0
    ↓
Transaction log: INSERT (transType: RECEIPT_IN, qty, refType: RECEIPT, refId: receiptNumber)
```

### 3.3 Posting payload từ Receipt

```json
{
  "eventCode": "RECEIPT_IN",
  "refType": "RECEIPT",
  "refId": "RCV-20260308-0001",
  "correlationId": "corr-inb-001",
  "itemId": "item-001",
  "qty": 30300,
  "uomCode": "KG",
  "dimTo": {
    "ownerId": "owner-001",
    "warehouseId": "wh-001",
    "locationId": "loc-002",
    "inventoryStatusId": "st-001"
  },
  "lotNumber": "LOT-RCV-20260308-0001",
  "sourceApp": "INBOUND"
}
```

### 3.4 Reverse Posting

Khi reverse 1 posting, phải **trừ ngược** qty khỏi on-hand record tương ứng.

### 3.5 On-Hand update logic

```typescript
async function updateOnHand(posting: Posting) {
  const key = { itemId, ownerId, warehouseId, locationId, statusId };
  let record = await db.onHand.findUnique({ where: key });
  
  const signedQty = posting.transType === 'SHIPMENT_OUT' 
    ? -Math.abs(posting.qty) 
    : Math.abs(posting.qty);
  
  if (record) {
    record.physicalQty += signedQty;
    record.availableQty = record.physicalQty - record.reservedQty;
    await db.onHand.update({ where: key, data: record });
  } else {
    await db.onHand.create({
      data: { ...key, physicalQty: signedQty, reservedQty: 0, availableQty: signedQty, uomId, lotNumber }
    });
  }
}
```

---

## Section 4: Database — lotNumber field

### 4.1 Nếu `lot_number` chưa có trong table `inventory_on_hand`

```sql
ALTER TABLE inventory_on_hand ADD COLUMN lot_number VARCHAR(50);
```

### 4.2 Prisma model update

```prisma
model InventoryOnHand {
  // ... existing fields ...
  lotNumber  String?  @db.VarChar(50)  @map("lot_number")
}
```

---

## Checklist

- [ ] Thêm `lotNumber` field vào `inventory_on_hand` table (nếu chưa có)
- [ ] Update `GET /inventory/on-hand` trả thêm `lotNumber`
- [ ] Đảm bảo response include đầy đủ relations: `item`, `uom`, `inventDim.owner`, `inventDim.location`, `inventDim.warehouse`, `inventDim.inventoryStatus`
- [ ] UOM object include `decimalPrecision` field
- [ ] QTY values format phù hợp với decimalPrecision
- [ ] **POST /inventory/postings** phải cập nhật on-hand record (find or create by dimension key)
- [ ] **Reverse Posting** phải trừ ngược qty khỏi on-hand
- [ ] Inbound Receipt flow: khi status → RECEIVED, phải gọi internal posting để sync on-hand

---

## Frontend đã implement

Frontend đã xong với mock API. Khi BE sửa xong, chỉ cần set `VITE_USE_MOCK_API=false`.

**Path:** `/app/inventory-core/on-hand`
