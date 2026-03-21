# Feature Spec: Allocation History Tab

## Overview

**Domain**: Outbound
**Priority**: High
**Complexity**: Medium

### Problem Statement

Khi một Order được allocate, hệ thống tạo `AllocationRecord` ghi nhận chi tiết phân bổ vào từng vị trí (location), lot, warehouse cụ thể. Tuy nhiên, **hiện tại không có giao diện nào** cho phép người dùng xem chi tiết allocation này. Người vận hành chỉ thấy tổng `allocatedQtyKg` trên Order Detail mà không biết hàng được lấy từ vị trí nào, lot nào.

Điều này gây khó khăn trong:
- **Kiểm tra tính đúng đắn** của FIFO allocation
- **Truy xuất nguồn gốc** khi có vấn đề chất lượng
- **Theo dõi allocation expired/cancelled** để xử lý kịp thời
- **Đối soát** giữa số lượng allocate và số thực pick

### Business Context

Đây là tính năng **visibility** bổ sung cho Outbound flow hiện tại. Không thay đổi logic allocation, chỉ thêm khả năng xem dữ liệu đã tồn tại trong `allocation_record` table.

---

## User Stories

### Story 1: Xem danh sách Allocation Records của Order

```
As a warehouse operator,
I want to view all allocation records for a specific order in a dedicated tab,
So that I can see exactly which locations and lots were allocated for each order line.
```

### Story 2: Filter Allocation History

```
As a warehouse operator,
I want to filter allocation records by status, item, location, lot, and date range,
So that I can quickly find specific allocation information without scrolling through all records.
```

### Story 3: Xem Allocation đã hết hạn / bị hủy

```
As a warehouse manager,
I want to see expired and cancelled allocations in the history,
So that I can monitor allocation efficiency and investigate issues.
```

---

## Business Rules

| ID | Rule | Category | Description |
|----|------|----------|-------------|
| BR-001 | Read-only tab | Constraint | Tab Allocation History chỉ hiển thị dữ liệu, không có action sửa/xóa allocation. Các action allocation vẫn nằm ở Order Lines tab. |
| BR-002 | Scope by Order | Constraint | Chỉ hiển thị AllocationRecord thuộc các OrderDetail của Order hiện tại (filter by `OrderDetail.OrderHeaderId`). |
| BR-003 | Full history | Constraint | Hiển thị tất cả status: Active, Released, Expired, Cancelled, Completed — không ẩn record nào. |
| BR-004 | Location resolution | Derivation | Location name được resolve từ `AllocationRecord.InventDim.Location`. Nếu `LocationId = null` → hiển thị "—" (unassigned). |
| BR-005 | Lot resolution | Derivation | Lot code được resolve từ `AllocationRecord.InventDim.Lot`. Nếu `LotId = null` → hiển thị "—". |
| BR-006 | Default sort | Sequencing | Records mặc định sắp xếp theo `CreatedTime DESC` (mới nhất lên đầu). |
| BR-007 | Pagination | Constraint | Áp dụng server-side pagination, mặc định 20 records/trang. |
| BR-008 | Status color coding | Derivation | Mỗi AllocationStatus có badge màu riêng: Active=green, Completed=blue, Released=gray, Expired=orange, Cancelled=red. |

---

## Acceptance Criteria

### Story 1: Xem danh sách Allocation Records

**Happy Path:**
```
Given an Order with status Weighing/Processing/Shipped that has been allocated
When the user navigates to the Order detail and clicks the "Allocation History" tab
Then the system displays a table showing all AllocationRecords for that Order with columns:
  - # (row number)
  - Item (from OrderDetail.Item)
  - Location (from InventDim.Location.Code + Name)
  - Warehouse (from InventDim.Warehouse.Code)
  - Lot (from InventDim.Lot.LotCode, or "—")
  - Allocated Qty (kg)
  - Method (FIFO / LIFO / Manual / ByLot / ByLocation)
  - Status (badge with color)
  - Expires At (datetime, or "—" if null)
  - Created At (datetime)
  - Created By (user)
```

**No Allocation Data:**
```
Given an Order that has NOT been allocated yet (all lines Pending)
When the user navigates to the "Allocation History" tab
Then the system displays an empty state message: "No allocation records found"
And the tab is still visible (not hidden)
```

