# M2 — Master Data: FE ↔ BE Alignment Report

**Ngày:** 2026-03-10
**Module:** Master Data
**FE Pages:** `frontend/src/pages/master-data/` (9 pages)
**BE Module:** `backend/src/modules/master-data/`
**BE Docs:** `backend/docs/module-2-master-data.md`

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---------|-----------|
| API paths | ✅ KHỚP — NestJS global prefix `api/v1` + `@Controller('master-data/...')` = `/api/v1/master-data/...`; FE httpClient baseURL `/api/v1` + BASE_URL `/master-data` = `/api/v1/master-data/...` |
| Response format | ✅ KHỚP — `httpClient` response interceptor unwrap `response.data` |
| Auth header | ✅ KHỚP — auto-attach `x-user-code` từ localStorage |
| Idempotency-Key | ✅ KHỚP — auto-generate UUID cho POST/PUT/DELETE |
| Optimistic Locking | ✅ KHỚP — Mock data có `rowVersion: 1`; FormDrawers pass `payload.rowVersion = initialData.rowVersion`; BE DTOs có `@IsNumber() rowVersion!: number` |

> **Ghi chú quan trọng:** BE docs (module-2-master-data.md) ở sections 6.7 và 6.8 **không liệt kê** `/reactivate` cho UOM và VehicleType. Tuy nhiên kiểm tra **code thực tế** (`uom.controller.ts`, `vehicle-type.controller.ts`) cho thấy **cả hai controller đều có** `@Post(':id/reactivate')`. Docs bị stale/incomplete — code là nguồn sự thật.

---

## 2. Kiểm tra từng entity

### 2.1 Owner

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/owners` | `ownerApi.getList()` | OwnersPage list | ✅ KHỚP |
| `GET /master-data/owners/:id` | `ownerApi.getById()` | (dùng bởi form prefill) | ✅ KHỚP |
| `POST /master-data/owners` | `ownerApi.create()` | OwnerFormDrawer Create | ✅ KHỚP |
| `PUT /master-data/owners/:id` | `ownerApi.update()` | OwnerFormDrawer Edit | ✅ KHỚP |
| `POST /master-data/owners/:id/deactivate` | `ownerApi.deactivate()` | OwnersPage Deactivate | ✅ KHỚP |
| `POST /master-data/owners/:id/reactivate` | `ownerApi.reactivate()` | OwnersPage Reactivate | ✅ KHỚP |

> ✅ Owner **hoàn toàn khớp**.

---

### 2.2 Vendor

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/vendors` | `vendorApi.getList()` | VendorsPage list | ✅ KHỚP |
| `GET /master-data/vendors/:id` | `vendorApi.getById()` | (form prefill) | ✅ KHỚP |
| `POST /master-data/vendors` | `vendorApi.create()` | VendorFormDrawer Create | ✅ KHỚP |
| `PUT /master-data/vendors/:id` | `vendorApi.update()` | VendorFormDrawer Edit | ✅ KHỚP |
| `POST /master-data/vendors/:id/deactivate` | `vendorApi.deactivate()` | VendorsPage Deactivate | ✅ KHỚP |
| `POST /master-data/vendors/:id/reactivate` | `vendorApi.reactivate()` | VendorsPage Reactivate | ✅ KHỚP |

> ✅ Vendor **hoàn toàn khớp**.

---

### 2.3 Item

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/items` | `itemApi.getList()` | ItemsPage list | ✅ KHỚP |
| `GET /master-data/items/:id` | `itemApi.getById()` | (form prefill) | ✅ KHỚP |
| `POST /master-data/items` | `itemApi.create()` | ItemFormDrawer Create | ✅ KHỚP |
| `PUT /master-data/items/:id` | `itemApi.update()` | ItemFormDrawer Edit | ✅ KHỚP |
| `POST /master-data/items/:id/deactivate` | `itemApi.deactivate()` | ItemsPage Deactivate | ✅ KHỚP |
| `POST /master-data/items/:id/reactivate` | `itemApi.reactivate()` | ItemsPage Reactivate | ✅ KHỚP |

> ✅ Item **hoàn toàn khớp**.

---

### 2.4 Warehouse

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/warehouses` | `warehouseApi.getList()` | WarehousesPage list | ✅ KHỚP |
| `GET /master-data/warehouses/:id` | `warehouseApi.getById()` | (form prefill) | ✅ KHỚP |
| `POST /master-data/warehouses` | `warehouseApi.create()` | WarehouseFormDrawer Create | ✅ KHỚP |
| `PUT /master-data/warehouses/:id` | `warehouseApi.update()` | WarehouseFormDrawer Edit | ✅ KHỚP |
| `POST /master-data/warehouses/:id/deactivate` | `warehouseApi.deactivate()` | WarehousesPage Deactivate | ✅ KHỚP |
| `POST /master-data/warehouses/:id/reactivate` | `warehouseApi.reactivate()` | WarehousesPage Reactivate | ✅ KHỚP |

