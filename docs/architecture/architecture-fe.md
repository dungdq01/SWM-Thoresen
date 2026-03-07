# Frontend Architecture for SWM TVL (Single-Tenant)

## 1. Mục tiêu tài liệu

Tài liệu này mô tả kiến trúc frontend mục tiêu cho hệ thống SWM TVL theo hướng:

- Single-tenant
- Modular frontend
- Fit với backend modular monolith đã chốt
- Dễ maintain
- Dễ scale cho team và codebase
- Hạn chế file rác, logic đặt sai chỗ, page phình to

Đây là tài liệu định hướng để team frontend thống nhất cách tổ chức code trước khi bắt đầu implementation.

---

## 2. Nguyên tắc kiến trúc

### 2.1 Single-tenant thực sự

Frontend **không** được thiết kế theo hướng multi-tenant SaaS.

Không có các khái niệm sau trong root architecture:

- `TenantProvider`
- `useTenant`
- `/:tenantId/*`
- `tenants.js`
- build URL theo `tenantId`

Scope của hệ thống hiện tại là:

- user
- role / permission
- warehouse
- owner data

Nói cách khác, hệ thống là **single-tenant application với warehouse scope**, không phải SaaS nhiều tenant.

### 2.2 Frontend phải phản chiếu đúng backend boundary

Frontend phải bám theo domain backend đã chốt:

- auth / foundation
- master-data
- inbound
- outbound
- inventory
- work
- billing
- reporting
- vas

Không tổ chức frontend theo kiểu generic business template như `tax`, `company`, `invoice` nếu backend không đi theo boundary đó.

### 2.3 Domain-first, feature-first, page-compose-only

Kiến trúc frontend phải tách rõ 3 lớp:

- `domains/`: business domain reusable
- `features/`: use case UI cụ thể
- `pages/`: entry point để compose màn hình

Quy tắc:

- `domains` chứa API hooks, model, mapper, domain component
- `features` chứa form flow, mutation flow, step flow, modal/drawer logic
- `pages` chỉ compose layout + widget + feature + domain block

### 2.4 Không để page trở thành “God file”

Page không được ôm:

- fetch logic phức tạp
- mutation orchestration lớn
- validation schema lớn
- table column business đặc thù
- modal flow nhiều bước

Những thứ đó phải được tách vào `domains/` hoặc `features/`.

### 2.5 Shared chỉ chứa thứ dùng chung thật sự

`shared/` chỉ dành cho:

- primitive UI
- reusable hooks không thuộc domain
- http client
- utility chung
- framework adapters

Không đưa component nghiệp vụ vào `shared/`.

Ví dụ:

Đúng:
- `shared/ui/button/Button.jsx`
- `shared/ui/modal/Modal.jsx`
- `shared/utils/date.js`

Sai:
- `shared/ui/ReceiptStatusBadge.jsx`
- `shared/components/ShipmentAllocationTable.jsx`

---

## 3. Kiểu kiến trúc đề xuất

Frontend nên đi theo hướng **modular monolith cho UI**, tức là:

- một application chính
- chia module rõ theo domain
- dùng chung design foundation và app shell
- không tách micro-frontend từ đầu

Lý do:

- phù hợp với phase hiện tại
- giảm chi phí coordination
- dễ onboarding
- dễ review
- phù hợp với quy mô team ban đầu

Micro-frontend không phải ưu tiên ở giai đoạn này.

---

## 4. Cấu trúc thư mục mục tiêu

