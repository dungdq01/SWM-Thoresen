# Module 4 - Inbound Operations FE Report

## 1. Mục tiêu frontend

Frontend Module 4 được dựng để mô phỏng và vận hành các flow nghiệp vụ inbound chính:
- receipt planning / creation
- weighbridge execution
- tolerance decision và exception governance
- putaway handoff / receipt closing

Mục tiêu là giúp BA/QA/dev review được đầy đủ vòng đời receipt từ `DRAFT` đến `CLOSED` hoặc `CANCELLED`, đồng thời giữ rõ ranh giới giữa Module 4 và Module 3:
- Module 4 là operational gatekeeper
- Module 3 mới là inventory ledger truth

---

## 2. Những gì đã làm

### 2.1 Routing và navigation
- Đã thêm route `/app/inbound-operations`
- Đã tạo `InboundOperationsLayout`
- Đã thêm navigation Module 4 trong `AppSidebar`
- Đã thêm 4 sub-pages chính theo flow nghiệp vụ

### 2.2 Pages đã dựng
- `InboundReceiptsPage`
- `InboundExecutionPage`
- `InboundExceptionsPage`
- `InboundPutawayPage`

### 2.3 Data layer
- Đã tạo `domains/inbound-operations/api/inboundOperations.api.js`
- Đã tạo `domains/inbound-operations/hooks/useInboundOperations.js`
- Đã tạo `domains/inbound-operations/index.js`
- Đã nối runtime mock/API switch qua `isMockApiEnabled()`

### 2.4 Mock layer
- Đã tạo `src/mocks/inboundOperations.mock.js`
- Mock data reuse dimension references từ Module 2 (`owner`, `vendor`, `item`, `warehouse`, `location`)
- Mock flow có status history, weigh logs, exception log và integration status

---

## 3. Chức năng FE đã hỗ trợ

### 3.1 Receipt planning & creation
- List inbound receipts với filter theo keyword / status / type / owner / warehouse / item
- Tạo nhanh receipt runtime theo nguyên tắc `1 receipt = 1 trip = 1 xe`
- Confirm receipt từ `DRAFT -> AWAITING_WEIGHING`

### 3.2 Weighbridge execution
- Theo dõi execution queue cho các state:
  - `AWAITING_WEIGHING`
  - `WEIGHED_IN`
  - `PROCESSING`
  - `WEIGHED_OUT`
  - `REJECTED`
- Ghi weigh-in (gross)
- Start processing từ `WEIGHED_IN`
- Ghi weigh-out (tare)
- Tính `net_weight`
- Trigger tolerance decision sau weigh-out
- Có luồng manual weight fallback với reason code / note

### 3.3 Exception & re-weigh governance
- Query exception list theo `status`, `severity`, `type`
- Hiển thị tolerance fail và manual weight trails
- Cho phép `re-weigh` với receipt đang `REJECTED`
- Cho phép `cancel` receipt ở các state còn hủy được
- Theo dõi max attempt tại frontend để review nhanh tình trạng escalation

### 3.4 Putaway handoff & closing
- Query queue cho receipt ở `RECEIVED` và `PUTAWAY`
- Tạo handoff giả lập sang M7
- Chuyển tiếp `RECEIVED -> PUTAWAY`
- Cho phép close tiếp `PUTAWAY -> CLOSED`
- Hiển thị integration status với M3 / M7 / M10 ở mức FE demo

---

## 4. Mapping UI với nghiệp vụ module

| Màn hình | Hook/API chính | Ý nghĩa nghiệp vụ |
|---|---|---|
| Receipts | `useInboundReceipts`, `useCreateInboundReceipt`, `useConfirmInboundReceipt` | Tạo và chuẩn bị receipt trước weighbridge |
| Execution | `useRecordInboundWeighIn`, `useStartInboundProcessing`, `useRecordInboundWeighOut`, `useApplyInboundManualWeight` | Điều phối weigh-in / processing / weigh-out / tolerance |
| Exceptions | `useInboundExceptions`, `useReweighInboundReceipt`, `useCancelInboundReceipt` | Xử lý tolerance fail, re-weigh và cancel governance |
| Putaway | `useInboundPutawayQueue`, `useCompleteInboundPutaway` | Handoff sang putaway và closing receipt |

---

## 5. Mock-data đã tạo

### 5.1 Datasets mock
- receipt headers nhiều trạng thái (`AWAITING_WEIGHING`, `REJECTED`, `RECEIVED`, `PUTAWAY`)
- receipt status history
- weighbridge logs
- exception logs
- integration status (M3/M7/M10)

### 5.2 Flow mock đã hỗ trợ
- create receipt
- confirm receipt
- weigh-in
- start processing
- weigh-out + tolerance pass/fail
- manual weight
- re-weigh
- cancel receipt
- putaway handoff / close receipt

### 5.3 Dữ liệu tham chiếu
Mock tận dụng dimension từ:
- `src/mocks/masterData.mock.js`

---

## 6. File frontend liên quan

### 6.1 Pages
- `src/pages/inbound-operations/InboundOperationsLayout.jsx`
- `src/pages/inbound-operations/InboundReceiptsPage.jsx`
- `src/pages/inbound-operations/InboundExecutionPage.jsx`
- `src/pages/inbound-operations/InboundExceptionsPage.jsx`
- `src/pages/inbound-operations/InboundPutawayPage.jsx`
- `src/pages/inbound-operations/index.js`

### 6.2 Domain
- `src/domains/inbound-operations/api/inboundOperations.api.js`
- `src/domains/inbound-operations/hooks/useInboundOperations.js`
- `src/domains/inbound-operations/index.js`

### 6.3 Mock layer
- `src/mocks/inboundOperations.mock.js`

### 6.4 App integration
- `src/app/routes.jsx`
- `src/app/layouts/components/AppSidebar.jsx`

---

## 7. Điểm còn mở

- Chưa verify với backend thật để chốt tuyệt đối endpoint/query shape của Module 4
- Một số API query như `exceptions`, `putaway-queue`, `weigh-logs` đang đi theo FE contract giả lập để phục vụ demo/mock mode
- Chưa có detail drawer chuyên sâu cho 1 receipt (line details, full history, audit before/after)
- Chưa có OCR-assisted candidate matching UI chi tiết cho vessel flow
- Chưa có validation mức form sâu như rule bagged over-receipt hoặc permission-based disable theo role

---

## 8. Kết luận

Frontend Module 4 hiện đã có xương sống hoàn chỉnh để demo và review nghiệp vụ inbound:
- route
- sidebar navigation
- mock-data runtime switch compatible
- data hooks
- 4 page cốt lõi bám theo flow receipt lifecycle

Với mock mode đang bật/tắt được trên header, Module 4 có thể được dùng để review nhanh planning, weighing, tolerance fail, re-weigh và putaway handoff trước khi backend integration hoàn tất đầy đủ.