> ✅ Warehouse **hoàn toàn khớp**.

---

### 2.5 Zone

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/zones` | `zoneApi.getList()` | ZonesPage list | ✅ KHỚP |
| `GET /master-data/zones/:id` | `zoneApi.getById()` | (form prefill) | ✅ KHỚP |
| `POST /master-data/zones` | `zoneApi.create()` | ZoneFormDrawer Create | ✅ KHỚP |
| `PUT /master-data/zones/:id` | `zoneApi.update()` | ZoneFormDrawer Edit | ✅ KHỚP |
| `POST /master-data/zones/:id/deactivate` | `zoneApi.deactivate()` | ZonesPage Deactivate | ✅ KHỚP |
| `POST /master-data/zones/:id/reactivate` | `zoneApi.reactivate()` | ZonesPage Reactivate | ✅ KHỚP |

> ✅ Zone **hoàn toàn khớp**.

---

### 2.6 Location

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/locations` | `locationApi.getList()` | LocationsPage list | ✅ KHỚP |
| `GET /master-data/locations/:id` | `locationApi.getById()` | (form prefill) | ✅ KHỚP |
| `POST /master-data/locations` | `locationApi.create()` | LocationFormDrawer Create | ✅ KHỚP |
| `PUT /master-data/locations/:id` | `locationApi.update()` | LocationFormDrawer Edit | ✅ KHỚP |
| `POST /master-data/locations/:id/deactivate` | `locationApi.deactivate()` | LocationsPage Deactivate | ✅ KHỚP |
| `POST /master-data/locations/:id/reactivate` | `locationApi.reactivate()` | LocationsPage Reactivate | ✅ KHỚP |

> ✅ Location **hoàn toàn khớp**.

---

### 2.7 UOM

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/uoms` | `uomApi.getList()` | UomsPage list | ✅ KHỚP |
| `GET /master-data/uoms/:id` | `uomApi.getById()` | (form prefill) | ✅ KHỚP |
| `POST /master-data/uoms` | `uomApi.create()` | UomFormDrawer Create | ✅ KHỚP |
| `PUT /master-data/uoms/:id` | `uomApi.update()` | UomFormDrawer Edit | ✅ KHỚP |
| `POST /master-data/uoms/:id/deactivate` | `uomApi.deactivate()` | UomsPage Deactivate | ✅ KHỚP |
| `POST /master-data/uoms/:id/reactivate` | `uomApi.reactivate()` | UomsPage Reactivate | ✅ KHỚP — CRUD gap đã fix (G3) |

> **Ghi chú:** BE docs section 6.7 không liệt kê `/reactivate` nhưng `uom.controller.ts` line 47–52 xác nhận endpoint tồn tại. FE đã được fix (G3) — khớp hoàn toàn.

---

### 2.8 VehicleType

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/vehicle-types` | `vehicleTypeApi.getList()` | VehicleTypesPage list | ✅ KHỚP |
| `GET /master-data/vehicle-types/:id` | `vehicleTypeApi.getById()` | (form prefill) | ✅ KHỚP |
| `POST /master-data/vehicle-types` | `vehicleTypeApi.create()` | VehicleTypeFormDrawer Create | ✅ KHỚP |
| `PUT /master-data/vehicle-types/:id` | `vehicleTypeApi.update()` | VehicleTypeFormDrawer Edit | ✅ KHỚP |
| `POST /master-data/vehicle-types/:id/deactivate` | `vehicleTypeApi.deactivate()` | VehicleTypesPage Deactivate | ✅ KHỚP |
| `POST /master-data/vehicle-types/:id/reactivate` | `vehicleTypeApi.reactivate()` | VehicleTypesPage Reactivate | ✅ KHỚP — CRUD gap đã fix (G4) |

> **Ghi chú:** BE docs section 6.8 không liệt kê `/reactivate` nhưng `vehicle-type.controller.ts` line 47–52 xác nhận endpoint tồn tại. FE đã được fix (G4) — khớp hoàn toàn.

---

### 2.9 InventoryStatus (Seed-only)

