# Development Phases Overview — TVL SWM v5.1

**Date:** 2026-03-13
**Strategy:** Migration-first → Parallel CRUD/Logic implementation
**Migration Status:** COMPLETED (all ~59 tables created in single migration)

---

## Parallel Development Architecture

```
PHASE 1: Foundation (1 dev, ~2 sprints) — BLOCKING
  ├── Auth middleware, tenant context, number sequence
  └── Must complete before any business module
  │
  ▼
PHASE 2: Master Data CRUD (3-4 devs PARALLEL, ~2-3 sprints)
  ├── Track 2A: Warehouse Hierarchy    ← Dev A
  ├── Track 2B: Business Partners      ← Dev B
  ├── Track 2C: Items & Carriers       ← Dev C
  └── Track 2D: Billing Setup (CRUD)   ← Dev D  ← CAN START EARLY!
  │
  ▼
PHASE 3: Core Engines (3 devs PARALLEL, ~3-4 sprints)
  ├── Track 3A: Lot + InventDim        ← Dev A
  ├── Track 3B: InventTrans Engine     ← Dev B (most complex)
  └── Track 3C: Weighbridge Engine     ← Dev C
  │
  ▼
PHASE 4: Operations (3 devs PARALLEL, ~4-5 sprints)
  ├── Track 4A: Inbound                ← Dev A
  ├── Track 4B: Outbound               ← Dev B
  └── Track 4C: Transfer + Adjustment  ← Dev C
  │
  ▼
PHASE 5: Revenue & VAS (2 devs PARALLEL, ~3-4 sprints)
  ├── Track 5A: Billing Calculation    ← Dev A
  └── Track 5B: VAS / Bagging         ← Dev B
```

---

## Dependency Graph (Detailed)

```
Phase 1 ─────────────────────────────────────────────────────────
  │
  ├──► Phase 2A (Warehouse)  ──┐
  ├──► Phase 2B (Partners)   ──┤── All independent CRUDs
  ├──► Phase 2C (Items)      ──┤
  └──► Phase 2D (Billing $)  ──┘
         │          │         │
         └──────────┼─────────┘
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
      Phase 3A   Phase 3B   Phase 3C
      (Lot+Dim)  (InvTrans) (Weighbridge)
         │          │          │
         └────┬─────┘          │
              │                │
         ┌────┼────────────────┤
         ▼    ▼                ▼
      Phase 4A (Inbound) ◄── Phase 3C (WB integration)
      Phase 4B (Outbound)
      Phase 4C (Transfer)
         │
         ├──► Phase 5A (Billing Calc)
         └──► Phase 5B (VAS/Bagging)
```

---

## Conflict Avoidance Rules

### Backend Folder Ownership

| Track | Owns Folders | Do NOT Touch |
|-------|-------------|-------------|
| 2A | `Application/Features/Warehouses/`, `Zones/`, `Locations/` | Other tracks' folders |
| 2B | `Application/Features/Owners/`, `Vendors/` | Items, Warehouses |
| 2C | `Application/Features/Items/`, `ItemGroups/`, `Carriers/`, `VehicleTypes/` | Owners, Warehouses |
| 2D | `Application/Features/Billing/FeeTypes/`, `DayTypes/`, `Calendars/`, `Contracts/` | Operations |
| 3A | `Application/Features/Lots/`, `InventDims/` | InventTrans |
| 3B | `Application/Features/Inventory/` (InventTrans, OnHand, Materialization) | Lots |
| 3C | `Application/Features/Weighbridge/` | Inbound/Outbound |
| 4A | `Application/Features/Inbound/` (PO, Receipt, Work) | Outbound |
| 4B | `Application/Features/Outbound/` (SO, Order, Allocation) | Inbound |
| 4C | `Application/Features/Transfers/`, `InventoryAdjustments/` | Inbound/Outbound |
| 5A | `Application/Features/Billing/Calculation/`, `DebitNotes/` | VAS |
| 5B | `Application/Features/Vas/` | Billing |

### Frontend Route Ownership

| Track | Owns Routes | Pages |
|-------|------------|-------|
| 2A | `/warehouses`, `/zones`, `/locations` | Master data CRUD |
| 2B | `/owners`, `/vendors` | Master data CRUD |
| 2C | `/items`, `/item-groups`, `/carriers` | Master data CRUD |
| 2D | `/billing/fee-types`, `/billing/contracts`, `/billing/calendar` | Billing setup |
| 3C | `/weighbridge` | Weighbridge management |
| 4A | `/purchase-orders`, `/receipts` | Inbound operations |
| 4B | `/sale-orders`, `/orders` | Outbound operations |
| 4C | `/transfers`, `/adjustments` | Transfer & adjustments |
| 5A | `/billing/debit-notes`, `/billing/snapshots` | Billing calculation |
| 5B | `/bagging` | VAS operations |

### Shared Code Rules

1. **Entity classes** — READ ONLY. Đã tạo trong migration. Không sửa trừ khi có ADR.
2. **DbContext** — READ ONLY. Đã register DbSet. Thêm chỉ qua PR review.
3. **Shared services** (NumberSequence, AuditLog) — Phase 1 tạo, các phase khác chỉ CALL.
4. **InventTrans service** — Phase 3B tạo interface, Phase 4A/4B/4C implement business flows.
5. **Weighbridge service** — Phase 3C tạo, Phase 4A/4B integrate.

---

## Effort Summary

| Phase | Tracks | Devs | Sprints | Cumulative |
|-------|--------|------|---------|------------|
| 1 | 1 | 1 | 2 | 2 |
| 2 | 4 parallel | 3-4 | 2-3 | 4-5 |
| 3 | 3 parallel | 3 | 3-4 | 7-9 |
| 4 | 3 parallel | 3 | 4-5 | 11-14 |
| 5 | 2 parallel | 2 | 3-4 | 14-18 |
| **Total** | **15 tracks** | **3-5 devs** | **14-18 sprints** | |

**Critical Path**: Phase 1 → 2(any) → 3B(InventTrans) → 4B(Outbound) → 5A(Billing)
**Max Parallelism**: Phase 2 (4 devs) and Phase 4 (3 devs)