```txt
frontend/
├── public/
│   ├── favicon.ico
│   └── index.html
│
├── src/
│   ├── main.jsx
│
│   ├── app/
│   │   ├── App.jsx
│   │   ├── routes.jsx
│   │   ├── providers/
│   │   │   ├── AuthProvider.jsx
│   │   │   ├── QueryProvider.jsx
│   │   │   ├── ThemeProvider.jsx
│   │   │   └── AppBootstrapProvider.jsx
│   │   ├── layouts/
│   │   │   ├── AppLayout.jsx
│   │   │   ├── AuthLayout.jsx
│   │   │   └── WarehouseLayout.jsx
│   │   ├── guards/
│   │   │   ├── RequireAuth.jsx
│   │   │   └── RequirePermission.jsx
│   │   └── router/
│   │       └── routeHelpers.js
│   │
│   ├── config/
│   │   ├── env.js
│   │   ├── constants.js
│   │   ├── navigation.js
│   │   └── permissions.js
│   │
│   ├── shared/
│   │   ├── api/
│   │   │   ├── httpClient.js
│   │   │   ├── interceptors.js
│   │   │   ├── queryClient.js
│   │   │   └── queryKeys.js
│   │   ├── ui/
│   │   │   ├── button/
│   │   │   ├── input/
│   │   │   ├── select/
│   │   │   ├── modal/
│   │   │   ├── table/
│   │   │   ├── drawer/
│   │   │   ├── feedback/
│   │   │   └── form/
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── usePermission.js
│   │   │   ├── useDebounce.js
│   │   │   ├── usePagination.js
│   │   │   └── useDisclosure.js
│   │   ├── utils/
│   │   │   ├── date.js
│   │   │   ├── money.js
│   │   │   ├── number.js
│   │   │   ├── file.js
│   │   │   └── download.js
│   │   ├── lib/
│   │   │   ├── dayjs.js
│   │   │   ├── zod.js
│   │   │   └── reactQuery.js
│   │   ├── constants/
│   │   └── styles/
│   │
│   ├── domains/
│   │   ├── auth/
│   │   ├── master-data/
│   │   ├── inbound/
│   │   ├── outbound/
│   │   ├── inventory/
│   │   ├── work/
│   │   ├── billing/
│   │   ├── reporting/
│   │   └── vas/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── inbound/
│   │   ├── outbound/
│   │   ├── inventory/
│   │   ├── work/
│   │   └── billing/
│   │
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── inbound/
│   │   ├── outbound/
│   │   ├── inventory/
│   │   ├── work/
│   │   ├── billing/
│   │   ├── reporting/
│   │   ├── master-data/
│   │   └── settings/
│   │
│   ├── widgets/
│   │   ├── app-shell/
│   │   ├── warehouse/
│   │   ├── filters/
│   │   └── notifications/
│   │
│   ├── assets/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
│
├── .env.example
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── README.md
```

---

## 5. Giải thích vai trò từng lớp

### 5.1 `app/`

Chứa các thành phần ở cấp ứng dụng:

- bootstrap app
- router
- providers
- layouts
- auth/permission guards
- route helper

`app/` không chứa business logic của inbound/outbound/inventory/work/billing.

### 5.2 `config/`

Chứa cấu hình tĩnh cấp app:

- env parsing
- constants ứng dụng
- cấu hình navigation
- permission map

Không đưa business constants đặc thù domain vào đây nếu chúng chỉ thuộc một domain.

### 5.3 `shared/`

Chứa thứ dùng chung thật sự cho toàn app.

#### `shared/api/`
- HTTP client
- interceptor
- react-query client
- query key convention chung

#### `shared/ui/`
- primitive UI component
- generic form primitives
- generic modal/drawer/table/feedback components

#### `shared/hooks/`
- hook dùng chung không thuộc domain

#### `shared/utils/`
- formatter và helper nhỏ

#### `shared/lib/`
- wrapper quanh thư viện ngoài

### 5.4 `domains/`

Phản chiếu trực tiếp domain của backend.

Một domain thường chứa:

- `api/`: gọi API của domain
- `hooks/`: query/mutation hook của domain
- `model/`: model hiển thị, enum, state constants
- `components/`: component mang tính domain nhưng tái sử dụng được
- `mappers/`: transform response sang UI model

Ví dụ `domains/inbound/` có thể chứa:

- `useReceiptList`
- `useReceiptDetail`
- `ReceiptStatusBadge`
- `ReceiptLinesTable`
- `receipt.mapper.js`

### 5.5 `features/`

`features/` là nơi chứa **use case UI cụ thể**.

Ví dụ:

