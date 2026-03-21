# Plan: Order Detail UI Enhancement

## Summary

Bổ sung Order Detail (line items) vào form Add/Edit Order. Backend đã có entity + CreateOrder với inline details nhưng thiếu AddOrderDetail, RemoveOrderDetail, và UpdateOrder không hỗ trợ details. Frontend hoàn toàn thiếu detail management UI.

## Task Analysis
- Feature Name: Order Detail UI
- Type: Enhancement
- Scope: Full Stack
- Priority: High
- Complexity: Medium

## Requirements
- [x] Backend: OrderHeader + OrderDetail entities (đã có)
- [x] Backend: CreateOrder with inline details (đã có)
- [x] Backend: UpdateOrderDetail command (đã có)
- [ ] Backend: AddOrderDetail command (thêm detail vào Order đã tồn tại)
- [ ] Backend: RemoveOrderDetail command + DELETE endpoint
- [ ] Backend: UpdateOrder phải hỗ trợ detail lines (replace-all strategy)
- [ ] Frontend: OrderDetail Zod schema + TypeScript type
- [ ] Frontend: API commands với details field (create + update)
- [ ] Frontend: Custom action dialog với useFieldArray cho detail lines
- [ ] Frontend: i18n translations cho detail fields (EN + VI)

## Acceptance Criteria
- [ ] User có thể thêm/sửa/xóa line items khi tạo Order mới
- [ ] User có thể thêm/sửa/xóa line items khi edit Order
- [ ] Mỗi line item gồm: Item (select, required), Expected Qty (number, required), UOM (select), Net Weight (number), SaleOrderDetail (select, optional)
- [ ] Backend validate: ItemId required, ExpectedQtyKg > 0, Uom max 20 chars
- [ ] Build thành công (0 errors) trên cả backend và frontend

## Impact Analysis

### Files to Create
| File | Layer | Purpose |
|------|-------|---------|
| `backend/.../OrderDetails/Commands/AddOrderDetail.cs` | Backend | Add detail to existing Order |
| `backend/.../OrderDetails/Commands/RemoveOrderDetail.cs` | Backend | Delete detail command |
| `frontend/.../components/orders-action-dialog.tsx` | Frontend | Custom dialog with detail lines |

### Files to Modify
| File | Layer | Change |
|------|-------|--------|
| `backend/.../Orders/Commands/UpdateOrder.cs` | Backend | Add `List<DetailItem> Details` + replace-all strategy |
| `backend/.../Controllers/OrdersController.cs` | Backend | Add POST detail + DELETE detail endpoints |
| `frontend/.../data/schema.ts` | Frontend | Add OrderDetail schema |
| `frontend/.../api/orders.ts` | Frontend | Add details to create/update commands |
| `frontend/.../config/orders-input.config.ts` | Frontend | Add line item schema + defaults |
| `frontend/.../components/orders-dialogs.tsx` | Frontend | Switch to custom dialog |
| `frontend/src/i18n/locales/en/orders.json` | Frontend | Add detail field translations |
| `frontend/src/i18n/locales/vi/orders.json` | Frontend | Add detail field translations |

### Database Changes
- None (entities already exist)

### API Changes
- NEW: `POST /api/orders/{orderId}/details` - Add detail to existing order
- NEW: `DELETE /api/order-details/{id}` - Remove detail line
- MODIFIED: `PUT /api/orders/{id}` - Now accepts `details` array (replace-all strategy)

## Architecture Decisions

### AD-1: Update Strategy
Replace-all strategy matching SaleOrder and PurchaseOrder patterns.

### AD-2: OrderDetail special field - SaleOrderDetailId
OrderDetail has an optional `SaleOrderDetailId` linking back to source SaleOrderDetail. This should be shown as an optional select in the form, using sale-order-details as data source. For simplicity in initial implementation, this can be omitted from the form since it's optional and typically set programmatically.

### AD-3: Status-managed fields
AllocatedQtyKg, PickedQtyKg, LoadedQtyKg, WeighedQtyKg, ShippedQtyKg, LineStatus are system-managed. Only user-editable fields: ItemId, ExpectedQtyKg, NetWeightKg, Uom.
