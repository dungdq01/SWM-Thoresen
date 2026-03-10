# SWM Smart Guide — Interactive Guided Tour System

## Báo cáo Feature: Hệ thống hướng dẫn người dùng tương tác

**Ngày hoàn thành:** 2026-03-10  
**Module:** `frontend/src/shared/guided-tour/`  
**Trạng thái:** ✅ Hoàn tất — Build passed — 100% route coverage

---

## 1. Mục tiêu

Xây dựng hệ thống hướng dẫn người dùng **trực tiếp trên giao diện web**, thay thế hoàn toàn tài liệu hướng dẫn sử dụng bên ngoài.

**Yêu cầu cụ thể:**
- Hướng dẫn step-by-step cho toàn bộ flow nghiệp vụ
- Tự động highlight (spotlight) vào từng button, page, element mục tiêu
- Tự động navigate đến đúng trang cho mỗi bước
- Có chế độ **on/off** toggle
- Lưu tiến trình giữa các phiên (localStorage)
- Hỗ trợ keyboard navigation (←, →, Esc)

---

## 2. Quy trình thực hiện

### Phase 1: Nghiên cứu & Thiết kế
- Đọc và phân tích 3 tài liệu nghiệp vụ:
  - `TVL_SWM_UserFlow_A_to_Z.md` — Flow người dùng A-Z theo vai trò
  - `TVL_SWM_StateMachine.md` — State machine cho mọi document
  - `TVL_SWM_BA_PO_Master.md` — Đặc tả module từ góc nhìn BA/PO
- Quét toàn bộ frontend routes (`routes.jsx`) — xác định 55 pages thuộc 12 module groups
- Thiết kế kiến trúc: Provider → Context → Overlay → Launcher

### Phase 2: Implementation
- Tạo 6 files mới trong `src/shared/guided-tour/`:
  - `tourFlows.js` — Định nghĩa 13 flows, 89+ steps
  - `GuidedTourProvider.jsx` — React Context + state management
  - `TourOverlay.jsx` — SVG spotlight + tooltip + keyboard nav
  - `TourLauncher.jsx` — Panel chọn flow với category tabs
  - `guided-tour.css` — Styles, animations, responsive
  - `index.js` — Barrel exports
- Tích hợp vào `MainLayout.jsx`:
  - Wrap toàn app với `GuidedTourProvider`
  - Thêm `TourLauncher` vào header (kế bên Mock Data switch)
  - Thêm `TourOverlay` ở root level

### Phase 3: Audit & Bổ sung
- Audit lần 1: phát hiện **17 pages chưa được cover**
- Bổ sung:
  - Thêm 4 pages Master Data: Vendors, Zones, UoMs, Vehicle Types
  - Tạo flow mới: Admin & Phân quyền (Dashboard, Roles, Permissions, Governance, Logs)
  - Thêm 3 pages Inventory Core: Transactions, Holds, Workbench
  - Tạo flow mới: Work Execution chi tiết (Queue, My Work, Execute, Monitor)
  - Thêm Billing Dashboard vào flow Monthly Billing
  - Thêm Go-Live Checklist vào flow Reporting
- Audit lần 2: **55/55 routes — 0 missing — 100% coverage**

### Phase 4: Verification
- `npx vite build` → ✅ PASSED (exit code 0)
- Dev server `localhost:5173` → ✅ Running, no errors
- Route coverage script → ✅ 55/55 confirmed

---

## 3. Kiến trúc kỹ thuật

```
MainLayout.jsx
└── GuidedTourProvider (React Context)
    ├── AppSidebar
    ├── Header
    │   └── TourLauncher (nút "Guide" + panel chọn flow)
    ├── <Outlet /> (page content)
    └── TourOverlay (SVG spotlight + tooltip)
```

### Các component chính:

| Component | File | Chức năng |
|-----------|------|-----------|
| `GuidedTourProvider` | `GuidedTourProvider.jsx` | Context provider, quản lý state (activeTour, currentStep, enabled), auto-navigate, target element detection, scroll-into-view, MutationObserver cho lazy content |
| `useGuidedTour` | `GuidedTourProvider.jsx` | Custom hook để access tour context |
| `TourOverlay` | `TourOverlay.jsx` | SVG mask spotlight (backdrop tối + cutout sáng), tooltip với arrow indicators, progress bar, step dots, keyboard navigation |
| `TourLauncher` | `TourLauncher.jsx` | Header button "Guide", flyout panel với category tabs, flow cards (title, description, role, estimated time, step count), progress tracking (completed/total) |
| `tourFlows` | `tourFlows.js` | Config file: 13 flows × 89+ steps, mỗi step có: route, target selector, title, description, placement |
| CSS | `guided-tour.css` | Dark tooltip theme, spotlight ring pulse animation, arrow indicators, step dots, responsive |

### State management:
- `enabled` — on/off toggle (persisted localStorage)
- `activeTourId` — flow đang chạy
- `currentStepIndex` — bước hiện tại
- `completedTours[]` — danh sách flow đã hoàn tất (persisted localStorage)
- `targetRect` — vị trí element đang highlight (auto-calculated)
- `launcherOpen` — panel chọn flow đang mở/đóng

### Target detection strategy:
1. CSS selector từ `currentStep.target` (VD: `.section-title`, `button`, `.wrs-card`)
2. Fallback selector từ `currentStep.fallbackTarget`
3. Final fallback: `.app-main > div` (highlight toàn page content)
4. MutationObserver tự động retry khi DOM thay đổi (lazy-loaded pages)

---

## 4. Danh sách 13 Guided Tour Flows

