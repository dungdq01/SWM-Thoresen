# Plan: Allocation History Tab

## Summary

Add a read-only "Allocation History" card section to the Order Detail page that displays paginated, filterable allocation records. Backend exposes one new GET endpoint with server-side pagination; frontend adds one new card component with filter bar, status badges, and pagination controls.

## Task Analysis

- **Feature Name**: Allocation History Tab
- **Type**: New Feature
- **Scope**: Full Stack
- **Priority**: High
- **Complexity**: Medium

## Requirements

- [x] AllocationRecord entity exists with all needed fields
- [x] InventDim entity exists with Location, Warehouse, Lot navigations
- [x] OrderDetail entity exists with Item navigation
- [x] Order Detail page exists to host the new section
- [x] PaginationResDto pattern exists (AuditLogs reference)
- [ ] Backend: Paginated query `GetAllocationsByOrder` with filters (status, item, location, date range)
- [ ] Backend: `AllocationRecordDto` with resolved names from navigations
- [ ] Backend: `GET /api/orders/{orderId}/allocation-records` endpoint on OrdersController
- [ ] Frontend: `AllocationHistoryCard` component with table, filter bar, pagination
- [ ] Frontend: API function + query key for allocation records
- [ ] Frontend: Status color badges (Active=green, Completed=blue, Released=gray, Expired=orange, Cancelled=red)
- [ ] Frontend: Empty state when no records

## Impact Analysis

### Files to Create

**Backend (3 files):**
| File | Purpose |
|------|---------|
| `Application/Features/Outbound/AllocationRecords/Dtos/AllocationRecordDto.cs` | DTO with resolved navigation names |
| `Application/Features/Outbound/AllocationRecords/Mappings/AllocationRecordMappings.cs` | Extension method `ToDto()` using Select projection |
| `Application/Features/Outbound/AllocationRecords/Queries/GetAllocationsByOrder.cs` | Query + Handler with WhereIf filters, pagination |

**Frontend (3 files):**
| File | Purpose |
|------|---------|
| `features/orders/api/allocation-records.ts` | API function + types for allocation records |
| `features/orders/components/allocation-history-card.tsx` | Card with table, filter bar, pagination, status badges |
| `features/orders/data/allocation-schema.ts` | Zod schema + TS types for AllocationRecord |

### Files to Modify

**Backend (1 file):**
| File | Change |
|------|--------|
| `Api/Controllers/OrdersController.cs` | Add `GetAllocationRecords` endpoint to `OrdersController` |

**Frontend (2 files):**
| File | Change |
|------|--------|
| `features/orders/components/order-detail.tsx` | Import and render `AllocationHistoryCard` after Order Lines card |
| `features/orders/api/query-keys.ts` | Add `allocationRecords` key factory |

### Database Changes
- **None** - read-only from existing `allocation_record` table

### Breaking Changes
- **None** - purely additive

## Architecture Decisions

### ADR-1: GET endpoint with query params (not POST /search)

**Decision**: Use `GET /api/orders/{orderId}/allocation-records?status=Active&page=1&pageSize=20`

**Rationale**: This is a simple read-only query scoped to one order. The filter set is small (5 params) and fits comfortably in query string. POST /search pattern is reserved for DynamicGrid complex queries. The AuditLogs pattern uses the same GET + query params approach.

### ADR-2: DTO mapping via Select projection (not `.Include().ToDto()`)

**Decision**: Use EF Select projection in the query to flatten AllocationRecord + InventDim + Location + Warehouse + Lot + Item into a flat DTO.

**Rationale**: Single SQL query, no N+1, only fetches needed columns. Follows the AuditLog mapping pattern but with joins.

### ADR-3: Separate component file for AllocationHistoryCard

**Decision**: Create `allocation-history-card.tsx` as a standalone component, imported into `order-detail.tsx`.

**Rationale**: The order-detail.tsx is already 350 lines. Adding filter state, pagination state, and table rendering inline would bloat it. A dedicated component keeps concerns separated and the file manageable.

### ADR-4: Status filter as multi-select, text filters with debounce

**Decision**: Status uses multi-select dropdown (matches BA spec). Item and Location use debounced text inputs (300ms). All filters are AND-combined.

**Rationale**: Matches the interaction patterns specified in the BA spec. Server-side filtering avoids fetching all records.

## Notes & Risks

- **Low Risk**: All entities and relationships already exist. No schema changes.
- **Watch**: EF Core Select projection with multiple nullable navigations (Location?, Lot?) - use null-conditional operators in the projection.
- **Watch**: The `AllocationStatus` and `AllocationMethod` enums use PascalCase values (Fifo, Lifo, ByLot, ByLocation). The DTO should return the enum `.ToString()` value; frontend maps display names.
- **Lesson applied**: From `dev.md` - no DynamicQuery/form scripts needed since this is a simple paginated query, not a DynamicGrid feature.
