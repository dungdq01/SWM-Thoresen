# Plan: Add VesselName & BlNumber to InboundReceipt, SaleOrder, OrderHeader

## Summary

Add `VesselName` (string, max 100, nullable) and `BlNumber` (string, max 50, nullable) fields to 3 entities: **InboundReceipt**, **SaleOrder**, and **OrderHeader**. PurchaseOrder already has these fields and serves as the reference pattern.

## Requirements

- [x] PurchaseOrder already has VesselName & BlNumber (reference pattern)
- [ ] InboundReceipt needs VesselName & BlNumber
- [ ] SaleOrder needs VesselName & BlNumber
- [ ] OrderHeader needs VesselName & BlNumber
- [ ] All fields are nullable (no required validation — unlike PO's Water type rule)
- [ ] Full-stack: entity, EF config, commands, queries/DTOs, mappings, API, frontend (schema, form, i18n)

## Impact Analysis

### Files to Modify (Backend - 15 files)

| # | File | Change |
|---|------|--------|
| 1 | `Domain/Entities/Inbound/InboundReceipt.cs` | Add 2 properties |
| 2 | `Domain/Entities/Outbound/SaleOrder.cs` | Add 2 properties |
| 3 | `Domain/Entities/Outbound/OrderHeader.cs` | Add 2 properties |
| 4 | `Infrastructure/EF/Configurations/Inbound/InboundReceiptConfiguration.cs` | Add 2 column mappings |
| 5 | `Infrastructure/EF/Configurations/Outbound/SaleOrderConfiguration.cs` | Add 2 column mappings |
| 6 | `Infrastructure/EF/Configurations/Outbound/OrderHeaderConfiguration.cs` | Add 2 column mappings |
| 7 | `Application/Features/Inbound/InboundReceipts/Commands/CreateInboundReceipt.cs` | Add to Command + handler |
| 8 | `Application/Features/Inbound/InboundReceipts/Commands/UpdateInboundReceipt.cs` | Add to Command + handler |
| 9 | `Application/Features/Outbound/SaleOrders/Commands/CreateSaleOrder.cs` | Add to Command + handler |
| 10 | `Application/Features/Outbound/SaleOrders/Commands/UpdateSaleOrder.cs` | Add to Command + handler |
| 11 | `Application/Features/Outbound/Orders/Commands/CreateOrder.cs` | Add to Command + handler |
| 12 | `Application/Features/Outbound/Orders/Commands/UpdateOrder.cs` | Add to Command + handler |
| 13 | `Application/Features/Inbound/InboundReceipts/Dtos/InboundReceiptDto.cs` | Add 2 fields to DTO |
| 14 | `Application/Features/Outbound/SaleOrders/Dtos/SaleOrderDto.cs` | Add 2 fields to DTO |
| 15 | `Application/Features/Outbound/Orders/Dtos/OrderDto.cs` | Add 2 fields to DTO |
| 16 | `Application/Features/Inbound/InboundReceipts/Mappings/InboundReceiptMappings.cs` | Map new fields |
| 17 | `Application/Features/Outbound/SaleOrders/Mappings/SaleOrderMappings.cs` | Map new fields |
| 18 | `Application/Features/Outbound/Orders/Mappings/OrderMappings.cs` | Map new fields |

### Files to Modify (Frontend - 12 files)

| # | File | Change |
|---|------|--------|
| 1 | `features/inbound-receipts/data/schema.ts` | Add 2 schema fields |
| 2 | `features/sale-orders/data/schema.ts` | Add 2 schema fields |
| 3 | `features/orders/data/schema.ts` | Add 2 schema fields |
| 4 | `features/inbound-receipts/api/inbound-receipts.ts` | Add to API command interfaces |
| 5 | `features/sale-orders/api/sale-orders.ts` | Add to API command interfaces |
| 6 | `features/orders/api/orders.ts` | Add to API command interfaces |
| 7 | `features/inbound-receipts/config/inbound-receipts-input.config.ts` | Add 2 form fields + schema + defaults |
| 8 | `features/sale-orders/config/sale-orders-input.config.ts` | Add 2 form fields + schema + defaults |
| 9 | `features/orders/config/orders-input.config.ts` | Add 2 form fields + schema + defaults |
| 10 | `i18n/locales/en/inboundReceipts.json` | Add field/placeholder labels |
| 11 | `i18n/locales/en/saleOrders.json` | Add field/placeholder labels |
| 12 | `i18n/locales/en/orders.json` | Add field/placeholder labels |
| 13 | `i18n/locales/vi/inboundReceipts.json` | Add field/placeholder labels |
| 14 | `i18n/locales/vi/saleOrders.json` | Add field/placeholder labels |
| 15 | `i18n/locales/vi/orders.json` | Add field/placeholder labels |

### Database Changes
- EF migration required: `AddVesselNameBlNumberToReceiptSaleOrderOrder`

### API Changes
- No new endpoints — existing Create/Update/GetById endpoints gain 2 new optional fields each

### Breaking Changes
- None — all new fields are nullable/optional

## Architecture Decisions

1. **No conditional validation**: Unlike PO (where VesselName is required when PoType=Water), these fields are purely optional across all 3 entities
2. **Column naming**: Follow existing convention — `vessel_name` (max 100), `bl_number` (max 50) in snake_case
3. **DB schema**: All 3 tables are in `operation` schema — consistent placement

## Notes & Risks
- **Low risk**: Simple field additions with no business logic changes
- No FK relationships — plain string properties
- Frontend forms already have the pattern from PurchaseOrder
