# Plan: Sale Order Detail UI Enhancement

## Summary

Bổ sung Sale Order Detail (line items) vào form Add/Edit Sale Order. Backend đã có entity + CRUD commands nhưng thiếu Delete. Frontend hoàn toàn thiếu detail management UI - chỉ có header fields.

## Task Analysis
- Feature Name: Sale Order Detail UI
- Type: Enhancement
- Scope: Full Stack
- Priority: High
- Complexity: Medium

## Requirements
- [x] Backend: SaleOrder + SaleOrderDetail entities (đã có)
- [x] Backend: CreateSaleOrder with inline details (đã có)
- [x] Backend: AddSaleOrderDetail + UpdateSaleOrderDetail commands (đã có)
- [ ] Backend: RemoveSaleOrderDetail command + DELETE endpoint
- [ ] Backend: UpdateSaleOrder phải hỗ trợ detail lines (replace-all strategy như PurchaseOrder)
- [ ] Frontend: SaleOrderDetail Zod schema + TypeScript type
- [ ] Frontend: API commands với details field (create + update)
- [ ] Frontend: Custom action dialog với useFieldArray cho detail lines
- [ ] Frontend: i18n translations cho detail fields (EN + VI)

## Acceptance Criteria
- [ ] User có thể thêm/sửa/xóa line items khi tạo Sale Order mới
- [ ] User có thể thêm/sửa/xóa line items khi edit Sale Order (chỉ Draft status)
- [ ] Mỗi line item gồm: Item (select, required), Original Qty (number, required), UOM (text), Net Weight (number), Lot (select, optional)
- [ ] Backend validate: ItemId required, OriginalQty > 0, Uom max 20 chars
- [ ] Delete detail line chỉ cho phép khi SO ở Draft status
- [ ] Build thành công (0 errors) trên cả backend và frontend

## Impact Analysis

### Files to Create
| File | Layer | Purpose |
|------|-------|---------|
| `backend/.../SaleOrderDetails/Commands/RemoveSaleOrderDetail.cs` | Backend | Delete detail command |
| `frontend/.../components/sale-orders-action-dialog.tsx` | Frontend | Custom dialog with detail lines |

### Files to Modify
| File | Layer | Change |
|------|-------|--------|
| `backend/.../SaleOrders/Commands/UpdateSaleOrder.cs` | Backend | Add `List<DetailItem> Details` + replace-all strategy |
| `backend/.../Controllers/SaleOrdersController.cs` | Backend | Add DELETE endpoint |
| `frontend/.../data/schema.ts` | Frontend | Add SaleOrderDetail schema |
| `frontend/.../api/sale-orders.ts` | Frontend | Add details to create/update commands |
| `frontend/.../config/sale-orders-input.config.ts` | Frontend | Add line item schema + defaults |
| `frontend/.../components/sale-orders-dialogs.tsx` | Frontend | Switch from FeatureDialogManager to custom dialog |
| `frontend/src/i18n/locales/en/saleOrders.json` | Frontend | Add detail field translations |
| `frontend/src/i18n/locales/vi/saleOrders.json` | Frontend | Add detail field translations |

### Database Changes
- None (entities already exist, no migration needed)

### API Changes
- NEW: `DELETE /api/sale-order-details/{id}` - Remove detail line
- MODIFIED: `PUT /api/sale-orders/{id}` - Now accepts `details` array (replace-all strategy)

### Breaking Changes
- `UpdateSaleOrder.Command` gets new `Details` parameter - backward compatible (optional list)

## Architecture Decisions

### AD-1: Update Strategy for Detail Lines
**Decision**: Use replace-all strategy (delete existing + re-add) for UpdateSaleOrder, matching PurchaseOrder pattern.
**Rationale**: Simpler than tracking individual add/update/delete operations. Frontend sends full list, backend replaces atomically. The individual Add/Update/Delete endpoints remain available for granular operations.

### AD-2: Frontend Dialog Pattern
**Decision**: Replace `FeatureDialogManager` with custom `SaleOrdersActionDialog` using `useFieldArray`.
**Rationale**: `FeatureDialogManager` is config-driven and doesn't support nested array fields. PurchaseOrder uses this exact pattern successfully.

### AD-3: Detail Line Fields
**Decision**: Line items include: ItemId (required), OriginalQty (required), Uom (optional), NetWeightKg (optional), LotId (optional).
**Rationale**: Matches SaleOrderDetail entity fields. AllocatedQty/PickedQty/ShippedQty are system-managed, not user-editable.

## Notes & Risks
- **Low Risk**: No database migration needed - entities already exist
- **Pattern**: Following established PurchaseOrder master-detail pattern exactly
- **Backward Compat**: Individual detail endpoints (Add/Update) remain functional alongside replace-all Update
