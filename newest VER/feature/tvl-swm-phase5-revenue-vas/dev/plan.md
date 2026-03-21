# Plan: Phase 5 — Revenue & VAS (Billing Calculation + VAS/Bagging)

## Summary

Implement the Billing Calculation Engine (Track 5A) and VAS/Bagging Operations (Track 5B) as two parallel development tracks. Track 5A handles auto-capture of billing transactions from operational events, daily storage snapshots, fee calculation with 4 billing methods, debit/credit note lifecycle. Track 5B handles bagging work order lifecycle, multi-session progress tracking, atomic inventory transactions on completion, and lot traceability.

## Requirements

### Track 5A: Billing Calculation Engine
- **Auto-Capture**: Create BillingTransaction automatically when receipt confirmed (HANDLING_IN), order shipped (HANDLING_OUT), or BWO completed (BAGGING)
- **Rate Lookup**: Given owner + fee_type → find active contract → contract_fee_line → unit_price with billing_method logic
- **Daily Storage Snapshots**: EOD job at 23:59 UTC+7, snapshot closing qty per (owner, item, warehouse, lot) from on_hand
- **Fee Calculation**: 4 methods — FLAT (PerTransaction), PER_UNIT (PerUnit), PER_WEIGHT (PerWeight), PER_DAY (PerDay) with day_type_multiplier
- **Free Days**: 3 modes — PerContract, PerBl, PerReceipt
- **Debit Notes**: Generate from owner + period, aggregate transactions + storage fees, status machine DRAFT → Confirmed → Sent → Locked
- **Credit Notes**: Correction for Locked debit notes only
- **Reports**: Billing summary, storage occupancy

### Track 5B: VAS/Bagging Operations
- **BWO CRUD**: Create/update bagging work orders with source (BULK) → target (BAGGED) item conversion
- **Status Machine**: Draft → InProgress → Completed (also: Paused, Cancelled, QualityCheck)
- **Progress Tracking**: Multi-session recording (bags, weight, overtime flag)
- **Completion → Inventory**: 3-5 atomic InventTrans (ISSUE bulk, ISSUE packaging if TVL_OWNED, RECEIPT bagged, ADJUSTMENT waste)
- **Lot Traceability**: New bagged lot references source_lot_id
- **DPM Dual Tracking**: Nominal InventTrans when owner.dual_tracking_enabled
- **Billing Integration**: Auto-create BAGGING fee BillingTransaction on completion

## Impact Analysis

### Files to Create

