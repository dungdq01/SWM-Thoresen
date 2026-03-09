# Module 5 - Outbound Operations FE Report

## 1. Mục tiêu frontend

Frontend Module 5 được dựng để mô phỏng và vận hành các flow nghiệp vụ outbound chính:
- Shipment planning / creation từ SO hoặc standalone
- Allocation-based hold (FIFO)
- Multi-trip weighing execution
- Tolerance check và PENDING_APPROVAL flow
- Manager approval / rejection
- Shipment closing

Mục tiêu là giúp BA/QA/dev review được đầy đủ vòng đời shipment từ `DRAFT` đến `SHIPPED` hoặc `CANCELLED`, đồng thời giữ rõ ranh giới giữa Module 5 và Module 3:
- Module 5 là operational gatekeeper của hàng xuất
- Module 3 mới là inventory ledger truth

---

## 2. Những gì đã làm

### 2.1 Routing và navigation
- Đã thêm route `/app/outbound-operations`
- Đã tạo `OutboundOperationsLayout`
- Đã thêm navigation Module 5 trong `AppSidebar`
- Đã thêm 4 sub-pages chính theo flow nghiệp vụ

### 2.2 Pages đã dựng
- `OutboundShipmentsPage` - Shipment planning & creation
- `OutboundAllocationPage` - Allocation-based hold (FIFO)
- `OutboundWeighingPage` - Multi-trip weighing execution
- `OutboundApprovalsPage` - Pending approvals & exception governance

### 2.3 Data layer
- Đã tạo `domains/outbound-operations/api/outboundOperations.api.js`
- Đã tạo `domains/outbound-operations/hooks/useOutboundOperations.js`
- Đã tạo `domains/outbound-operations/index.js`
- Đã nối runtime mock/API switch qua `isMockApiEnabled()`

### 2.4 Mock layer
- Đã tạo `src/mocks/outboundOperations.mock.js`
- Mock data reuse dimension references từ Module 2 (`owner`, `item`, `warehouse`, `location`)
- Mock flow có status history, weighing attempts, exception log và allocation records

---

## 3. Chức năng FE đã hỗ trợ

### 3.1 Shipment planning & creation
- List shipments với filter theo shipmentNumber / status / owner / warehouse
- Tạo nhanh shipment runtime theo nguyên tắc `1 shipment = 1 trip = 1 xe`
- Confirm shipment từ `DRAFT -> CONFIRMED`
- Cancel shipment với reason code

### 3.2 Allocation-based hold
- Theo dõi shipments ở state `CONFIRMED` và `ALLOCATED`
- Allocate shipment (auto FIFO allocation)
- Release allocation (unallocate)
- View allocation records per shipment line

### 3.3 Multi-trip weighing execution
- Theo dõi execution queue cho các state: `PICKED`, `WEIGHING_TARE`, `LOADING`, `ALL_WEIGHED`
- Ghi tare (xe rỗng)
- Ghi gross per line theo thứ tự tự do (flexible sequence)
- Tính net per line theo công thức: `net_line_1 = gross_1 - tare`, `net_line_N = gross_N - gross_(N-1)`
- Tolerance check per line ngay sau mỗi gross
- Ship shipment khi ALL_WEIGHED và all pass

### 3.4 Pending approvals & exception governance
- Query pending approvals list
- Hiển thị tolerance fail và exception details
- Cho phép WH_MANAGER approve (→ SHIPPED) với reason code
- Cho phép WH_MANAGER reject (→ CANCELLED) với reason code

---

## 4. Mapping UI với nghiệp vụ module

| Màn hình | Hook/API chính | Ý nghĩa nghiệp vụ |
|---|---|---|
| Shipments | `useOutboundShipments`, `useCreateOutboundShipment`, `useConfirmOutboundShipment` | Tạo và chuẩn bị shipment |
| Allocation | `useAllocateOutboundShipment`, `useUnallocateOutboundShipment`, `useOutboundAllocations` | Allocate stock theo FIFO |
| Weighing | `useRecordOutboundTare`, `useRecordOutboundGross`, `useShipOutboundShipment` | Multi-trip weighing & tolerance |
| Approvals | `useOutboundPendingApprovals`, `useApproveOutboundShipment`, `useRejectOutboundShipment` | Manager approval/rejection |

---

## 5. Mock-data đã tạo

### 5.1 Datasets mock
- Shipment headers với nhiều trạng thái (`DRAFT`, `ALLOCATED`, `PENDING_APPROVAL`, `SHIPPED`)
- Shipment lines với tolerance tracking
- Allocation records
- Weighing attempts (tare + gross per line)
- Exception logs

### 5.2 Flow mock đã hỗ trợ
- Create shipment
- Confirm shipment
- Allocate / unallocate
- Record tare
- Record gross per line + tolerance check
- Ship shipment
- Approve / reject pending approval

### 5.3 Dữ liệu tham chiếu
Mock tận dụng dimension từ:
- `src/mocks/masterData.mock.js`

---

## 6. File frontend liên quan

### 6.1 Pages
- `src/pages/outbound-operations/OutboundOperationsLayout.jsx`
- `src/pages/outbound-operations/OutboundShipmentsPage.jsx`
- `src/pages/outbound-operations/OutboundAllocationPage.jsx`
- `src/pages/outbound-operations/OutboundWeighingPage.jsx`
- `src/pages/outbound-operations/OutboundApprovalsPage.jsx`
- `src/pages/outbound-operations/index.js`

### 6.2 Domain
- `src/domains/outbound-operations/api/outboundOperations.api.js`
- `src/domains/outbound-operations/hooks/useOutboundOperations.js`
- `src/domains/outbound-operations/index.js`

### 6.3 Mock layer
- `src/mocks/outboundOperations.mock.js`

### 6.4 App integration
- `src/app/routes.jsx`
- `src/app/layouts/components/AppSidebar.jsx`

---

## 7. Điểm còn mở

- Chưa verify với backend thật để chốt tuyệt đối endpoint/query shape của Module 5
- Chưa có detail drawer chuyên sâu cho 1 shipment (line details, full history, audit before/after)
- Chưa có multi-line creation trong form tạo shipment (hiện chỉ hỗ trợ 1 line)
- Chưa có DPM dual tracking UI chi tiết
- Chưa có split shipment feature
- Chưa có short pick handling UI

---

## 8. Kết luận

Frontend Module 5 hiện đã có xương sống hoàn chỉnh để demo và review nghiệp vụ outbound:
- Route và sidebar navigation
- Mock-data runtime switch compatible
- Data hooks cho tất cả operations chính
- 4 page cốt lõi bám theo flow shipment lifecycle:
  - Shipments (planning & creation)
  - Allocation (FIFO hold)
  - Weighing (multi-trip execution)
  - Approvals (exception governance)

Với mock mode đang bật/tắt được trên header, Module 5 có thể được dùng để review nhanh planning, allocation, weighing, tolerance fail, approval và rejection trước khi backend integration hoàn tất đầy đủ.