| BE Endpoint | FE API Call | UI | Trạng thái |
|------------|------------|-----|-----------|
| `GET /master-data/inventory-statuses` | `inventoryStatusApi.getList()` | InventoryStatusesPage list | ✅ KHỚP |
| `GET /master-data/inventory-statuses/:id` | `inventoryStatusApi.getById()` | (form prefill) | ✅ KHỚP |
| `PUT /master-data/inventory-statuses/:id` | `inventoryStatusApi.update()` | InventoryStatusesPage Edit | ✅ KHỚP |
| ~~`POST /master-data/inventory-statuses`~~ | N/A | N/A | ✅ ĐÚNG THIẾT KẾ — seed-only, không có Create |
| ~~`POST /master-data/inventory-statuses/:id/deactivate`~~ | N/A | N/A | ✅ ĐÚNG THIẾT KẾ — `isSystemLocked` field, không có deactivate |

> ✅ InventoryStatus **hoàn toàn khớp** — thiết kế seed-only đúng.

---

### 2.10 Lookups

| BE Endpoint | FE API Call | Người dùng | Trạng thái |
|------------|------------|------------|-----------|
| `GET /master-data/lookups/owners` | `lookupApi.getOwners()` | Dropdown trong các form | ✅ KHỚP |
| `GET /master-data/lookups/vendors` | `lookupApi.getVendors()` | Dropdown trong các form | ✅ KHỚP |
| `GET /master-data/lookups/items` | `lookupApi.getItems()` | Dropdown trong các form | ✅ KHỚP |
| `GET /master-data/lookups/warehouses` | `lookupApi.getWarehouses()` | Dropdown trong các form | ✅ KHỚP |
| `GET /master-data/lookups/zones?warehouseId` | `lookupApi.getZones(warehouseId)` | Dropdown filtered theo warehouse | ✅ KHỚP |
| `GET /master-data/lookups/locations?warehouseId&zoneId` | `lookupApi.getLocations(whId, zoneId)` | Dropdown filtered | ✅ KHỚP |
| `GET /master-data/lookups/uoms` | `lookupApi.getUoms()` | Dropdown trong các form | ✅ KHỚP |
| `GET /master-data/lookups/vehicle-types` | `lookupApi.getVehicleTypes()` | Dropdown trong các form | ✅ KHỚP |
| `GET /master-data/lookups/inventory-statuses` | `lookupApi.getInventoryStatuses()` | Dropdown trong các form | ✅ KHỚP |

> ✅ Lookups **hoàn toàn khớp** — tất cả 9 endpoints.

---

## 3. Tổng hợp issues

### 🔴 CRITICAL — Không có issue nào

### ⚠️ WARNING — Docs stale (không ảnh hưởng runtime)

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| W1 | `module-2-master-data.md` sections 6.7 & 6.8 không liệt kê `POST /:id/reactivate` cho UOM và VehicleType | Docs bị stale. Code thực tế trong controller đúng. Không ảnh hưởng tới runtime. |

### ✅ MATCH — Hoàn toàn khớp

- Owner: CRUD + deactivate + reactivate ✅
- Vendor: CRUD + deactivate + reactivate ✅
- Item: CRUD + deactivate + reactivate ✅
- Warehouse: CRUD + deactivate + reactivate ✅
- Zone: CRUD + deactivate + reactivate ✅
- Location: CRUD + deactivate + reactivate ✅
- UOM: CRUD + deactivate + reactivate ✅ (G3 fixed)
- VehicleType: CRUD + deactivate + reactivate ✅ (G4 fixed)
- InventoryStatus: GET + PUT only (seed-only design) ✅
- Lookups: 9/9 endpoints ✅
- rowVersion optimistic locking: mock data ✅, form drawer passes it ✅, BE DTOs validate it ✅

---

## 4. Khuyến nghị

### 4.1 Không cần fix gì thêm
Module 2 là module sạch nhất — 0 CRITICAL issues sau khi fix G3/G4.

### 4.2 Cập nhật docs (không khẩn cấp)
Cập nhật `backend/docs/module-2-master-data.md` sections 6.7 và 6.8 để thêm endpoint `/reactivate` cho UOM và VehicleType cho đúng với code thực tế.

---

## 5. Trạng thái tổng thể Module 2

| Mục | Điểm |
|-----|------|
| API coverage | 100% (tất cả BE endpoints đều có FE tương ứng) |
| Data format alignment | 100% |
| Auth/header alignment | 100% |
| CRUD completeness | 100% (sau khi fix G3, G4) |
| rowVersion handling | 100% |
| **Tổng** | **✅ PASS — Sẵn sàng switch sang real BE** |
