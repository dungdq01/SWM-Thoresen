# Backend TODO: Inbound Operations Module Updates

**Ngày tạo:** 2026-03-10  
**Module:** Inbound Operations (Purchase Orders)  
**Mô tả:** Các thay đổi cần BE implement cho PO trong Inbound module

---

## Tổng quan

| Tính năng | Trạng thái BE | Chi tiết |
|-----------|--------------|----------|
| Auto-gen PO Number | ❌ CẦN THÊM | Section 1 |
| Field `externalPoNumber` (B/L) | ❌ CẦN THÊM | Section 2 |

---

## Section 1: Auto-gen PO Number

### 1.1 Yêu cầu

PO Number phải được **tự động sinh** khi tạo mới, user không nhập tay.

Frontend hiển thị preview PO number trước khi submit → cần endpoint lấy số tiếp theo.

### 1.2 API cần thêm

```
GET /api/v1/inbound/purchase-orders/next-number
```

### 1.3 Response Format

```json
{
  "data": {
    "code": "PO-20260310-005",
    "prefix": "PO"
  }
}
```

### 1.4 Logic sinh mã

```typescript
async function getNextPoNumber(): Promise<string> {
  const prefix = 'PO';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  // Tìm PO có prefix + datePart lớn nhất
  const existingCodes = await db.purchaseOrder.findMany({
    where: { poNumber: { startsWith: `${prefix}-${datePart}-` } },
    select: { poNumber: true },
  });

  const numbers = existingCodes
    .map(r => parseInt(r.poNumber.split('-').pop(), 10))
    .filter(n => !isNaN(n));

  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${datePart}-${String(nextNum).padStart(3, '0')}`;
}
```

### 1.5 Cập nhật Create API

Khi `POST /purchase-orders`, BE **tự động sinh `poNumber`** — frontend không truyền lên:

```typescript
async createPurchaseOrder(data: CreatePODto) {
  const poNumber = await this.getNextPoNumber();
  const po = await db.purchaseOrder.create({
    data: {
      poNumber,
      ...data,
    },
  });
  return po;
}
```

---

## Section 2: Field `externalPoNumber` (B/L)

### 2.1 Yêu cầu

Thêm field `externalPoNumber` (hay gọi là **B/L** — Bill of Lading) vào Purchase Order.  
Đây là **số chứng từ do khách hàng tự nhập**, không phải auto-gen.

### 2.2 Database Schema

```sql
ALTER TABLE purchase_orders ADD COLUMN external_po_number VARCHAR(100);
```

### 2.3 Prisma Model

```prisma
model PurchaseOrder {
  // ... existing fields ...
  externalPoNumber  String?  @db.VarChar(100) @map("external_po_number")
}
```

### 2.4 API Changes

#### Create PO — `POST /purchase-orders`

Thêm field `externalPoNumber` vào request body:

```json
{
  "ownerId": "...",
  "vendorId": "...",
  "warehouseId": "...",
  "externalPoNumber": "BL-2026-RICE-001",
  "expectedDeliveryDate": "2026-03-10",
  "notes": "...",
  "lines": [...]
}
```

#### Update PO — `PUT /purchase-orders/:id`

Cho phép update `externalPoNumber`.

#### Get PO — `GET /purchase-orders` và `GET /purchase-orders/:id`

Trả về `externalPoNumber` trong response:

```json
{
  "data": {
    "id": "...",
    "poNumber": "PO-20260310-001",
    "externalPoNumber": "BL-2026-RICE-001",
    "status": "DRAFT",
    ...
  }
}
```

#### Search / Filter

Cho phép tìm kiếm theo `externalPoNumber` trong filter `keyword`.

---

## Section 3: Grid Columns (Reference)

Frontend hiển thị PO grid với các cột sau:

| # | Column | Source |
|---|--------|--------|
| 1 | (expand) | toggle button |
| 2 | PO Number | `poNumber` (auto-gen) |
| 3 | **B/L** | `externalPoNumber` ← **MỚI** |
| 4 | Owner / Vendor | `owner.ownerCode`, `vendor.vendorName` |
| 5 | Delivery Date | `expectedDeliveryDate` |
| 6 | Expected Qty | `totalExpectedQty` |
| 7 | Received Qty | `totalReceivedQty` |
| 8 | Status | `status` |
| 9 | Actions | confirm/close/cancel/edit |

---

## Checklist

- [ ] Thêm column `external_po_number` vào table `purchase_orders`
- [ ] Implement `GET /purchase-orders/next-number` endpoint
- [ ] Cập nhật `POST /purchase-orders` — auto-gen `poNumber`, accept `externalPoNumber`
- [ ] Cập nhật `PUT /purchase-orders/:id` — allow update `externalPoNumber`
- [ ] Cập nhật `GET /purchase-orders` — trả `externalPoNumber`, search by keyword include B/L
- [ ] Cập nhật `GET /purchase-orders/:id` — trả `externalPoNumber`

---

## Frontend đã implement

Frontend đã xong với mock API. Khi BE sửa xong, chỉ cần set `VITE_USE_MOCK_API=false`.

**Path:** `/app/inbound/purchase-orders`