**Order with Mixed Status Lines:**
```
Given an Order where some lines are Pending and some are Picked
When the user opens the Allocation History tab
Then only allocated lines have AllocationRecords shown
And Pending lines simply have no records (no error)
```

### Story 2: Filter Allocation History

**Filter by Status:**
```
Given the Allocation History tab is showing records
When the user selects "Expired" from the Status filter dropdown
Then only AllocationRecords with Status = Expired are displayed
And the pagination resets to page 1
```

**Filter by Item:**
```
Given the Allocation History tab is showing records
When the user types an item name/code in the Item filter
Then only AllocationRecords for matching OrderDetail.Item are displayed
```

**Filter by Location:**
```
Given the Allocation History tab is showing records
When the user types a location code in the Location filter
Then only AllocationRecords where InventDim.Location matches are displayed
```

**Filter by Date Range:**
```
Given the Allocation History tab is showing records
When the user selects a From Date and To Date
Then only AllocationRecords created within that range are displayed
```

**Combined Filters:**
```
Given the user has set Status = "Active" AND Location = "A-01"
When the filters are applied
Then only records matching ALL conditions are shown (AND logic)
```

**Clear Filters:**
```
Given the user has active filters applied
When the user clicks "Clear Filters" / "Reset"
Then all filters are removed and the full list is displayed
```

### Story 3: Xem Expired/Cancelled Allocations

**Expired Allocation Visibility:**
```
Given an allocation that expired (24h TTL exceeded)
When the user views the Allocation History tab
Then the expired record shows with Status = "Expired" (orange badge)
And ExpiresAt column shows the expiration timestamp
```

**Cancelled Allocation Visibility:**
```
Given an allocation that was cancelled (e.g., order line cancelled)
When the user views the Allocation History tab
Then the cancelled record shows with Status = "Cancelled" (red badge)
```

---

## Data Model Sketch

### No New Entities Required

Tính năng này **không tạo entity mới**. Tất cả dữ liệu đã tồn tại:

### Existing Entities Referenced

| Entity | Table | Key Fields Used |
|--------|-------|----------------|
| `AllocationRecord` | `ops.allocation_record` | `AllocatedQtyKg`, `AllocationMethod`, `Status`, `ExpiresAt`, `OrderDetailId`, `InventDimId`, `CreatedTime`, `CreatedBy` |
| `OrderDetail` | `ops.order_detail` | `OrderHeaderId`, `ItemId` |
| `OrderHeader` | `ops.order_header` | `Id` (route param) |
| `InventDim` | `inv.invent_dim` | `WarehouseId`, `LocationId`, `OwnerId`, `LotId` |
| `Location` | `cat.location` | `Code`, `Name` |
| `Warehouse` | `cat.warehouse` | `Code`, `Name` |
| `Lot` | `inv.lot` | `LotCode` |
| `Item` | `cat.item` | `Code`, `Name` |

### Query Relationship

```
AllocationRecord
  → OrderDetail (N:1) → OrderHeader (N:1)  ← filter by OrderHeaderId
  → InventDim (N:1)
      → Location (N:1)  ← display location code/name
      → Warehouse (N:1) ← display warehouse code
      → Lot (N:1)       ← display lot code
  → OrderDetail.Item    ← display item code/name
```

### New Backend Artifacts Needed

| Artifact | Path (convention) |
|----------|-------------------|
| Query | `Application/Features/Outbound/AllocationRecords/Queries/GetAllocationsByOrder.cs` |
| DTO | `Application.Contracts/Outbound/AllocationRecordDto.cs` |
| Controller endpoint | `POST /api/orders/{orderId}/allocation-records/search` or `GET /api/orders/{orderId}/allocation-records` |

### DTO Shape

```
AllocationRecordDto:
  - Id: Guid
  - ItemCode: string
  - ItemName: string
  - LocationCode: string?       (from InventDim.Location)
  - LocationName: string?
  - WarehouseCode: string       (from InventDim.Warehouse)
  - LotCode: string?            (from InventDim.Lot)
  - AllocatedQtyKg: decimal
  - AllocationMethod: string    (enum → display name)
  - Status: string              (enum → display name)
  - ExpiresAt: DateTime?
  - CreatedTime: DateTime
  - CreatedBy: string
```

