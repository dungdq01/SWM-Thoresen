# SWM TVL — Project Handoff Document for UI Development

> **Mục đích**: File này tổng hợp toàn bộ thông tin cần thiết để một AI agent hoặc developer bên ngoài có thể hiểu và phát triển giao diện cho hệ thống SWM TVL mà không cần đọc toàn bộ codebase.
>
> **Cập nhật lần cuối**: 2026-03-25

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Thông tin chung

| Mục | Chi tiết |
|-----|---------|
| **Dự án** | Smart Warehouse Management (SWM) |
| **Khách hàng** | Thoresen Vinama Logistics (TVL) |
| **Quy mô** | ~81,500 m² kho bãi (11 nhà kho: WH5.1 → WH5.6.2) |
| **Nghiệp vụ chính** | Nhận hàng rời (bulk cargo) từ cảng biển → Lưu kho → Phân phối nội địa |
| **Loại hàng** | Hàng rời (bulk), hàng bao (bagged), jumbo bag, container, pallet |
| **Đặc thù** | Không có barcode/RFID — trọng lượng xác định hoàn toàn qua trạm cân (weighbridge) |

### 1.2 Đặc điểm nghiệp vụ quan trọng

- **Hàng rời là chủ đạo**: Không quét mã vạch, mọi thứ dựa trên cân nặng
- **Trạm cân (Weighbridge)** là nguồn xác nhận khối lượng thực tế
- **Dual inbound**: Nhận từ tàu (vessel, B/L-based) + Nhận từ xe (pre-registered)
- **Tồn kho = InventTrans ledger**: Chứng từ (PO, Receipt, Shipment) chỉ là context, nguồn sự thật là InventDim → InventTrans → OnHand
- **Billing phụ thuộc transaction truth**: Phí lưu kho tính theo snapshot tồn kho hàng ngày

### 1.3 Nguồn doanh thu (Fee Types)

| Loại phí | Mô tả | Trigger |
|----------|-------|---------|
| **Storage Fee** | Phí lưu kho theo ngày, tính từ snapshot tồn kho EOD | Period-based (daily batch) |
| **Handling Fee** | Phí xếp dỡ, tính theo sự kiện nhập/xuất | Event-based (on receipt/ship) |
| **Bagging Fee** | Phí đóng bao + vật tư | Event-based (work order completion) |
| **Other Fees** | Pha trộn, chuyển nội bộ, tái chế, QA... | Manual hoặc event-based |

---

## 2. TECH STACK

### 2.1 Backend

| Thành phần | Công nghệ |
|-----------|-----------|
| **Framework** | NestJS 10.x (TypeScript) |
| **ORM** | Prisma 5.x |
| **Database** | PostgreSQL |
| **Auth** | JWT (access + refresh token) |
| **API Style** | REST, Swagger/OpenAPI |
| **OCR** | Google Cloud Vision + Gemini AI |
| **Architecture** | Modular Monolith |

### 2.2 Frontend (hiện tại)

| Thành phần | Công nghệ |
|-----------|-----------|
| **Framework** | React 18 + Vite 5 |
| **Routing** | React Router v6 |
| **State Management** | TanStack React Query v5 (server state) + React Context (auth) + Local state |
| **Styling** | TailwindCSS 3.4 |
| **Forms** | React Hook Form + Zod validation |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Animation** | Framer Motion |
| **HTTP Client** | Axios |
| **Date** | Day.js |
| **3D Visualization** | React Three Fiber + Drei |
| **Mobile** | Capacitor (Android/iOS) |
| **Toast** | React Hot Toast |

### 2.3 Backend API Base

```
Base URL: http://localhost:3000/api/v1
Auth: Bearer JWT token
Swagger: http://localhost:3000/api/docs
```

---

## 3. HỆ THỐNG MODULE (11 modules)

### 3.1 Bản đồ module