#### Backend — Track 5A
| Path | Purpose |
|------|---------|
| `Features/Billing/Transactions/Queries/GetBillingTransactionList.cs` | List billing transactions (DynamicGrid) |
| `Features/Billing/Transactions/Dtos/BillingTransactionDto.cs` | DTO |
| `Features/Billing/Transactions/Mappings/BillingTransactionMappings.cs` | Mapping |
| `Features/Billing/Snapshots/Commands/RunDailySnapshot.cs` | EOD snapshot job |
| `Features/Billing/Snapshots/Commands/RebuildSnapshots.cs` | Admin rebuild |
| `Features/Billing/Snapshots/Queries/GetDailyStorageSnapshotList.cs` | List snapshots |
| `Features/Billing/Snapshots/Dtos/DailyStorageSnapshotDto.cs` | DTO |
| `Features/Billing/Snapshots/Mappings/DailyStorageSnapshotMappings.cs` | Mapping |
| `Features/Billing/DebitNotes/Commands/GenerateDebitNote.cs` | Generate from owner + period |
| `Features/Billing/DebitNotes/Commands/UpdateDebitNote.cs` | Update (Draft only) |
| `Features/Billing/DebitNotes/Commands/ReviewDebitNote.cs` | Draft → Confirmed |
| `Features/Billing/DebitNotes/Commands/ApproveDebitNote.cs` | Confirmed → Sent |
| `Features/Billing/DebitNotes/Commands/LockDebitNote.cs` | Sent → Locked |
| `Features/Billing/DebitNotes/Queries/GetDebitNoteById.cs` | Detail with lines |
| `Features/Billing/DebitNotes/Queries/GetDebitNoteList.cs` | List (DynamicGrid) |
| `Features/Billing/DebitNotes/Dtos/DebitNoteDto.cs` | DTO |
| `Features/Billing/DebitNotes/Dtos/DebitNoteDetailDto.cs` | Detail DTO with lines |
| `Features/Billing/DebitNotes/Mappings/DebitNoteMappings.cs` | Mapping |
| `Features/Billing/CreditNotes/Commands/CreateCreditNote.cs` | Create for Locked DN |
| `Features/Billing/CreditNotes/Queries/GetCreditNoteList.cs` | List |
| `Features/Billing/CreditNotes/Dtos/CreditNoteDto.cs` | DTO |
| `Features/Billing/CreditNotes/Mappings/CreditNoteMappings.cs` | Mapping |
| `Features/Billing/Reports/Queries/GetBillingSummary.cs` | Summary report |
| `Features/Billing/Reports/Queries/GetStorageOccupancy.cs` | Occupancy report |
| `Features/Billing/Services/FeeCalculationService.cs` | Fee calculation (4 methods) |
| `Features/Billing/Services/IFeeCalculationService.cs` | Interface |
| `Features/Billing/Services/RateLookupService.cs` | Rate lookup from contract |
| `Features/Billing/Services/IRateLookupService.cs` | Interface |
| `Features/Billing/Services/BillingCaptureService.cs` | Auto-capture orchestrator |
| `Features/Billing/Services/IBillingCaptureService.cs` | Interface |
| `Controllers/BillingTransactionsController.cs` | Transaction endpoints |
| `Controllers/DailyStorageSnapshotsController.cs` | Snapshot endpoints |
| `Controllers/DebitNotesController.cs` | Debit note endpoints |
| `Controllers/CreditNotesController.cs` | Credit note endpoints |

#### Backend — Track 5B
| Path | Purpose |
|------|---------|
| `Features/Vas/BaggingWorkOrders/Commands/CreateBaggingWorkOrder.cs` | Create BWO |
| `Features/Vas/BaggingWorkOrders/Commands/UpdateBaggingWorkOrder.cs` | Update (Draft only) |
| `Features/Vas/BaggingWorkOrders/Commands/ConfirmBaggingWorkOrder.cs` | Draft → InProgress |
| `Features/Vas/BaggingWorkOrders/Commands/StartBaggingWorkOrder.cs` | Confirm → InProgress |
| `Features/Vas/BaggingWorkOrders/Commands/CompleteBaggingWorkOrder.cs` | Complete + atomic InventTrans |
| `Features/Vas/BaggingWorkOrders/Commands/CancelBaggingWorkOrder.cs` | Cancel |
| `Features/Vas/BaggingWorkOrders/Queries/GetBaggingWorkOrderById.cs` | Detail with progress |
| `Features/Vas/BaggingWorkOrders/Queries/GetBaggingWorkOrderList.cs` | List (DynamicGrid) |
| `Features/Vas/BaggingWorkOrders/Dtos/BaggingWorkOrderDto.cs` | DTO |
| `Features/Vas/BaggingWorkOrders/Dtos/BaggingWorkOrderDetailDto.cs` | Detail DTO |
| `Features/Vas/BaggingWorkOrders/Mappings/BaggingWorkOrderMappings.cs` | Mapping |
| `Features/Vas/BaggingProgress/Commands/CreateBaggingProgress.cs` | Add session |
| `Features/Vas/BaggingProgress/Commands/UpdateBaggingProgress.cs` | Update session |
| `Features/Vas/BaggingProgress/Commands/DeleteBaggingProgress.cs` | Remove session |
| `Features/Vas/BaggingProgress/Dtos/BaggingProgressDto.cs` | DTO |
| `Features/Vas/BaggingProgress/Mappings/BaggingProgressMappings.cs` | Mapping |
| `Features/Vas/Reports/Queries/GetBaggingSummary.cs` | Summary report |
| `Features/Vas/Reports/Queries/GetLotTraceability.cs` | Lot traceability chain |
| `Controllers/BaggingWorkOrdersController.cs` | BWO endpoints |
| `Controllers/BaggingProgressController.cs` | Progress endpoints |