---

## UI Notes

### Screen Layout

Tab **"Allocation History"** được thêm vào trang Order Detail, sau các card hiện có:

```
┌────────────────────────────────────────────────────┐
│  Order Detail Page                                 │
│                                                    │
│  [Order Info Card]           ← existing            │
│  [Weighbridge Chain Card]    ← existing            │
│  [Order Lines Card]          ← existing            │
│                                                    │
│  [Allocation History Card]   ← NEW                 │
│  ┌──────────────────────────────────────────────┐  │
│  │ Allocation History                    🔽Filter│  │
│  │──────────────────────────────────────────────│  │
│  │ Filter Bar (collapsible):                    │  │
│  │  [Status ▾] [Item ___] [Location ___]        │  │
│  │  [From Date 📅] [To Date 📅] [Clear]         │  │
│  │──────────────────────────────────────────────│  │
│  │ # │ Item    │ Location │ WH  │ Lot  │ Qty   │  │
│  │   │         │          │     │      │ (kg)  │  │
│  │   │ Method  │ Status   │ Expires │ Created  │  │
│  │───┼─────────┼──────────┼─────┼──────┼───────│  │
│  │ 1 │ SKU-001 │ A-01-02  │ WH1 │ L001 │ 500  │  │
│  │   │ FIFO    │ 🟢Active │ 19/3│ 18/3 15:00 │  │
│  │ 2 │ SKU-001 │ B-02-01  │ WH1 │ L002 │ 300  │  │
│  │   │ FIFO    │ 🟠Expired│ 18/3│ 17/3 10:00 │  │
│  │──────────────────────────────────────────────│  │
│  │              Page 1 of 3  [< 1 2 3 >]        │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Field Visibility Rules

| Field | Visible When | Required When | Default Value |
|-------|-------------|--------------|---------------|
| Filter Bar | Always (collapsible) | N/A | Collapsed |
| Status filter | Always | No | All (no filter) |
| Item filter | Always | No | Empty |
| Location filter | Always | No | Empty |
| Date range | Always | No | Empty (all dates) |
| ExpiresAt column | Always | N/A | "—" if null |
| Lot column | Always | N/A | "—" if null |
| Location column | Always | N/A | "—" if null |

### Interaction Patterns

- **Filter toggle**: Click filter icon to expand/collapse filter bar
- **Status filter**: Dropdown multi-select (can select multiple statuses)
- **Item/Location filter**: Text input with debounce (300ms)
- **Date range**: Date pickers for From/To
- **Pagination**: Server-side, 20 items per page, standard prev/next + page numbers
- **Sort**: Click column header to sort (toggle ASC/DESC). Default: CreatedTime DESC
- **Status badges**: Color-coded chips (Active=green, Completed=blue, Released=gray, Expired=orange, Cancelled=red)

---

## Dependencies

| Dependency | Type | Status | Impact if Missing |
|------------|------|--------|------------------|
| `AllocationRecord` entity | Data | ✅ Exists | Cannot build feature |
| `InventDim` with Location/Lot navigation | Data | ✅ Exists | Cannot resolve location/lot names |
| Order Detail page | Feature | ✅ Exists | No place to add tab |
| Allocation flow (AllocateAndPick) | Feature | ✅ Exists | No data to display |
| Server-side pagination pattern | Pattern | ✅ Exists (AuditLogs) | Need to build from scratch |

---

## Open Questions

| # | Question | Stakeholder | Deadline | Resolution |
|---|----------|-------------|----------|------------|
| — | None | — | — | All questions resolved |

---

## Summary

| Aspect | Detail |
|--------|--------|
| New entities | 0 (read-only from existing data) |
| New API endpoints | 1 (`GET /api/orders/{id}/allocation-records`) |
| New frontend components | 1 Card section + filter bar |
| Modified frontend components | Order Detail page (add new section) |
| Estimated BE effort | Small (1 query + 1 DTO + 1 endpoint) |
| Estimated FE effort | Medium (new card, filter bar, pagination, status badges) |
