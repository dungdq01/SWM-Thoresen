# Plan: UOM Selection Filtered by Item's UOM Conversions

## Summary

Replace the generic UOM dropdown (`dataSource='uoms-code'`) in PO, SO, Order, and Receipt line items with a filtered dropdown that only shows UOMs available through UomConversion rules for the selected item's DefaultUom. This ensures users can only select valid, convertible UOMs per SKU.

## Requirements

- [x] R1: Backend endpoint that returns UOM options for a given item (based on Item.DefaultUom + UomConversion table)
- [x] R2: Frontend data source `uoms-by-item` that calls the new endpoint with `itemId` parameter
- [x] R3: PO line items: UOM field filters by selected `itemId` in same line
- [x] R4: SO line items: UOM field filters by selected `itemId` in same line
- [x] R5: Order line items: UOM field filters by selected `itemId` in same line
- [x] R6: Receipt line items: UOM field filters by item (from PO line data)

## Impact Analysis

### Files to Create
- `backend/.../UomConversions/Queries/GetUomLookupByItem.cs` - New query handler

### Files to Modify

**Backend** (1 file):
- `backend/.../Controllers/UomConversionsController.cs` - Add lookup endpoint

**Frontend** (7 files):
- `frontend/src/features/uoms/api/uoms.ts` - Add `getUomLookupByItem` method
- `frontend/src/features/uoms/api/query-keys.ts` - Add `itemUomLookup` key
- `frontend/src/core/data-sources.ts` - Register `uoms-by-item` data source
- `frontend/src/features/purchase-orders/components/purchase-orders-action-dialog.tsx` - Update UOM SelectField
- `frontend/src/features/sale-orders/components/sale-orders-action-dialog.tsx` - Update UOM SelectField
- `frontend/src/features/orders/components/orders-action-dialog.tsx` - Update UOM SelectField
- `frontend/src/features/inbound-receipts/components/inbound-receipts-create-dialog.tsx` - Update UOM Select (useState pattern)
- `frontend/src/features/inbound-receipts/components/inbound-receipts-edit-dialog.tsx` - Update UOM Select (useState pattern)

### Database Changes: None
### Breaking Changes: None

## Architecture Decisions

### AD1: Endpoint Design
New endpoint: `GET /api/uom-conversions/lookup?itemId={guid}`
- Looks up Item → gets DefaultUom code → finds Uom entity by code
- Queries UomConversion where `FromUomId = defaultUomId OR ToUomId = defaultUomId`
- Returns distinct LookupDto list (Code + Name), always including the item's own DefaultUom
- If item has no DefaultUom or no conversions found, returns just the DefaultUom (or empty if no DefaultUom)
- Returns `LookupDto(Id, Code, Name)` matching existing UOM lookup format

### AD2: Frontend Data Source
Register `uoms-by-item` data source that:
- Uses `valueField: 'code'` (matching existing `uoms-code` pattern since UOM fields store code strings)
- Accepts `itemId` parameter
- Is used with `watchField` pointing to the item field in the same array index

### AD3: Cascading Select Pattern
For React Hook Form dialogs (PO, SO, Order):
- `watchField={`lineItems.${index}.itemId`}` (or `details.${index}.itemId`)
- `watchParamKey='itemId'`
- `clearOnWatchChange` to reset UOM when item changes

For useState dialogs (Receipt create/edit):
- Use `useDataSourceQuery('uoms-by-item', { itemId })` directly
- Pass filtered options to the Select component
- Item ID is available from PO line data (stored in line state)

### AD4: Fallback Behavior
When no item is selected yet: UOM field is disabled (existing watchField behavior).
When item has no DefaultUom: Return empty list → UOM field shows no options.
When item has DefaultUom but no conversions: Return only the DefaultUom itself.

## Notes & Risks
- Low risk: No DB changes, no breaking API changes
- Receipt forms use useState pattern (not React Hook Form), so they need manual `useDataSourceQuery` integration instead of `watchField`
- PurchaseOrderLine already has `ItemId` FK, so Receipt lines can track itemId from PO line data