- create receipt
- confirm receipt
- allocate shipment
- move inventory
- cycle count
- complete work line
- generate debit note

Một feature thường chứa:

- form component
- schema validation
- mutation orchestration
- drawer/modal logic
- UX state cục bộ của flow

### 5.6 `pages/`

Page chỉ là entry point của route.

Trách nhiệm của page:

- lấy route param
- mount layout
- compose widgets
- mount domain block
- mount feature block

Page không nên trở thành nơi chứa business logic lớn.

### 5.7 `widgets/`

Chứa các block UI cấp app hoặc page lớn hơn component domain thông thường.

Ví dụ:

- app shell
- sidebar
- topbar
- warehouse switcher
- notification panel
- filter bar dùng nhiều màn hình

---

## 6. Mapping với backend

Frontend và backend phải dùng cùng một ngôn ngữ domain.

### Backend modules
- auth / foundation
- master-data
- inventory-core
- inbound
- outbound
- inventory-control
- work
- billing
- reporting
- vas

### Frontend domains tương ứng
- auth
- master-data
- inbound
- outbound
- inventory
- work
- billing
- reporting
- vas

Lưu ý:

- FE không cần mirror hoàn toàn `inventory-core` như một route/module riêng cho user thao tác trực tiếp.
- FE có thể gom `inventory-core + inventory-control` thành `inventory/` ở tầng hiển thị.
- Nhưng khi trao đổi với BE, terminology vẫn phải khớp.

---

## 7. Chiến lược routing

### 7.1 Route design

Gợi ý route map:

```txt
/auth/login
/dashboard

/inbound/receipts
/inbound/receipts/new
/inbound/receipts/:id

/outbound/shipments
/outbound/shipments/new
/outbound/shipments/:id

/inventory/on-hand
/inventory/history
/inventory/move
/inventory/cycle-count

/work/queue
/work/:id

/billing/debit-notes
/billing/debit-notes/:id

/master-data/items
/master-data/owners
/master-data/locations

/reporting/...
/settings/...
```

Không dùng route kiểu `/:tenantId/...`.

### 7.2 Route composition

Mỗi route nên được compose theo pattern:

- guard
- layout
- page
- page mount domain components + feature components

### 7.3 Code splitting

Với các page nặng hoặc ít dùng:

- dùng lazy import theo route
- ưu tiên code split ở page level
- không split quá vụn ở component level trừ khi thực sự nặng

---

## 8. Chiến lược state management

Frontend của dự án này nên chia state thành 4 loại.

### 8.1 Server state

Dùng React Query cho:

- danh sách
- chi tiết chứng từ
- work queue
- inventory on-hand
- billing snapshots / debit notes
- master data lookup

Quy tắc:

- API fetch nên đi qua domain hooks
- page không gọi `fetch` trực tiếp
- query key phải thống nhất convention

### 8.2 Auth/session state

Dùng context/provider cho:

- current user
- token/session
- permission set cơ bản

### 8.3 Page state

Dùng local state cho:

- tab đang chọn
- modal open/close
- filter panel toggle
- local sorting / temporary draft nhỏ

### 8.4 Form state

Dùng form library thống nhất cho:

- create receipt
- create shipment
- inventory adjustment
- cycle count
- debit note generation

Validation nên dùng schema rõ ràng và đặt trong feature.

---

## 9. Chiến lược API và dữ liệu

### 9.1 Tất cả API theo domain

Không đặt API business vào `shared/api` ngoài HTTP base layer.

Đúng:
- `domains/inbound/api/inbound.api.js`
- `domains/work/api/work.api.js`

Sai:
- `shared/api/receipt.api.js`
- `shared/api/shipment.api.js`

### 9.2 Domain hooks là cửa vào chuẩn cho UI

Ví dụ:

- `useReceiptList()`
- `useReceiptDetail(id)`
- `useShipmentDetail(id)`
- `useWorkQueue(filters)`

Page và feature nên gọi domain hooks, không dựng request thô lặp lại.

### 9.3 Mapper ở domain