| # | Flow ID | Tên | Role | Steps | Pages |
|---|---------|-----|------|-------|-------|
| 1 | `setup-master-data` | Thiết lập Master Data | WH_ADMIN | 12 | owners, vendors, items, warehouses, zones, locations, uoms, vehicle-types, inventory-statuses, reason-codes, number-sequences |
| 2 | `setup-billing` | Thiết lập Billing & Rate Card | WH_ADMIN | 4 | billing/rate-cards |
| 3 | `admin-settings` | Quản trị hệ thống & Phân quyền | ADMIN | 5 | dashboard, roles, permissions, governance, logs |
| 4 | `inbound-standard` | Nhập kho chuẩn (Standard Inbound) | WB_OPERATOR | 10 | receipts, execution, exceptions, putaway |
| 5 | `outbound-full` | Xuất kho đầy đủ (Outbound Flow) | WB_OPERATOR | 8 | shipments, allocation, weighing, approvals, work-execution/queue |
| 6 | `exception-handling` | Xử lý ngoại lệ (Exception) | WH_MANAGER | 5 | approvals, exceptions, execution, adjustments, cycle-count |
| 7 | `vas-bagging` | Đóng bao VAS (Bagging) | WH_KEEPER | 5 | vas/work-orders, execution, dashboard |
| 8 | `monthly-billing` | Tính phí hàng tháng (Billing) | BILLING_OFC | 7 | events, invoices, billing/dashboard |
| 9 | `inventory-control` | Quản lý tồn kho (Inventory Control) | WH_MANAGER | 8 | on-hand, transactions, holds, workbench, move-orders, transfers, status-change, history |
| 10 | `reporting-audit` | Báo cáo & Kiểm toán | OPS_SUPER | 6 | reporting/dashboard, inventory, billing, reconciliation, audit, go-live |
| 11 | `work-execution-detail` | Work Execution chi tiết | WH_KEEPER | 5 | queue, my-work, execute, monitor |
| 12 | `integration-monitoring` | Giám sát Integration & Weighbridge | OPS_SUPER | 4 | monitoring, weighbridge, alerts, channels |
| 13 | `end-to-end` | 🏆 Demo End-to-End: Nhập kho → Billing | ALL | 10 | Full flow A→Z qua toàn bộ hệ thống |

**Tổng:** 13 flows — 89 steps — 55/55 routes covered

---

## 5. Files tạo mới & chỉnh sửa

### Files mới (6):
| File | Size |
|------|------|
| `src/shared/guided-tour/tourFlows.js` | ~890 lines |
| `src/shared/guided-tour/GuidedTourProvider.jsx` | ~190 lines |
| `src/shared/guided-tour/TourOverlay.jsx` | ~250 lines |
| `src/shared/guided-tour/TourLauncher.jsx` | ~210 lines |
| `src/shared/guided-tour/guided-tour.css` | ~200 lines |
| `src/shared/guided-tour/index.js` | 4 lines |

### Files chỉnh sửa (1):
| File | Thay đổi |
|------|----------|
| `src/app/layouts/MainLayout.jsx` | +2 imports, wrap `GuidedTourProvider`, thêm `TourLauncher` vào header, thêm `TourOverlay` ở root |

---

## 6. UX Flow khi sử dụng

```
User mở app → Header hiện nút "Guide"
         ↓
Bấm "Guide" → Panel mở ra với 13 flows, filter theo category
         ↓
Chọn 1 flow (VD: "Nhập kho chuẩn")
         ↓
Hệ thống auto-navigate đến page đầu tiên
         ↓
SVG spotlight sáng lên element mục tiêu
Tooltip dark hiện: title + mô tả chi tiết + progress bar
         ↓
User bấm "Tiếp theo →" (hoặc phím →)
         ↓
Chuyển step → auto-navigate nếu cần → highlight element mới
         ↓
... lặp lại cho đến step cuối ...
         ↓
Bấm "Hoàn tất" → flow đánh dấu DONE (lưu localStorage)
         ↓
Quay lại panel → flow hiện ✅ DONE + progress tổng thể
```

**Keyboard shortcuts:**
- `→` hoặc `Enter` — Tiếp theo
- `←` — Quay lại
- `Esc` — Thoát tour

---

## 7. Kết quả đạt được

| Metric | Kết quả |
|--------|---------|
| Route coverage | **55/55 (100%)** |
| Tổng flows | **13** |
| Tổng steps | **89+** |
| Roles covered | **7** (ADMIN, WH_ADMIN, WH_MANAGER, WH_KEEPER, WB_OPERATOR, BILLING_OFC, OPS_SUPER) |
| Build | **✅ PASSED** |
| Dependencies thêm | **0** (zero external libs — pure React + CSS) |
| Breaking changes | **0** |
| Files mới | **6** |
| Files sửa | **1** |

---

## 8. Ghi chú kỹ thuật

- **Zero dependencies**: Không dùng thư viện ngoài (Shepherd.js, Intro.js, React Joyride). Toàn bộ tự build bằng React + SVG + CSS → bundle size tối ưu.
- **Lazy-safe**: MutationObserver tự động detect khi lazy-loaded page render xong → retry target detection.
- **Responsive**: Tooltip tự clamp vào viewport, mobile breakpoint responsive.
- **Persisted**: `enabled` + `completedTours` lưu localStorage → giữ giữa phiên.
- **Non-invasive**: Không cần thêm `data-tour` attribute vào các page components hiện có. Dùng CSS selectors có sẵn (`.section-title`, `.wrs-card`, `button`) + fallback strategy.