```
┌─────────────────────────────────────────────────────────────────┐
│                    M0. Auth & User Management                   │
├─────────────────────────────────────────────────────────────────┤
│  M1. Foundation    │  M2. Master Data    │  M8. Integration     │
│  & Governance      │  Management         │  Platform (Weighbridge│
│                    │                     │  + OCR + Mobile Sync) │
├────────────────────┼─────────────────────┼──────────────────────┤
│  M4. Inbound       │  M3. Inventory      │  M5. Outbound        │
│  Operations        │  Core Engine        │  Operations          │
├────────────────────┼─────────────────────┼──────────────────────┤
│  M6. Inventory     │  M7. Work           │  M9. VAS / Bagging   │
│  Control           │  Execution          │  Operations          │
├─────────────────────────────────────────────────────────────────┤
│  M10. Billing & Commercial Control                              │
├─────────────────────────────────────────────────────────────────┤
│  M11. Reporting, Audit & Go-Live Control                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Chi tiết từng module

#### M0. Auth & User Management
- **Mục đích**: Xác thực, phân quyền RBAC, quản lý session
- **Entities**: AppUser, Role, Permission, RolePermission, UserRole, AuthSession, AuthRefreshToken, AuthLoginAttempt, AuthSecurityEvent, AuthAccountLock
- **Roles hệ thống**: ADMIN, WH_MANAGER, WH_KEEPER, WB_OPERATOR, OPS_SUPER, BILLING_OFC, GOVERNANCE_MANAGER, CUST_VIEWER
- **API prefix**: `/api/v1/auth/*`

#### M1. Foundation & Governance
- **Mục đích**: Cấu hình hệ thống, audit trail, number sequence, business rules
- **Entities**: NumberSequence, BusinessRuleCatalog, DecisionLog, ChangeControlRecord, AuditLog, ExceptionLog, IdempotencyRecord, ReasonCode
- **API prefix**: `/api/v1/foundation/*`

#### M2. Master Data Management
- **Mục đích**: Quản lý dữ liệu nền tảng
- **Entities chính**:
  - **Kho**: MdWarehouse, MdZone, MdLocation, MdLocationType
  - **Chủ hàng**: MdOwner, MdOwnerWarehouseAccess, MdOwnerItemPolicy, MdOwnerSkuMapping
  - **Hàng hóa**: MdItem, MdItemGroup, MdItemIncompatibility, MdLot, Lot
  - **Đối tác**: MdVendor, MdCustomer, MdCarrier, MdVessel
  - **Đơn vị**: MdUom, MdUomConversion
  - **Vận chuyển**: MdVehicleType
  - **Dịch vụ**: MdServiceCode, MdDayType, MdRateReference
  - **Import**: MdImportBatch, MdImportBatchLine, MdImportError
  - **Config**: DropdownConfig, MdInventoryStatus
- **API prefix**: `/api/v1/master-data/*`

#### M3. Inventory Core Engine
- **Mục đích**: Ghi nhận biến động tồn kho (ledger), tính toán on-hand
- **Entities**: InventDim, InventTrans, OnHand, InventoryHold, InventoryReversalLink, InventoryReconciliationRun/Result, InventorySnapshotRun, DailyStorageSnapshot, InventoryEventMapping
- **Nguyên tắc**: Ledger bất biến — mọi correction qua Reverse (tạo trans ngược)
- **On-Hand formula**: available_qty = physical_qty - reserved_qty
- **API prefix**: `/api/v1/inventory-core/*`

#### M4. Inbound Operations (Nhập kho)
- **Mục đích**: Quản lý luồng nhập kho từ PO → Receipt → Weighing → Received
- **Entities**: PurchaseOrder, PurchaseOrderLine, PurchaseOrderWarehouse, ReceiptHeader, ReceiptLine, ReceiptWeighingLog, InboundDocument, ReceiptStatusHistory, ReceiptExceptionLog, ReceiptIntegrationState
- **State machine Receipt**: DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT → RECEIVED (post tồn kho)
- **Đặc biệt**: Tolerance check, REJECTED → re-weigh (max 3 lần), cancel ở WEIGHED_IN/PROCESSING
- **API prefix**: `/api/v1/inbound/*`

#### M5. Outbound Operations (Xuất kho)
- **Mục đích**: Quản lý luồng xuất kho từ SO → Shipment → Allocation → Weighing → Shipped
- **Entities**: SalesOrder, SalesOrderLine, SalesOrderStatusHistory, ShipmentHeader, ShipmentLine, ShipmentStatusHistory, ShipmentExceptionLog, ShipmentPickWorkLink, ShipmentPostingLink, ShipmentSoLink, OutboundDocument
- **State machine Shipment**: DRAFT → CONFIRMED → ALLOCATED → PICKING → PICKED → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT → SHIPPED
- **Đặc biệt**: Allocation-based hold, flexible weighing sequence, bulk surplus blocking
- **API prefix**: `/api/v1/outbound/*`, `/api/v1/sales-orders/*`

#### M6. Inventory Control
- **Mục đích**: Di chuyển, chuyển kho, thay đổi trạng thái, kiểm kê, điều chỉnh
- **Entities**: IcMoveOrder/Line, IcTransferOrder/Line, IcInventoryStatusChange, IcCycleCountPlan/Header/Line, IcAdjustmentHeader/Line, IcReconciliationReview, IcDocumentStatusHistory, IcExceptionLog
- **API prefix**: `/api/v1/inventory-control/*`

#### M7. Work Execution & Mobile
- **Mục đích**: Phân công và thực thi công việc kho (putaway, pick, move, count)
- **Entities**: WeWorkHeader, WeWorkLine, WeWorkAssignmentHistory, WeWorkStatusHistory, WeWorkPostingLink, WeWorkEventLog, WeWorkException, WeMobileSyncBatch, WeMobileSyncEvent, WeWorkOutboxEvent
- **API prefix**: `/api/v1/work-execution/*`

#### M8. Weighbridge, OCR & Integration
- **Mục đích**: Tích hợp trạm cân, OCR phiếu cân, đồng bộ mobile, push ERP
- **Entities**: M8WeighbridgeDevice/Log/EventState, M8OcrResult/ConfirmedSnapshot, M8MobileSyncBatch/Event, M8ErpPushLog, M8IntegrationAlert, M8ChannelHealthSnapshot, M8DeviceHeartbeat
- **OCR**: Quét phiếu cân → parse trọng lượng, biển số xe, sản phẩm → auto-link PO/SO
- **API prefix**: `/api/v1/integration-platform/*`

#### M9. VAS / Bagging Operations
- **Mục đích**: Dịch vụ giá trị gia tăng — đóng bao, pha trộn
- **Entities**: VasWorkOrder, VasSession, VasStateHistory, VasExceptionLog, VasOutbox
- **API prefix**: `/api/v1/vas/*`

#### M10. Billing & Commercial Control
- **Mục đích**: Tính phí, tạo debit note, quản lý hợp đồng
- **Entities**: BilContract, BilContractFeeLine, BilDayTypeCalendar, BilEvent, BilSnapshotRun, BilStorageSnapshot, BilDebitNote, BilDebitNoteLine, BilDebitNoteHistory, BilException, BilErpPushOutbox/Log
- **API prefix**: `/api/v1/billing/*`

#### M11. Reporting, Audit & Go-Live
- **Mục đích**: Báo cáo, đối soát, kiểm tra go-live
- **Entities**: RptReportCatalog, RptReconciliationCheck/Run/Result/Resolution, RptExportJob/Event, RptGoLiveGate/StatusRecord/SignoffHistory, RptReportRunLog, RptDashboardCache
- **API prefix**: `/api/v1/reporting/*`

#### Goods Split (feature bổ sung)
- **Mục đích**: Chia hàng đổi chủ sở hữu
- **Entities**: GoodsSplitHeader, GoodsSplitDetail, GoodsSplitTransaction
- **API prefix**: `/api/v1/goods-split/*`

---

## 4. SITEMAP & ROUTES

### 4.1 Cấu trúc route

Tất cả route sau khi login đều nằm dưới `/app/*`. Layout chung là MainLayout (sidebar + header + content area).

```
/                           → Landing page (public)
/login                      → Đăng nhập
/app                        → Dashboard (tổng quan)
/app/warehouse-monitoring   → Giám sát kho 3D

/app/settings/
  ├── roles                 → Quản lý vai trò
  ├── permissions           → Quản lý quyền
  ├── number-sequences      → Chuỗi số tự động
  ├── governance            → Business rules & decisions
  ├── logs                  → Audit logs
  ├── dropdown-config       → Cấu hình dropdown
  └── users                 → Quản lý người dùng

/app/master-data/
  ├── owners                → Chủ hàng
  ├── vendors               → Nhà cung cấp
  ├── customers             → Khách hàng
  ├── items                 → Hàng hóa / SKU
  ├── item-groups           → Nhóm hàng hóa
  ├── warehouses            → Kho
  ├── warehouses/:id        → Chi tiết kho (zones + locations)
  ├── zones                 → Khu vực kho
  ├── locations             → Vị trí kho
  ├── location-types        → Loại vị trí
  ├── uoms                  → Đơn vị tính
  ├── uom-conversions       → Quy đổi đơn vị
  ├── vehicle-types         → Loại phương tiện
  ├── inventory-statuses    → Trạng thái tồn kho
  ├── carriers              → Đơn vị vận chuyển
  ├── vessels               → Tàu
  ├── lots                  → Lô hàng
  ├── owner-sku-mappings    → Mapping SKU theo chủ hàng
  ├── owner-warehouse-access → Quyền truy cập kho theo chủ hàng
  ├── item-incompatibilities → Hàng không tương thích
  └── reason-codes          → Mã lý do

/app/inventory-core/
  ├── on-hand               → Tồn kho hiện tại
  ├── transactions          → Lịch sử giao dịch tồn kho
  ├── holds                 → Hàng bị giữ/lock
  ├── workbench             → Posting workbench
  ├── reconciliation        → Đối soát tồn kho
  └── snapshots             → Snapshot billing hàng ngày

/app/inbound-operations/
  ├── purchase-orders       → Đơn mua hàng (PO)
  ├── receipts              → Phiếu nhập kho
  ├── unloading             → Dỡ hàng
  └── documents             → Chứng từ nhập kho

/app/outbound-operations/
  ├── sales-orders          → Đơn bán hàng (SO)
  ├── shipments             → Phiếu xuất kho
  ├── loading               → Xếp hàng
  └── documents             → Chứng từ xuất kho

/app/goods-split            → Chia hàng đổi chủ

/app/inventory-control/
  ├── move-orders           → Lệnh di chuyển nội bộ
  ├── transfers             → Lệnh chuyển kho
  ├── status-change         → Thay đổi trạng thái tồn
  ├── cycle-count           → Kiểm kê
  ├── adjustments           → Điều chỉnh tồn kho
  └── history               → Lịch sử di chuyển

/app/work-execution/
  ├── queue                 → Hàng đợi công việc
  ├── my-work               → Việc của tôi
  ├── execute               → Thực thi công việc
  └── monitor               → Giám sát công việc

/app/weighbridge            → Trạm cân

/app/integration/
  ├── monitoring            → Giám sát tích hợp
  ├── alerts                → Cảnh báo
  └── channels              → Kênh kết nối

/app/ocr                    → Quét phiếu cân (OCR)
/app/ocr/:id                → Chi tiết kết quả OCR

/app/vas/
  ├── work-orders           → Lệnh VAS (đóng bao)
  ├── execution             → Thực thi VAS
  └── dashboard             → Dashboard VAS

/app/billing/
  ├── invoices              → Debit notes / Hóa đơn
  ├── rate-cards            → Biểu phí
  ├── events                → Sự kiện tính phí
  └── dashboard             → Dashboard billing

/app/reporting/
  ├── dashboard             → Dashboard báo cáo
  ├── inventory             → Báo cáo tồn kho
  ├── billing               → Báo cáo billing
  ├── audit                 → Audit trail
  ├── reconciliation        → Đối soát
  └── go-live               → Go-live checklist
```

---

## 5. ROLES & PERMISSIONS (RBAC)

### 5.1 Vai trò hệ thống

| Role Code | Tên tiếng Việt | Mô tả |
|-----------|----------------|-------|
| `ADMIN` | Quản trị viên | Toàn quyền hệ thống |
| `WH_MANAGER` | Quản lý kho | Quản lý vận hành kho, phê duyệt ngoại lệ |
| `WH_KEEPER` | Thủ kho | Nhận hàng, xuất hàng, kiểm kê, di chuyển |
| `WB_OPERATOR` | Vận hành cân | Vận hành trạm cân, xác nhận trọng lượng |
| `OPS_SUPER` | Giám sát vận hành | Giám sát, báo cáo, xem toàn bộ |
| `BILLING_OFC` | Nhân viên billing | Quản lý hợp đồng, tạo debit note |
| `GOVERNANCE_MANAGER` | Quản lý governance | Business rules, audit, go-live |
| `CUST_VIEWER` | Khách hàng | Xem tồn kho, báo cáo của mình |

### 5.2 Permission model

```
Permission code format: {module}.{resource}.{action}
Ví dụ: inbound.receipt.create, outbound.shipment.confirm, billing.debit-note.lock
```

- Permission-aware UI: ẩn action không có quyền, disable action không hợp lệ theo trạng thái
- Route-level guard + action-level check

---

## 6. KIẾN TRÚC FRONTEND

### 6.1 Nguyên tắc

- **Single-tenant** (không multi-tenant)
- **Modular frontend**: domain-first, feature-first, page-compose-only
- **Dependency direction**: `pages → features → domains → shared` (không import ngược)

### 6.2 Cấu trúc thư mục

```
frontend/src/
├── main.jsx                    # Entry point
├── app/                        # App shell: routes, layouts, providers, guards
│   ├── App.jsx
│   ├── routes.jsx              # All route definitions
│   ├── layouts/
│   │   ├── MainLayout.jsx      # Sidebar + Header + Content
│   │   └── components/
│   │       ├── AppSidebar.jsx  # Navigation sidebar
│   │       └── MobileBottomNav.jsx
│   └── providers/
│       ├── AuthProvider.jsx
│       └── QueryProvider.jsx
│
├── domains/                    # Business domain: API, hooks, models, reusable components
│   ├── auth/                   # Login, token, permission hooks
│   ├── master-data/            # MD CRUD hooks & components
│   ├── inbound-operations/     # Receipt hooks & components
│   ├── outbound-operations/    # Shipment hooks & components
│   ├── inventory-core/         # OnHand, InventTrans hooks
│   ├── inventory-control/      # Move, Transfer, CycleCount hooks
│   ├── work-execution/         # Work queue hooks
│   ├── integration/            # Weighbridge, OCR hooks
│   ├── billing/                # Contract, DebitNote hooks
│   ├── reporting/              # Report hooks
│   ├── vas/                    # VAS hooks
│   ├── sales-orders/           # SO hooks
│   └── goods-split/            # Goods split hooks
│
├── features/                   # Use case UI: forms, flows, modals
│   └── (organized by domain)
│
├── pages/                      # Route entry points — compose domains + features
│   ├── auth/
│   ├── dashboard/
│   ├── settings/
│   ├── master-data/
│   ├── inventory-core/
│   ├── inbound-operations/
│   ├── outbound-operations/
│   ├── inventory-control/
│   ├── work-execution/
│   ├── integration/
│   ├── vas/
│   ├── billing/
│   ├── reporting/
│   ├── goods-split/
│   ├── warehouse-monitoring/
│   └── landing/
│
└── shared/                     # Primitive UI, hooks, utils, http client
    ├── ui/                     # Button, Input, Select, Modal, Table, Badge...
    ├── hooks/                  # useAuth, useDebounce, usePagination, usePlatform...
    ├── lib/                    # dayjs, cn (class merge), capacitor
    ├── api/                    # httpClient (axios), queryClient
    ├── utils/                  # Formatters, helpers
    ├── styles/                 # Global CSS, Tailwind config
    ├── guided-tour/            # Onboarding tour
    └── command-search/         # Command palette (Ctrl+K)
```

### 6.3 Pattern chung cho mỗi domain

```
domains/{domain}/
├── api/
│   └── {domain}.api.js         # API endpoints (axios calls)
├── hooks/
│   ├── use{Entity}List.js      # React Query list hook
│   ├── use{Entity}Detail.js    # React Query detail hook
│   └── use{Entity}Mutations.js # Create/Update/Delete mutations
├── model/
│   └── {entity}.model.js       # Constants, enums, status maps
└── components/
    └── {Entity}StatusBadge.jsx  # Reusable domain components
```

### 6.4 UI Framework & Design System

- **TailwindCSS** với custom CSS variables cho theming (light/dark mode)
- **Color tokens**: `--color-bg-card`, `--color-text-primary`, `--color-text-secondary`, `--color-ice` (brand color)
- **Component library tự build** trong `shared/ui/`: Button, Input, Select, Modal, Drawer, Table, Badge, Switch, Tabs, Tooltip...
- **Icons**: Lucide React (consistent icon set)
- **Responsive**: Desktop-first + mobile support qua Capacitor
- **Dark mode**: Supported, toggle via `useDarkMode` hook

---

## 7. LUỒNG NGHIỆP VỤ CHÍNH

### 7.1 Luồng nhập kho (Inbound)

```
1. Tạo PO (Purchase Order)
   → Nhập thông tin: Owner, Vendor, Vessel/BL, Items + Qty
   
2. Tạo Receipt từ PO
   → Receipt header link PO
   → Receipt lines kế thừa PO lines
   
3. Xe vào cổng → Cân vào (Weigh In)
   → Weighbridge ghi gross weight
   → Receipt: DRAFT → AWAITING_WEIGHING → WEIGHED_IN
   
4. Dỡ hàng (Unloading/Processing)
   → Xác nhận vị trí kho
   → Receipt: WEIGHED_IN → PROCESSING
   
5. Xe ra cổng → Cân ra (Weigh Out)
   → Weighbridge ghi tare weight
   → Net weight = Gross - Tare
   → Receipt: PROCESSING → WEIGHED_OUT
   
6. Tolerance check
   → Net weight vs PO expected qty
   → Trong tolerance → RECEIVED (auto post InventTrans)
   → Ngoài tolerance → REJECTED → re-weigh (max 3 lần) hoặc cancel
   
7. Post tồn kho
   → Tạo InventTrans với qty = net weight
   → Cập nhật OnHand
```

### 7.2 Luồng xuất kho (Outbound)

```
1. Tạo SO (Sales Order)
   → Nhập thông tin: Owner, Customer, Items + Qty

2. Tạo Shipment từ SO
   → Shipment header link SO
   → Shipment lines kế thừa SO lines

3. Allocation
   → Gán tồn kho cụ thể (location + qty) cho shipment lines
   → Tạo reserved_qty trên OnHand

4. Picking
   → Work Execution tạo pick work
   → Nhân viên kho pick hàng từ location

5. Xe vào cổng → Cân vào (Weigh In)
   → Ghi tare weight

6. Loading + Cân ra (Weigh Out)
   → Load hàng lên xe
   → Ghi gross weight
   → Net weight = Gross - Tare

7. Tolerance check + Ship
   → SHIPPED → post InventTrans (giảm tồn)
   → Trường hợp surplus → BLOCK mặc định, Manager override
```

### 7.3 Luồng OCR phiếu cân

```
1. Upload/Chụp ảnh phiếu cân
2. Google Vision API → extract text
3. Gemini AI → parse fields (trọng lượng, biển số, sản phẩm, B/L...)
4. Field parser → normalize data (Vietnamese formats)
5. Auto-link → tìm PO/SO phù hợp → tạo Receipt/Shipment tự động
6. User review → confirm/edit → finalize
```

---

## 8. DATA MODEL — CÁC ENTITY CHÍNH

### 8.1 Tổng quan (~140 models)

| Nhóm | Số lượng | Models tiêu biểu |
|------|---------|-------------------|
| Auth | 7 | AppUser, Role, Permission, AuthSession... |
| Foundation | 8 | NumberSequence, AuditLog, ReasonCode... |
| Master Data | 22 | MdOwner, MdItem, MdWarehouse, MdLocation... |
| Inventory Core | 9 | InventDim, InventTrans, OnHand, DailyStorageSnapshot... |
| Inbound | 8 | PurchaseOrder/Line, ReceiptHeader/Line, InboundDocument... |
| Outbound | 10 | SalesOrder/Line, ShipmentHeader/Line, OutboundDocument... |
| Inventory Control | 10 | IcMoveOrder, IcTransferOrder, IcCycleCount... |
| Work Execution | 10 | WeWorkHeader/Line, WeMobileSyncBatch... |
| Integration | 8 | M8WeighbridgeDevice/Log, M8OcrResult... |
| VAS | 5 | VasWorkOrder, VasSession... |
| Billing | 12 | BilContract, BilDebitNote, BilStorageSnapshot... |
| Reporting | 11 | RptReportCatalog, RptGoLiveGate... |
| Goods Split | 3 | GoodsSplitHeader/Detail/Transaction |

### 8.2 Entity quan trọng — InventTrans (ledger tồn kho)

```
InventTrans {
  id, transCode, inventDimId,
  transDirection: INBOUND | OUTBOUND | ADJUSTMENT | TRANSFER | REVERSAL,
  transType: RECEIPT | SHIPMENT | MOVE | ADJUSTMENT | COUNT | REVERSAL | INITIAL,
  physicalQty, reservedQty, uomCode,
  referenceType, referenceId, referenceLineId,
  postingDate, isPosted, isReversed, reversedById,
  warehouseCode, ownerId, itemId,
  createdBy, createdAt
}
```

### 8.3 Entity quan trọng — OnHand (tồn kho hiện tại)

```
OnHand {
  id, inventDimId,
  physicalQty,    -- Tồn thực tế
  reservedQty,    -- Đang giữ cho outbound
  availableQty,   -- = physical - reserved
  uomCode,
  warehouseCode, ownerId, itemId, locationCode,
  lastTransDate
}
```

---

## 9. UI/UX GUIDELINES

### 9.1 Nguyên tắc chung

- **Ngôn ngữ mặc định**: Tiếng Việt — rõ ràng, ngắn gọn, thân thiện
- **Định dạng số**: Theo chuẩn VN (dấu chấm phân cách hàng nghìn, dấu phẩy thập phân khi cần)
- **Định dạng ngày**: DD/MM/YYYY hoặc DD/MM/YYYY HH:mm
- **Font weight**: Ưu tiên đọc rõ, scan nhanh
- **Density**: Phù hợp desktop — data-rich, nhưng không quá chật

### 9.2 Trạng thái bắt buộc cho mọi UI

Mọi màn hình data phải có xử lý cho:
1. **Loading** — Skeleton hoặc spinner
2. **Empty** — Thông báo + hướng dẫn hành động tiếp theo
3. **Error** — Mô tả lỗi + cách khắc phục
4. **Success** — Xác nhận kết quả
5. **Disabled** — Giải thích vì sao không thao tác được

### 9.3 Pattern chung cho trang danh sách

```
┌──────────────────────────────────────────┐
│ Page Title                    [+ Tạo mới]│
├──────────────────────────────────────────┤
│ [Search] [Filter: Status ▼] [Filter: Owner ▼] │
├──────────────────────────────────────────┤
│ Table                                     │
│ ┌──────┬──────┬────────┬────────┬──────┐ │
│ │ Mã   │ Tên  │ Trạng  │ Ngày   │ ••• │ │
│ │      │      │ thái   │ tạo    │     │ │
│ ├──────┼──────┼────────┼────────┼──────┤ │
│ │ ...  │ ...  │ Badge  │ ...    │ Menu│ │
│ └──────┴──────┴────────┴────────┴──────┘ │
├──────────────────────────────────────────┤
│ Pagination: [◀] 1 2 3 ... 10 [▶]        │
└──────────────────────────────────────────┘
```

### 9.4 Pattern chung cho trang chi tiết

```
┌──────────────────────────────────────────┐
│ [← Back] Entity Code    StatusBadge      │
│          Entity Name                     │
├──────────────────────────────────────────┤
│ [Tab: Thông tin] [Tab: Lines] [Tab: History] │
├──────────────────────────────────────────┤
│ Detail Content / Form / Table             │
├──────────────────────────────────────────┤
│ Action Bar: [Xác nhận] [Hủy] [Sửa]      │
└──────────────────────────────────────────┘
```

---

## 10. BACKEND API CONVENTIONS

### 10.1 Response format chung

```json
// List response
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}

// Single item response
{
  "data": { ... }
}

// Error response
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 10.2 Query params cho danh sách

```
GET /api/v1/{module}/{resource}?page=1&limit=20&search=keyword&sortBy=createdAt&sortOrder=desc&status=ACTIVE&ownerId=xxx
```

### 10.3 Auth headers

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

---

## 11. STATE MACHINES — CÁC TRẠNG THÁI QUAN TRỌNG

### 11.1 Receipt (Phiếu nhập)

```
DRAFT → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT → RECEIVED
                                                                    → REJECTED → re-weigh
Bất kỳ state nào → CANCELLED (với reason code)
```

### 11.2 Shipment (Phiếu xuất)

```
DRAFT → CONFIRMED → ALLOCATED → PICKING → PICKED → AWAITING_WEIGHING → WEIGHED_IN → PROCESSING → WEIGHED_OUT → SHIPPED
Bất kỳ state nào trước SHIPPED → CANCELLED
```

### 11.3 Sales Order

```
DRAFT → CONFIRMED → PARTIALLY_SHIPPED → SHIPPED → CLOSED
                                                 → CANCELLED
```

### 11.4 Purchase Order

```
DRAFT → CONFIRMED → PARTIALLY_RECEIVED → RECEIVED → CLOSED
                                                   → CANCELLED
```

### 11.5 Work Header

```
PENDING → ASSIGNED → IN_PROGRESS → COMPLETED
                                  → CANCELLED
                                  → FAILED
```

### 11.6 VAS Work Order

```
DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED → CLOSED
                                  → CANCELLED
```

### 11.7 Debit Note

```
DRAFT → PENDING_REVIEW → APPROVED → LOCKED → PUSHED_TO_ERP
                        → REJECTED
```

---

## 12. THAM KHẢO TÀI LIỆU GỐC

| File | Nội dung | Vị trí |
|------|---------|--------|
| PRD v2.0 | Product Requirements Document đầy đủ | `description-docs/AI- MARKDOWN (.MD)/THORESEN_SWM_PRD_VIBECODING_v2_0.md` |
| Module Spec Master | Đặc tả tổng thể 11 module | `description-docs/TVL_SWM_overview_spec_module.md` |
| FE Architecture | Kiến trúc frontend chi tiết | `docs/architecture/architecture-fe.md` |
| BE Architecture | Kiến trúc backend chi tiết | `docs/architecture/architecture-be.md` |
| Gap Analysis | GAP analysis codebase vs spec mới | `docs/GAP_ANALYSIS_ROADMAP.md` |
| Module Specs | Spec chi tiết từng module | `docs/spec/module_{N}_{name}_spec.md` |
| Tech Stack | Tech stack chi tiết từng module | `docs/stack/Module_{N}_techstack.md` |
| BE Module Docs | API docs từng module | `backend/docs/module-{N}-{name}.md` |
| FE Module Docs | FE docs từng module | `frontend/docs/module-{N}-{name}_fe.md` |
| Prisma Schema | Database schema đầy đủ | `backend/prisma/schema.prisma` |
| UX Language Guide | Hướng dẫn ngôn ngữ UI | `frontend/docs/UX_LANGUAGE_GUIDELINE.md` |
| Business Rules | 77 business rules | `description-docs/AI- MARKDOWN (.MD)/TVL_SWM_Business_Rules_Document.md` |
| State Machines | Inbound/Outbound state machines | `description-docs/AI- MARKDOWN (.MD)/TVL_SWM_State_Machine_Inbound_Outbound_v3_1_InventTrans.md` |

---

## 13. LƯU Ý KHI PHÁT TRIỂN GIAO DIỆN

### 13.1 Những điều PHẢI làm

- ✅ Mọi label, CTA, error message bằng **tiếng Việt** rõ ràng
- ✅ Mọi trang data phải có **loading, empty, error state**
- ✅ Table phải hỗ trợ **search, filter, sort, pagination**
- ✅ Form phải có **validation feedback** real-time
- ✅ Action button phải check **permission + state** trước khi hiện/enable
- ✅ Status badge dùng **màu nhất quán** xuyên suốt app
- ✅ Responsive cho desktop (≥1024px), hỗ trợ tablet, mobile qua Capacitor
- ✅ Hỗ trợ **dark mode**
- ✅ Sidebar có thể **collapse**

### 13.2 Những điều KHÔNG làm

- ❌ Không dùng thuật ngữ tiếng Anh nếu có từ Việt tương đương phổ biến
- ❌ Không dùng multi-tenant routing (`/:tenantId`)
- ❌ Không đưa business component vào `shared/`
- ❌ Không để page file chứa business logic phức tạp
- ❌ Không dùng global state manager nặng (React Query + Context là đủ)
- ❌ Không hardcode data — mọi thứ phải gọi API
- ❌ Không dùng placeholder thay label trong form
- ❌ Không hiển thị error mơ hồ như "Có lỗi xảy ra" mà không nói rõ

---

*End of document*