Response từ backend nên được normalize ở `mappers/` nếu cần.

Mục tiêu:

- UI không phụ thuộc chặt vào raw response shape
- dễ đổi contract nhỏ mà không đụng nhiều component

### 9.4 Query key convention

Nên chuẩn hóa ngay từ đầu.

Ví dụ:

```js
['inbound', 'receipt-list', filters]
['inbound', 'receipt-detail', receiptId]
['work', 'queue', filters]
['inventory', 'on-hand', filters]
['billing', 'debit-note-detail', id]
```

---

## 10. Chiến lược component

### 10.1 Primitive UI

Đặt ở `shared/ui/`.

Ví dụ:

- Button
- Input
- Select
- Modal
- Drawer
- DataTable
- Loader
- EmptyState
- ErrorState

### 10.2 Domain component

Đặt ở `domains/<domain>/components/`.

Ví dụ:

- `ReceiptStatusBadge`
- `ReceiptSummaryCard`
- `ShipmentHeader`
- `WorkLineCard`
- `InventoryStatusBadge`

### 10.3 Feature component

Đặt ở `features/<domain>/<feature>/`.

Ví dụ:

- `CreateReceiptForm`
- `ConfirmReceiptDialog`
- `AllocateShipmentDrawer`
- `CompleteWorkLineActionPanel`

### 10.4 Widget

Đặt ở `widgets/` nếu là block cấp app/page có thể tái sử dụng.

Ví dụ:

- `AppSidebar`
- `AppTopbar`
- `WarehouseSwitcher`
- `NotificationPanel`

---

## 11. Dependency rules

Đây là rule quan trọng để codebase không loạn.

### 11.1 Allowed import direction

```txt
pages    -> features, domains, widgets, shared
features -> domains, shared
domains  -> shared
widgets  -> shared, domains
shared   -> không import ngược lên trên
app      -> có thể compose pages/widgets/shared
```

### 11.2 Những điều không được phép

Không được:

- `shared` import từ `domains`, `features`, `pages`
- `domains` import từ `features`
- `domains` import chéo lẫn nhau bừa bãi nếu không có lý do rõ
- `pages` tự chứa hết business logic thay vì tách ra
- feature này import logic nội bộ của feature khác nếu chưa được chuẩn hóa

### 11.3 Rule thực dụng

Nếu một component chỉ dùng trong đúng một feature và gắn chặt với flow đó, nó phải ở `features/`, không đẩy lên `domains/` hay `shared/` quá sớm.

---

## 12. Ví dụ tổ chức một domain

### `domains/inbound/`

```txt
domains/inbound/
├── api/
│   └── inbound.api.js
├── hooks/
│   ├── useReceiptList.js
│   ├── useReceiptDetail.js
│   └── useReceiptMutations.js
├── model/
│   ├── receipt.model.js
│   └── receiptStatus.js
├── components/
│   ├── ReceiptStatusBadge.jsx
│   ├── ReceiptHeader.jsx
│   ├── ReceiptLinesTable.jsx
│   └── ReceiptSummaryCard.jsx
└── mappers/
    └── receipt.mapper.js
```

### `features/inbound/create-receipt/`

```txt
features/inbound/create-receipt/
├── CreateReceiptForm.jsx
├── CreateReceiptDrawer.jsx
├── createReceipt.schema.js
└── useCreateReceipt.js
```

---

## 13. Ví dụ trách nhiệm của page

### `pages/inbound/ReceiptDetailPage.jsx`

Page nên làm các việc sau:

- đọc `receiptId` từ route param
- gọi `useReceiptDetail(receiptId)`
- render `ReceiptHeader`, `ReceiptLinesTable`, `ReceiptSummaryCard`
- mount `ConfirmReceiptDialog` hoặc `RejectReceiptAction`
- gắn vào layout phù hợp

Page không nên làm:

- tự viết request axios/fetch
- tự parse raw response lớn
- tự chứa validation schema của confirm/reject flow
- tự dựng business state machine trong file page

---

## 14. Form strategy

