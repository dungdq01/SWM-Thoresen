# Module 3 - Inventory Core FE Report

## 1. Mục tiêu frontend

Frontend Module 3 được dựng để phục vụ các luồng nghiệp vụ lõi của tồn kho:
- on-hand inquiry
- transaction history
- hold allocation
- posting / reversal workbench

UI bám theo API backend hiện có và full flow của Inventory Core Engine, với mục tiêu cho phép BA/QA/dev quan sát đúng inventory truth mà không sửa trực tiếp ledger.

---

## 2. Những gì đã làm

### 2.1 Routing và navigation
- Đã thêm route `/app/inventory-core`
- Đã tạo `InventoryCoreLayout`
- Đã thêm navigation module trong `AppSidebar`

### 2.2 Pages đã dựng
- `InventoryOnHandPage`
- `InventoryTransactionsPage`
- `InventoryHoldsPage`
- `InventoryPostingWorkbenchPage`

### 2.3 Data layer
- Đã tạo `domains/inventory-core/api/inventoryCore.api.js`
- Đã tạo `domains/inventory-core/hooks/useInventoryCore.js`
- Đã nối mock mode bằng `inventoryCoreMockApi`
- Đã chuyển sang runtime mock/API switch bằng `isMockApiEnabled()`

### 2.4 Các chức năng FE chính
- Query on-hand theo item / owner / warehouse / inventory status
- Query transaction ledger theo reference, trans type, correlation id
- Query và thao tác hold (create, release, cancel)
- Post inventory transaction thử nghiệm
- Reverse transaction thử nghiệm

---

## 3. Mock-data đã tạo

### 3.1 Datasets mock
- on-hand records
- inventory transactions
- inventory holds
- dimension joins từ Module 2 mock data

### 3.2 API mock đã hỗ trợ
- `GET /inventory/onhand`
- `GET /inventory/onhand/availability`
- `GET /inventory/transactions`
- `GET /inventory/transactions/:transId`
- `POST /inventory/postings`
- `POST /inventory/postings/reverse`
- `GET /inventory/holds`
- `POST /inventory/holds`
- `POST /inventory/holds/:holdId/release`
- `POST /inventory/holds/:holdId/cancel`

### 3.3 Runtime toggle hiện tại
- Có thể bật/tắt mock-data trực tiếp trên header web
- Trạng thái toggle được lưu qua `localStorage`
- Khi đổi chế độ, app reload để toàn bộ query chuyển nguồn dữ liệu

### 3.4 Nguồn tham chiếu
Mock được suy ra từ:
- `backend/docs/module-3-inventory-core.md`
- `docs/spec/module_3_inventory_core_engine_spec.md`
- `docs/report/module-3-inventory-core-report.md`

---

## 4. Mapping UI với API

| Màn hình | API/Hook chính | Trạng thái |
|---|---|---|
| On-hand | `useOnHandList`, `useAvailabilityCheck` | Đã dựng |
| Transactions | `useTransactionList`, `useTransactionDetail` | Đã dựng |
| Holds | `useHoldList`, `useCreateHold`, `useReleaseHold`, `useCancelHold` | Đã dựng |
| Workbench | `useCreatePosting`, `useReversePosting` | Đã dựng |

---

## 5. File frontend liên quan

### 5.1 Pages
- `src/pages/inventory-core/InventoryCoreLayout.jsx`
- `src/pages/inventory-core/InventoryOnHandPage.jsx`
- `src/pages/inventory-core/InventoryTransactionsPage.jsx`
- `src/pages/inventory-core/InventoryHoldsPage.jsx`
- `src/pages/inventory-core/InventoryPostingWorkbenchPage.jsx`

### 5.2 Domain
- `src/domains/inventory-core/api/inventoryCore.api.js`
- `src/domains/inventory-core/hooks/useInventoryCore.js`
- `src/domains/inventory-core/index.js`

### 5.3 Mock layer
- `src/mocks/inventoryCore.mock.js`
- phụ thuộc dimension mock từ `src/mocks/masterData.mock.js`

### 5.4 App integration
- `src/app/routes.jsx`
- `src/app/layouts/components/AppSidebar.jsx`
- `src/app/layouts/MainLayout.jsx`

---

## 6. Điểm còn mở

- Chưa verify response thật từ backend để chuẩn hóa tuyệt đối field naming ở tất cả page
- Chưa có detail drawer cho transaction/hold
- Chưa có reconciliation và snapshot UI
- Workbench hiện thiên về demo/test flow hơn là production console hoàn chỉnh

---

## 7. Kết luận

Frontend Module 3 hiện đã có xương sống hoàn chỉnh gồm route, navigation, data hooks, mock-data, runtime mock/API switch và 4 page cốt lõi. Với mock mode, module có thể được demo độc lập để review luồng on-hand, ledger, hold và posting/reversal trước khi backend integration hoàn tất hoàn toàn.