#### Frontend — Track 5A
| Path | Purpose |
|------|---------|
| `features/billing-transactions/` | Transaction list & detail |
| `features/daily-storage-snapshots/` | Snapshot viewer |
| `features/debit-notes/` | Debit note list, detail, generation |
| `features/credit-notes/` | Credit note list & creation |

#### Frontend — Track 5B
| Path | Purpose |
|------|---------|
| `features/bagging/` | BWO list, create, detail, progress, completion, traceability |

### Files to Modify
- `Controllers/` — Add new controller files (no existing modification)
- `frontend/src/components/layout/data/sidebar-data.ts` — Add billing & VAS nav groups
- `frontend/src/i18n/locales/en/navigation.json` — Add billing & VAS nav i18n
- `frontend/src/i18n/locales/vi/navigation.json` — Add billing & VAS nav i18n
- `frontend/src/i18n/index.ts` — Register new i18n namespaces
- `frontend/src/lib/i18n-helpers.ts` — Add namespace prefixes
- `frontend/src/router.tsx` or equivalent — Add new routes

### Database Changes
- No new migrations needed (entities + tables already created in Phase 0)
- DynamicQuery form config SQL scripts needed for new grid views

### Breaking Changes
- None — all new features, no existing API modification

## Architecture Decisions

### ADR-1: BillingTransaction as Append-Only Ledger
- BillingTransaction extends `AppendOnlyEntity` — no updates, no deletes
- Corrections only via CreditNote against locked DebitNotes
- Rationale: Financial audit trail integrity

### ADR-2: Fee Calculation as Domain Service
- `IFeeCalculationService` handles all 4 billing methods
- `IRateLookupService` resolves owner → contract → fee_line → rate
- Rationale: Complex business logic belongs in domain services, not command handlers

### ADR-3: Atomic InventTrans on BWO Completion
- CompleteBaggingWorkOrder posts 3-5 InventTrans lines atomically in single DB transaction
- Uses existing `IInventTransService` from Phase 3B
- Rationale: Mass balance integrity — partial posting would corrupt inventory

### ADR-4: DPM Dual-Tracking as Separate Nominal Records
- When `owner.dual_tracking_enabled = true`, post additional InventTrans with `is_nominal = true`
- Nominal records not materialized in on_hand (read model excludes them)
- Rationale: Reporting requirement — actual vs nominal comparison without affecting physical inventory

### ADR-5: Event-Driven Billing Capture
- Billing transactions auto-captured via service calls from existing command handlers
- Receipt confirmed → calls `IBillingCaptureService.CaptureHandlingInAsync()`
- Ship confirmed → calls `IBillingCaptureService.CaptureHandlingOutAsync()`
- BWO completed → calls `IBillingCaptureService.CaptureBaggingFeeAsync()`
- Rationale: Direct service call (not event bus) keeps it simple and transactional

## Notes & Risks

- **RISK (High)**: Fee calculation edge cases — TIERED billing with marginal vs flat mode, HIGHER_OF_TWO boundary conditions. Mitigation: comprehensive unit tests for each method.
- **RISK (Medium)**: Daily snapshot performance — partitioned query by (tenant_id, snapshot_date) already designed. Monitor for large tenants.
- **RISK (Medium)**: Mass balance validation on BWO completion — must ensure consumed = produced + waste exactly. Mitigation: hard block on mismatch.
- **RISK (Low)**: DebitNote generation for large owners with thousands of transactions. Mitigation: paginated aggregation.
- **DEPENDENCY**: Track 5B.13 (BWO → BillingTransaction) requires Track 5A's `IBillingCaptureService` to exist. Implementation order: create the service interface first, implement capture logic later.
- **ENUM MISMATCH**: BA spec uses FLAT_RATE/PER_UNIT/HIGHER_OF_TWO/TIERED but domain enum is PerUnit/PerWeight/PerDay/PerTransaction. Need to align — use existing enum values and map billing logic accordingly.