Các form lớn phải đi theo pattern thống nhất.

### Áp dụng cho:

- create receipt
- create shipment
- move inventory
- cycle count
- adjust inventory
- generate debit note

### Pattern đề xuất

Mỗi feature form nên có:

- `Form.jsx`: UI form
- `schema.js`: validation schema
- `useFeatureName.js`: submit logic, mutation, error mapping

### Rule

- validation đặt trong feature
- mapping server error về form error đặt trong feature hook
- page không chứa submit orchestration của form lớn

---

## 15. Error handling và UX state

### 15.1 Loading / empty / error state

Mỗi page hoặc block dữ liệu phải có 3 trạng thái chuẩn:

- loading
- empty
- error

Dùng component generic trong `shared/ui/feedback/`.

### 15.2 Error normalization

HTTP/interceptor có thể normalize error format cơ bản, nhưng domain-specific error display phải nằm trong feature hoặc domain.

### 15.3 Permission-aware UI

Frontend phải hỗ trợ:

- ẩn action không có quyền
- disable action không hợp lệ theo trạng thái
- hiển thị guard rõ ràng ở route nhạy cảm

Permission guard ở cấp route không thay thế cho kiểm tra permission ở cấp action/button.

---

## 16. Testing strategy

### 16.1 Unit test

Dùng cho:

- util
- mapper
- small hooks
- validation schema
- pure UI logic nhỏ

### 16.2 Integration test

Dùng cho:

- feature form
- query + mutation flow
- page composition chính

### 16.3 E2E test

Ưu tiên cho critical flow:

- login
- create receipt
- confirm receipt
- create shipment
- ship shipment
- move inventory
- cycle count
- generate debit note

---

## 17. Performance strategy

Kiến trúc này vẫn scale tốt nếu áp dụng thêm các nguyên tắc sau:

- route-level lazy loading
- query caching hợp lý
- pagination cho list lớn
- debounce cho search/filter
- virtualization cho bảng lớn nếu cần
- tránh render lại bảng lớn không cần thiết

Không tối ưu sớm quá mức, nhưng phải để sẵn chỗ cho tối ưu khi volume tăng.

---

## 18. Những điều cố ý không làm ở phase hiện tại

Để tránh over-engineering, frontend **không** làm sớm các thứ sau nếu chưa có nhu cầu thật:

- multi-tenant routing
- micro-frontend
- design system package riêng
- state manager toàn cục nặng nếu React Query + context + local state là đủ
- app shell quá phức tạp

Mục tiêu phase hiện tại là:

- đúng domain
- đúng flow
- đúng boundary
- dễ maintain

---

## 19. Checklist khi tạo code mới

Trước khi tạo file mới, dev phải tự hỏi:

1. File này thuộc `shared`, `domain`, `feature`, `page` hay `widget`?
2. File này có thực sự có trách nhiệm riêng hay chỉ đang tách cho “đỡ dài file”?
3. Đây là logic reusable theo domain hay chỉ là logic của một use case?
4. Có đang đặt business component nhầm vào `shared/` không?
5. Page có đang ôm quá nhiều logic đáng lẽ phải tách ra không?
6. Import direction có vi phạm dependency rule không?

Nếu chưa trả lời rõ được 6 câu trên thì chưa nên tạo file mới.

---

## 20. Kết luận

Kiến trúc frontend được đề xuất cho SWM TVL là:

- single-tenant
- modular frontend
- domain-first
- feature-first
- page-compose-only
- fit với backend modular monolith
- đủ dễ maintain và đủ bền để scale ở các phase tiếp theo

Trọng tâm của kiến trúc này không phải là “folder đẹp”, mà là:

- đúng business boundary
- đúng flow placement
- tránh logic rải khắp app
- tránh file rác và component đặt sai chỗ
- giúp team frontend và backend nói cùng một ngôn ngữ domain

Nếu team giữ đúng các nguyên tắc trong tài liệu này, frontend sẽ dễ onboard, dễ review, dễ mở rộng và ít phải refactor lớn khi sản phẩm tăng trưởng.
