# Sales Orders Module — Implementation Report

**Date:** 2026-03-12  
**Status:** ✅ Complete (Steps 0–7)  
**E2E Test:** 28/28 pass

---

## 1. Scope

Implement Sales Orders module as the parent document for Outbound Shipments, following the 7-step workflow and Clean Architecture pattern used by Inbound/Outbound modules.

## 2. Files Created / Modified

### Backend — New Files
| File | Purpose |
|------|---------|
| `src/modules/sales-orders/domain/sales-order.errors.js` | Domain error class + error codes |
| `src/modules/sales-orders/domain/sales-order.state-machine.js` | SO lifecycle: DRAFT → CONFIRMED → PARTIALLY_RELEASED → FULLY_RELEASED → SHIPPED → CLOSED / CANCELLED |
| `src/modules/sales-orders/domain/sales-order.policy.js` | Blocking policy, master data validation |
| `src/modules/sales-orders/infra/sales-order.repository.js` | Prisma data access (CRUD, filter, dashboard) |
| `src/modules/sales-orders/infra/sales-order-status-history.repository.js` | Status history tracking |
| `src/modules/sales-orders/application/sales-order.service.js` | Core business logic, idempotency, number sequence |
| `src/modules/sales-orders/sales-order.schema.js` | Joi validation schemas |
| `src/modules/sales-orders/sales-order.controller.js` | Express controller (legacy JS) |
| `src/modules/sales-orders/sales-order.routes.js` | Express routes (legacy JS) |
| `src/modules/sales-orders/index.js` | Module barrel export |
| `src/modules/sales-orders/dto/sales-order.dto.ts` | NestJS DTOs with class-validator |
| `src/modules/sales-orders/services/sales-order.service.ts` | NestJS service wrapper |
| `src/modules/sales-orders/controllers/sales-order.controller.ts` | NestJS controller (11 endpoints) |
| `src/modules/sales-orders/sales-order.module.ts` | NestJS module definition |

### Backend — Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `SalesOrderStatus`, `SalesOrderLineStatus`, `SalesOrderType` enums + `SalesOrderHeader`, `SalesOrderLine`, `SalesOrderStatusHistory` models + FK from `ShipmentHeader` |
| `prisma/seed.ts` | Added 8 sales_order permissions |
| `src/app.module.ts` | Imported `SalesOrderModule` |
| `nest-cli.json` | Added `modules/sales-orders/**/*.js` to assets |

### Frontend — New Files
| File | Purpose |
|------|---------|
| `src/domains/sales-orders/api/salesOrders.api.js` | API client (httpClient wrapper) |
| `src/domains/sales-orders/hooks/useSalesOrders.js` | React Query hooks (7 queries + 6 mutations) |
| `src/domains/sales-orders/index.js` | Domain barrel export |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `src/pages/outbound-operations/SalesOrdersPage.jsx` | Rewrote to use `@domains/sales-orders`, match real API contract, add cancel modal, Vietnamese labels |
| `src/app/layouts/components/AppSidebar.jsx` | Added "Đơn bán hàng" link under Outbound |

## 3. API Endpoints (11 routes)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/sales-orders` | `sales_order.create` | Tạo SO |
| GET | `/sales-orders` | `sales_order.view` | Danh sách + filter + phân trang |
| GET | `/sales-orders/:id` | `sales_order.view` | Chi tiết SO |
| PUT | `/sales-orders/:id` | `sales_order.update` | Cập nhật (DRAFT only) |
| POST | `/sales-orders/:id/confirm` | `sales_order.confirm` | DRAFT → CONFIRMED |
| POST | `/sales-orders/:id/cancel` | `sales_order.cancel` | Hủy SO (requires reasonCode) |
| POST | `/sales-orders/:id/close` | `sales_order.close` | SHIPPED → CLOSED |
| POST | `/sales-orders/:id/release-shipment` | `sales_order.release` | Tạo Shipment từ SO lines |
| GET | `/sales-orders/:id/fulfillment` | `sales_order.view` | Tiến độ giao hàng |
| GET | `/sales-orders/:id/shipments` | `sales_order.view` | Shipments linked to SO |
| GET | `/sales-orders/:id/history` | `sales_order.view` | Lịch sử trạng thái |
| GET | `/sales-orders/dashboard/summary` | `sales_order.dashboard.view` | Dashboard tổng quan |

## 4. State Machine

```
DRAFT → CONFIRMED → PARTIALLY_RELEASED → FULLY_RELEASED → SHIPPED → CLOSED
  ↓         ↓                                                          
CANCELLED CANCELLED                                                   
```

## 5. E2E Test Results (28/28 ✅)

| # | Test | Result |
|---|------|--------|
| 1 | Create SO → DRAFT | ✅ |
| 2 | Get detail (relations populated) | ✅ |
| 3 | List with search filter | ✅ |
| 4 | Update DRAFT | ✅ |
| 5 | Confirm → CONFIRMED | ✅ |
| 6 | Update blocked after confirm (409) | ✅ |
| 7 | Re-confirm blocked (409) | ✅ |
| 8 | Fulfillment query | ✅ |
| 9 | Status history (2 entries) | ✅ |
| 10 | Dashboard summary | ✅ |
| 11 | Idempotency replay | ✅ |
| 12 | Cancel → CANCELLED | ✅ |
| 13 | Re-cancel blocked (409) | ✅ |
| 14 | RBAC guard active | ✅ |

## 6. Key Features

- **Idempotency:** Duplicate externalId returns existing SO with `idempotentReplay: true`
- **State machine:** Strict transition rules, computed dynamic status on release/rollback
- **Blocking policy:** Validates released qty doesn't exceed expected before shipment creation
- **Master data validation:** Verifies owner, customer, warehouse, items, UOMs exist and are active
- **Number sequence:** Auto-generated `SO-YYYYMMDD-NNNNNN` format
- **Status history:** Full audit trail of every transition
- **Dashboard:** Aggregated counts by status, overdue tracking, today's deliveries

## 7. Known Limitations

- `releaseShipment` creates ShipmentHeader but does not trigger Outbound module's weighing flow — requires Outbound integration callback
- `onShipmentStatusChanged` callback is stubbed, needs wiring from Outbound module events
- Frontend uses raw UUID input for customerId — could benefit from customer dropdown lookup
