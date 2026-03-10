# Backend TODO: Master Data Module Updates

**Ngày tạo:** 2026-03-10  
**Mô tả:** Các tính năng mới cần BE implement cho Master Data module

---

## Tổng quan

| Tính năng | Trạng thái BE | Chi tiết |
|-----------|--------------|----------|
| Customer Entity | ❌ CHƯA CÓ | Section 1 |
| UOM Conversion Entity | ❌ CHƯA CÓ | Section 2 |
| Auto-gen Code APIs | ❌ CHƯA CÓ | Section 3 |
| Dropdown Config System | ❌ CHƯA CÓ | Xem file `BE-TODO-dropdown-config.md` |

---

## Section 1: Customer Entity

### 1.1 Database Schema

```prisma
model Customer {
  id            String   @id @default(uuid())
  customerCode  String   @unique @db.VarChar(20)
  customerName  String   @db.VarChar(200)
  shortName     String?  @db.VarChar(50)
  customerGroup String   @db.VarChar(20)  // 'CORPORATE', 'INDIVIDUAL'
  customerType  String   @db.VarChar(20)  // 'BUYER', 'CONSIGNEE', 'SHIPPER'
  taxCode       String?  @db.VarChar(20)
  contactName   String?  @db.VarChar(100)
  phone         String?  @db.VarChar(20)
  email         String?  @db.VarChar(100)
  address       String?  @db.VarChar(500)
  notes         String?  @db.Text
  isActive      Boolean  @default(true)
  rowVersion    Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("customers")
}
```

### 1.2 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/customers` | List với filter (keyword, customerGroup, customerType, isActive) |
| GET | `/customers/:id` | Get by ID |
| POST | `/customers` | Create (auto-gen customerCode nếu không truyền) |
| PUT | `/customers/:id` | Update |
| POST | `/customers/:id/deactivate` | Ngừng hoạt động |
| POST | `/customers/:id/reactivate` | Kích hoạt lại |
| GET | `/customers/next-code` | Lấy mã tiếp theo (VD: CUS-001) |

### 1.3 Lookup Endpoint

```
GET /lookups/customers
Response: { data: [{ id, code, name }] }
```

---

## Section 2: UOM Conversion Entity

### 2.1 Database Schema

```prisma
model UomConversion {
  id               String   @id @default(uuid())
  fromUomId        String
  toUomId          String
  conversionFactor Float    // Hệ số quy đổi (VD: 1000 cho 1 MT = 1000 KG)
  description      String?  @db.VarChar(200)
  isActive         Boolean  @default(true)
  rowVersion       Int      @default(1)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  fromUom          Uom      @relation("FromUom", fields: [fromUomId], references: [id])
  toUom            Uom      @relation("ToUom", fields: [toUomId], references: [id])

  @@unique([fromUomId, toUomId])
  @@map("uom_conversions")
}

// Update Uom model to add relations
model Uom {
  // ... existing fields ...
  conversionsFrom  UomConversion[] @relation("FromUom")
  conversionsTo    UomConversion[] @relation("ToUom")
}
```

### 2.2 Seed Data

```sql
INSERT INTO uom_conversions (id, from_uom_id, to_uom_id, conversion_factor, description) VALUES
('conv-001', 'uom-mt-id', 'uom-kg-id', 1000, '1 MT = 1000 KG'),
('conv-002', 'uom-bag-id', 'uom-kg-id', 50, '1 BAG = 50 KG'),
('conv-003', 'uom-m3-id', 'uom-l-id', 1000, '1 M3 = 1000 L');
```

### 2.3 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/uom-conversions` | List với filter (keyword, fromUomId, toUomId) |
| GET | `/uom-conversions/:id` | Get by ID (include fromUom, toUom) |
| POST | `/uom-conversions` | Create (check duplicate fromUomId + toUomId) |
| PUT | `/uom-conversions/:id` | Update (chỉ sửa conversionFactor, description) |
| DELETE | `/uom-conversions/:id` | Delete |

### 2.4 Response Format

```json
{
  "data": {
    "id": "conv-001",
    "fromUomId": "uom-002",
    "toUomId": "uom-001",
    "conversionFactor": 1000,
    "description": "1 MT = 1000 KG",
    "fromUom": { "id": "uom-002", "uomCode": "MT", "description": "Metric Ton" },
    "toUom": { "id": "uom-001", "uomCode": "KG", "description": "Kilogram" }
  }
}
```

---

## Section 3: Auto-gen Code APIs

Frontend cần lấy mã tiếp theo khi tạo mới entity (hiển thị preview).

### 3.1 Endpoints cần thêm

| Entity | Endpoint | Response Format |
|--------|----------|-----------------|
| Owner | `GET /owners/next-code` | `{ data: { code: "OWN-001", prefix: "OWN" } }` |
| Vendor | `GET /vendors/next-code` | `{ data: { code: "VND-001", prefix: "VND" } }` |
| Customer | `GET /customers/next-code` | `{ data: { code: "CUS-001", prefix: "CUS" } }` |
| Item | `GET /items/next-code` | `{ data: { code: "ITEM-001", prefix: "ITEM" } }` |

### 3.2 Logic sinh mã

```typescript
async function getNextCode(entity: string, prefix: string): Promise<string> {
  // 1. Lấy tất cả code hiện tại có prefix này
  const existingCodes = await db.findMany({
    where: { code: { startsWith: `${prefix}-` } },
    select: { code: true }
  });

  // 2. Extract số từ code và tìm max
  const numbers = existingCodes
    .map(r => parseInt(r.code.replace(`${prefix}-`, ''), 10))
    .filter(n => !isNaN(n));

  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  // 3. Format với padding 3 số
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}
```

### 3.3 Cập nhật Create APIs

Khi create entity, nếu `code` không được truyền hoặc rỗng, tự động sinh mã:

```typescript
async create(data: CreateDto) {
  if (!data.customerCode) {
    data.customerCode = await this.getNextCode('customers', 'CUS');
  }
  // ... continue create
}
```

---

## Section 4: Lookup Endpoints (cần bổ sung)

| Endpoint | Mô tả |
|----------|-------|
| `GET /lookups/customers` | List active customers `[{ id, code, name }]` |

---

## Checklist

- [ ] Tạo Customer entity + migration
- [ ] Implement Customer CRUD endpoints
- [ ] Implement Customer lookup endpoint
- [ ] Tạo UomConversion entity + migration
- [ ] Implement UomConversion CRUD endpoints
- [ ] Implement next-code endpoint cho Owner
- [ ] Implement next-code endpoint cho Vendor
- [ ] Implement next-code endpoint cho Customer
- [ ] Implement next-code endpoint cho Item
- [ ] Update create APIs để auto-gen code nếu không truyền

---

## Frontend đã implement

Frontend đã implement xong với mock API. Khi BE xong, chỉ cần set `VITE_USE_MOCK_API=false`.

**Paths:**
- Customer: `/app/master-data/customers`
- UOM Conversions: `/app/master-data/uom-conversions`
