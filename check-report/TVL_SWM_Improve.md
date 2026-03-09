# TVL SWM — Premium Features & UX Upgrade Blueprint

**Review date:** 2026-03-10 (Updated)
**Reviewer:** Senior Manager (AI-Assisted)
**Scope:** OCR Design + Master Data Image Gallery + Warehouse Map & 2D/3D Visualization + UX Premium Upgrade
**Codebase analyzed:** Backend (NestJS, 14 modules, Prisma) + Frontend (React 18 + Vite + Tailwind + Recharts + Framer Motion)

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [OCR — Full Design (UI/UX + Backend + Flow)](#2-ocr--full-design)
3. [Master Data Image Gallery (Warehouse / Zone / Item Photos)](#3-master-data-image-gallery)
4. [Warehouse Map & Location Checker](#4-warehouse-map--location-checker)
5. [2D Warehouse Visualization (Interactive Floor Plan)](#5-2d-warehouse-visualization)
6. [3D Warehouse Visualization (Rack-Level View)](#6-3d-warehouse-visualization)
7. [UX Premium Upgrade (Cross-Cutting)](#7-ux-premium-upgrade)
8. [Database Schema Changes Required](#8-database-schema-changes)
9. [New NPM Dependencies](#9-new-npm-dependencies)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Full Feature Backlog (IMP-01 → IMP-46)](#11-full-feature-backlog)

---

## 1. Current State Summary

### Module Scorecard (unchanged from 2026-03-09)

| Module | Score | Status | Blocking |
|--------|-------|--------|----------|
| M1 Foundation | 9.0 | PASS | — |
| M2 Master Data | 9.0 | PASS | — |
| M3 Inventory Core | 8.8 | CONDITIONAL | Concurrent OnHand rebuild |
| M4 Inbound | 8.8 | PASS | — |
| M5 Outbound | 9.0 | PASS | — |
| M6 Inventory Control | 8.5 | CONDITIONAL | Cycle count approval |
| M7 Work Execution | 9.2 | PASS | — |
| M8 Integration & IoT | 8.8 | PASS | OCR = MOCK |
| M9 VAS/Bagging | 9.2 | PASS | — |
| M10 Billing | 8.8 | PASS | StorageSnapshot = placeholder |
| M11 Reporting | 8.5 | CONDITIONAL | Go-Live gate logic |
| Auth | 8.5 | CONDITIONAL | RequestUser mismatch (24 refs) |

### Critical Path (Must Fix)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| CP-1 | Auth RequestUser 24 broken refs | Runtime crash on logout/profile/session | 2h |
| CP-2 | OCR extraction = MOCK | No real data capture at weighbridge | 1w |
| CP-3 | StorageSnapshot = stub | Billing amounts incorrect | 1w |
| CP-4 | Work Module = empty scaffold | No work execution tracking | 2w |

---

## 2. OCR — Full Design

### 2.1 Existing Backend (What's Already Built)

```
backend/src/modules/integration-platform/
├── controllers/ocr.controller.ts          ← 6 endpoints ready
├── services/
│   ├── ocr-upload.service.ts              ← File validation (jpg/png/pdf), request ID gen
│   ├── ocr-extract.service.ts             ← ⚠️ MOCK — returns fake data with confidence
│   └── ocr-confirmation.service.ts        ← Snapshot, corrections, link-to-receipt, reject
├── repositories/
│   └── ocr-result.repository.ts           ← CRUD on M8OcrResult table
└── dto/
    ├── UploadOcrDto (imagePath, providerName, warehouseId)
    ├── ConfirmOcrDto (confirmedBlNumber, confirmedVehicleNumber, etc.)
    └── LinkOcrDto (receiptId, linkMethod, correlationId)

Database: M8OcrResult
├── ocrRequestId, imagePath, status (UPLOADED→EXTRACTING→EXTRACTED→CONFIRMED→LINKED)
├── blNumber, vehicleNumber, productName, vesselName, qty (extracted fields)
├── blConfidence, vehicleConfidence, productConfidence, vesselConfidence, qtyConfidence
└── confirmedAt, confirmedBy, linkedReceiptId, corrections (JSON), remarks
```

**Status flow:** `UPLOADED → EXTRACTING → EXTRACTED/REVIEW_REQUIRED → CONFIRMED → LINKED/REJECTED`

### 2.2 What's Missing

| Layer | Gap | Priority |
|-------|-----|----------|
| **Backend** | `ocr-extract.service.ts` returns hardcoded fake data | CRITICAL |
| **Backend** | File storage service = empty `.gitkeep` folder | CRITICAL |
| **Frontend** | Zero OCR pages/components exist | CRITICAL |
| **Backend** | No image resize/thumbnail generation | HIGH |
| **Backend** | No OCR result caching | MEDIUM |

### 2.3 OCR Provider Integration (Backend)

**Recommended: Google Cloud Vision API** (best for license plates + container numbers in Vietnam)

```
Replace: ocr-extract.service.ts → extractData() method

New flow:
1. Upload image → local/S3 storage
2. Call Google Vision API: textDetection + objectLocalization
3. Parse response → regex extract:
   - License plate: Vietnamese format (e.g., 51C-12345, 30A-123.45)
   - Container number: ISO 6346 (e.g., MSKU1234567)
   - BL number: alphanumeric (carrier prefix + digits)
   - Vessel name: from text blocks
   - Weight: numeric + unit pattern
4. Calculate confidence per field
5. If ALL confidence ≥ 90% → status = EXTRACTED (auto-accept ready)
   If ANY confidence < 90% → status = REVIEW_REQUIRED (operator must check)
```

**File Storage Service (New):**
```typescript
// backend/src/shared/integrations/storage/file-storage.service.ts
interface FileStorageService {
  upload(file: Buffer, filename: string, folder: string): Promise<{ url: string; key: string }>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
  generateThumbnail(key: string, width: number, height: number): Promise<string>;
}

// Phase 1: Local disk storage (uploads/ folder)
// Phase 2: AWS S3 / Google Cloud Storage
```

### 2.4 OCR Frontend — Full UX Design

**New pages & components to build:**

#### Page 1: OCR Dashboard (`pages/integration/OcrDashboardPage.jsx`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📸 OCR Processing Center                              [+ Upload]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 📤 12    │  │ 🔄 3     │  │ ✅ 156   │  │ ❌ 5     │           │
│  │ Pending  │  │ Review   │  │ Confirmed│  │ Rejected │           │
│  │ Today    │  │ Required │  │ This Week│  │ This Week│           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                     │
│  Filter: [All Status ▾] [Date Range ▾] [Warehouse ▾] [Search...] │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 🖼️ | Request ID  | Vehicle    | BL Number  | Status  | Time  │ │
│  │────┼─────────────┼────────────┼────────────┼─────────┼───────│ │
│  │ 📷 │ OCR-00234   │ 51C-12345  │ MSKU123... │ 🟡 REVIEW│ 2m  │ │
│  │ 📷 │ OCR-00233   │ 30A-98765  │ HLCU456... │ 🟢 CONF  │ 15m │ │
│  │ 📷 │ OCR-00232   │ 29B-11111  │ —          │ 🔴 REJ   │ 1h  │ │
│  │ 📷 │ OCR-00231   │ 51D-55555  │ MSCU789... │ 🔵 LINKED│ 2h  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Thumbnail hover → Enlarged preview (Framer Motion zoom)           │
│  Row click → OCR Detail/Review Page                                │
└─────────────────────────────────────────────────────────────────────┘
```

**UX highlights:**
- KPI cards with Framer Motion count-up animation
- REVIEW_REQUIRED rows highlighted with amber pulse border
- Thumbnail column shows captured image (hover = enlarge)
- Real-time: new OCR results appear at top with slide-in animation (WebSocket later)

#### Page 2: OCR Upload (`features/integration/ocr/OcrUploadDrawer.jsx`)

```
┌──────────────────────────── OCR Upload ─────────────────────────────┐
│                                                                      │
│  Warehouse: [TVL Warehouse 1 ▾]                                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │              ┌──────────────────────┐                          │ │
│  │              │   📷                 │                          │ │
│  │              │   Drop image here    │                          │ │
│  │              │   or click to browse │                          │ │
│  │              │                      │                          │ │
│  │              │   JPG, PNG, PDF      │                          │ │
│  │              │   Max 10MB           │                          │ │
│  │              └──────────────────────┘                          │ │
│  │                                                                │ │
│  │  📱 [Use Camera]  — Opens device camera for mobile users      │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Preview:  ┌──────────────────┐   Document Type: [Weighbridge ▾]   │
│            │  🖼️ uploaded.jpg │   Provider: [Auto-detect ▾]        │
│            │  (image preview)  │                                     │
│            │  800 × 600 px     │   Notes: [________________]       │
│            └──────────────────┘                                     │
│                                                                      │
│  [Cancel]                              [Upload & Process ▶]        │
│                                                                      │
│  ── Processing ──────────────────────────────────────────           │
│  ████████████████████░░░░░░░  68%  Extracting text...              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**UX highlights:**
- Drag & drop zone with dashed border animation on hover
- Camera button for mobile (uses `navigator.mediaDevices.getUserMedia`)
- Image preview with dimension info immediately after selection
- Upload progress bar with animated stripes
- Auto-navigate to Review page when extraction completes

#### Page 3: OCR Review & Confirm (`pages/integration/OcrReviewPage.jsx`)

```
┌──────────────────────── OCR Review: OCR-00234 ─────────────────────┐
│                                                                      │
│  ┌─────────────── Image ───────────────┐  ┌── Extracted Data ────┐ │
│  │                                      │  │                      │ │
│  │   🖼️ Original Capture               │  │  Vehicle Plate:      │ │
│  │   (zoomable, pannable)               │  │  ┌────────────────┐ │ │
│  │                                      │  │  │ 51C-12345  ✏️  │ │ │
│  │   ┌─────────────────────────┐        │  │  └────────────────┘ │ │
│  │   │                         │        │  │  Confidence: ████░ 92%│ │
│  │   │   [Captured photo with  │        │  │                      │ │
│  │   │    highlighted regions  │        │  │  Container No:       │ │
│  │   │    where OCR detected   │        │  │  ┌────────────────┐ │ │
│  │   │    text — bounding      │        │  │  │ MSKU1234567 ✏️ │ │ │
│  │   │    boxes in blue]       │        │  │  └────────────────┘ │ │
│  │   │                         │        │  │  Confidence: █████ 97%│ │
│  │   └─────────────────────────┘        │  │                      │ │
│  │                                      │  │  BL Number:          │ │
│  │   🔍 [Zoom In] [Zoom Out] [Reset]   │  │  ┌────────────────┐ │ │
│  │   🔄 [Rotate CW] [Rotate CCW]       │  │  │ BL2026030912✏️ │ │ │
│  │                                      │  │  └────────────────┘ │ │
│  ├──────────────────────────────────────┤  │  Confidence: ███░░ 76%│ │
│  │  Detection Regions:                  │  │  ⚠️ Low confidence   │ │
│  │  □ Vehicle Plate (blue box)          │  │                      │ │
│  │  □ Container No  (green box)         │  │  Weight (kg):        │ │
│  │  □ BL Number     (orange box)        │  │  ┌────────────────┐ │ │
│  │  □ Weight        (purple box)        │  │  │ 24,500     ✏️  │ │ │
│  │                                      │  │  └────────────────┘ │ │
│  └──────────────────────────────────────┘  │  Confidence: ████░ 88%│ │
│                                             │                      │ │
│                                             │  Vessel Name:        │ │
│                                             │  ┌────────────────┐ │ │
│                                             │  │ EVER GIVEN  ✏️ │ │ │
│                                             │  └────────────────┘ │ │
│                                             │  Confidence: █████ 95%│ │
│                                             └──────────────────────┘ │
│                                                                      │
│  Link to Document:                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search PO/Receipt: [PO-2026-00123____________] [Search]    │ │
│  │                                                                │ │
│  │ Suggested matches (by vehicle/BL):                             │ │
│  │  ● PO-2026-00123 — DPM Urea 500MT — 51C-12345 — 98% match   │ │
│  │  ○ PO-2026-00119 — DPM Urea 200MT — 51C-12345 — 85% match   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Remarks: [Optional operator note________________________]          │
│                                                                      │
│  [← Back]   [❌ Reject]           [✅ Confirm & Link ▶]           │
└──────────────────────────────────────────────────────────────────────┘
```

**UX highlights:**
- **Split view:** Image left (zoomable/pannable) + Extracted data right (editable)
- **Bounding box overlay:** Color-coded rectangles on image showing where each field was detected
- **Confidence bars:** Visual bar + percentage. Fields < 85% highlighted amber with warning icon
- **Inline editing:** Click ✏️ on any field to correct → system tracks corrections
- **Smart document linking:** Auto-suggest matching PO/Receipt based on vehicle plate / BL number
- **Keyboard shortcuts:** Tab between fields, Enter to confirm, Esc to cancel edit

#### Page 4: OCR on WeighbridgePage (Inline Integration)

```
Existing WeighbridgePage.jsx — Add OCR panel:

┌─────────────── Weighbridge Session: WB-2026-00456 ──────────────────┐
│                                                                       │
│  ┌── Weight Reading ──┐  ┌── Vehicle Info (OCR) ─────────────────┐  │
│  │ Gross: 48,500 kg   │  │ 📷 [Capture Photo]                    │  │
│  │ Tare:  24,000 kg   │  │                                        │  │
│  │ Net:   24,500 kg   │  │ Plate: 51C-12345  ✅ OCR Confirmed    │  │
│  │                     │  │ Container: MSKU1234567  ✅             │  │
│  │ ━━━━━━━━━━━━━━━━━  │  │ Seal: SL-20260309-A  ✏️ Manual       │  │
│  │ ▲ Live reading      │  │                                        │  │
│  └─────────────────────┘  │ [📷 Photo 1] [📷 Photo 2] [+ Add]   │  │
│                            └──────────────────────────────────────┘  │
│                                                                       │
│  Linked PO: PO-2026-00123 — DPM Urea 500MT                         │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

**Flow:** Operator taps "Capture Photo" → Camera/upload → OCR extracts in background → Auto-fills vehicle info → Operator confirms → Data saved to WeighbridgeLog with `photoAlprPath` + `photoCargoPath`

### 2.5 OCR Component Tree

```
frontend/src/
├── pages/integration/
│   ├── OcrDashboardPage.jsx            ← New (list all OCR records)
│   └── OcrReviewPage.jsx              ← New (review + confirm single record)
├── features/integration/ocr/
│   ├── OcrUploadDrawer.jsx            ← New (upload drawer with drag-drop)
│   ├── OcrImageViewer.jsx             ← New (zoomable image with bounding boxes)
│   ├── OcrFieldEditor.jsx             ← New (editable field with confidence bar)
│   ├── OcrDocumentLinker.jsx          ← New (search + suggest PO/Receipt to link)
│   ├── OcrStatusBadge.jsx             ← New (color-coded status pill)
│   ├── OcrKpiCards.jsx                ← New (dashboard summary cards)
│   └── OcrCameraCapture.jsx           ← New (mobile camera integration)
├── domains/integration/
│   ├── api/ocr.api.js                 ← New (Axios calls to 6 OCR endpoints)
│   └── hooks/
│       ├── useOcrList.js              ← New (TanStack Query for OCR list)
│       ├── useOcrDetail.js            ← New (single record query)
│       ├── useOcrUpload.js            ← New (upload mutation)
│       ├── useOcrConfirm.js           ← New (confirm mutation)
│       ├── useOcrLink.js              ← New (link mutation)
│       └── useOcrReject.js            ← New (reject mutation)
└── shared/ui/
    ├── ImageDropzone.jsx              ← New (reusable drag-drop image uploader)
    ├── ImageViewer.jsx                ← New (reusable zoom/pan image component)
    └── ConfidenceBar.jsx              ← New (reusable confidence % bar)
```

---

## 3. Master Data Image Gallery

### 3.1 Vision

Every master data entity (Warehouse, Zone, Location, Item) should support **photo gallery** — multiple images showing the real physical entity. This transforms the WMS from a "data-only" system to a **visual management** system.

### 3.2 Use Cases

| Entity | Why Photos? | Example Photos |
|--------|-------------|----------------|
| **Warehouse** | Identify warehouse at a glance, show for customers | Exterior view, entrance, aerial view, floor plan photo |
| **Zone** | Visual guide for operators finding zones | Zone entrance sign, zone overview from above, zone layout |
| **Location** | Verify correct placement during putaway/pick | Rack position photo, floor marking, QR label on rack |
| **Item (Product)** | Identify cargo visually, avoid wrong picks | Product sample, packaging, bag label, bulk cargo photo |

### 3.3 Database Schema Change

```sql
-- New table: MdEntityImage (polymorphic image gallery)
CREATE TABLE "MdEntityImage" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "entityType"    VARCHAR(30) NOT NULL,  -- 'WAREHOUSE' | 'ZONE' | 'LOCATION' | 'ITEM'
    "entityId"      UUID NOT NULL,          -- FK to respective table
    "imageUrl"      VARCHAR(500) NOT NULL,  -- Storage path/URL
    "thumbnailUrl"  VARCHAR(500),           -- Auto-generated thumbnail
    "caption"       VARCHAR(200),           -- Optional description
    "sortOrder"     INTEGER DEFAULT 0,      -- Display order (first = primary/cover)
    "isPrimary"     BOOLEAN DEFAULT false,  -- Cover image flag
    "fileSize"      INTEGER,                -- Bytes
    "mimeType"      VARCHAR(50),            -- image/jpeg, image/png
    "width"         INTEGER,                -- Pixels
    "height"        INTEGER,                -- Pixels
    "uploadedBy"    UUID,
    "createdAt"     TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entity_image_lookup ON "MdEntityImage" ("entityType", "entityId");
```

**Also add cover image shortcut to main entities:**
```sql
ALTER TABLE "MdWarehouse" ADD COLUMN "coverImageUrl" VARCHAR(500);
ALTER TABLE "MdZone"      ADD COLUMN "coverImageUrl" VARCHAR(500);
ALTER TABLE "MdLocation"  ADD COLUMN "coverImageUrl" VARCHAR(500);
ALTER TABLE "MdItem"      ADD COLUMN "coverImageUrl" VARCHAR(500);
```

### 3.4 Backend API Changes

```
New endpoints:
  POST   /api/v1/master-data/{entityType}/{entityId}/images       ← Upload image(s)
  GET    /api/v1/master-data/{entityType}/{entityId}/images       ← List gallery
  PATCH  /api/v1/master-data/{entityType}/{entityId}/images/{id}  ← Update caption/order/primary
  DELETE /api/v1/master-data/{entityType}/{entityId}/images/{id}  ← Remove image
  POST   /api/v1/master-data/{entityType}/{entityId}/images/{id}/set-primary  ← Set as cover

entityType = 'warehouses' | 'zones' | 'locations' | 'items'
```

**Upload processing pipeline:**
```
Client uploads file (max 10MB, jpg/png/webp)
  → Backend validates mime type + file size
  → Save original to storage (local/S3)
  → Generate thumbnail (200×200, quality 80%)
  → Generate medium (800×600, quality 85%)
  → Save MdEntityImage record
  → If first image, auto-set as isPrimary + update coverImageUrl
  → Return { id, imageUrl, thumbnailUrl }
```

### 3.5 Frontend UX — Image Gallery on Master Data Pages

#### A. Warehouse Card View (Enhanced WarehousesPage)

```
Current: Table-only view
New: Toggle between Table View and Card View

┌─────────────────── Warehouses ──────────── [📋 Table] [🖼️ Cards] [+New] ─┐
│                                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │ 🖼️             │  │ 🖼️             │  │ 📷 No photo   │               │
│  │ [Warehouse     │  │ [Warehouse     │  │                │               │
│  │  photo here]   │  │  photo here]   │  │  [Upload Photo]│               │
│  │                │  │                │  │                │               │
│  ├────────────────┤  ├────────────────┤  ├────────────────┤               │
│  │ WH-001         │  │ WH-002         │  │ WH-003         │               │
│  │ TVL Main WH    │  │ TVL Open Yard  │  │ TVL Bonded     │               │
│  │ COVERED        │  │ OPEN_YARD      │  │ COVERED        │               │
│  │ 50,000 m²      │  │ 30,000 m²      │  │ 15,000 m²      │               │
│  │ 🟢 Active      │  │ 🟢 Active      │  │ 🟡 Inactive    │               │
│  │                │  │                │  │                │               │
│  │ 📍 12 Zones    │  │ 📍 5 Zones     │  │ 📍 8 Zones     │               │
│  │ 📦 156 Locs    │  │ 📦 42 Locs     │  │ 📦 89 Locs     │               │
│  │ ⚖️ 78% Cap     │  │ ⚖️ 45% Cap     │  │ ⚖️ 0% Cap      │               │
│  └────────────────┘  └────────────────┘  └────────────────┘               │
│                                                                             │
│  Click card → Warehouse Detail Page (with full gallery + zone map)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### B. Warehouse Detail Page (New: `pages/master-data/WarehouseDetailPage.jsx`)

```
┌──────────────── Warehouse: WH-001 — TVL Main Warehouse ────────────────┐
│                                                                          │
│  ┌──── Photo Gallery ───────────────────────────────────────────────┐   │
│  │ ┌─────────────────────────────────┐  ┌──────┐ ┌──────┐ ┌──────┐│   │
│  │ │                                 │  │ 🖼️   │ │ 🖼️   │ │ 🖼️   ││   │
│  │ │     🖼️ Main Photo (cover)       │  │ Side │ │ Yard │ │ Gate ││   │
│  │ │     (click to full-screen)      │  │ view │ │ view │ │ view ││   │
│  │ │                                 │  │      │ │      │ │      ││   │
│  │ │                                 │  └──────┘ └──────┘ └──────┘│   │
│  │ │                                 │  [+ Upload More]            │   │
│  │ └─────────────────────────────────┘                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌── Info ──────────┐  ┌── Quick Stats ─────────────────────────────┐  │
│  │ Code: WH-001     │  │ Zones: 12 │ Locations: 156 │ Workers: 24  │  │
│  │ Type: COVERED    │  │ Capacity: 78% ████████████████░░░░         │  │
│  │ Area: 50,000 m²  │  │ Today In: 12 trucks │ Today Out: 8 trucks │  │
│  │ Height: 12m      │  │ On-Hand: 38,500 MT  │ Available: 11,500MT │  │
│  │ Weighbridges: 2  │  │                                            │  │
│  └──────────────────┘  └────────────────────────────────────────────┘  │
│                                                                          │
│  ┌── Zone Overview (Mini 2D Map) ───────────────────────────────────┐  │
│  │                                                                    │  │
│  │   [Interactive mini floor plan showing zones — click zone → go]   │  │
│  │   [Color-coded by zoneType: Storage=blue, Receiving=green, etc.]  │  │
│  │                                                                    │  │
│  │   [Open Full Warehouse Map →]                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Tabs: [Zones (12)] [Locations (156)] [Activity Log] [Settings]        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Zone table with cover images, occupancy bars, quick actions       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

#### C. Item Detail with Photos

```
┌──────────── Item: ITM-DPM-UREA-001 — Đạm Phú Mỹ Urea 46% ─────────────┐
│                                                                           │
│  ┌─── Photos ──────────────────┐  ┌── Product Info ───────────────────┐ │
│  │ ┌────────────────────────┐  │  │ Code:  ITM-DPM-UREA-001          │ │
│  │ │                        │  │  │ Name:  Đạm Phú Mỹ Urea 46%      │ │
│  │ │  🖼️ Product photo      │  │  │ Group: FERTILIZER                │ │
│  │ │  (50kg bag sample)     │  │  │ Form:  BAGGED (50kg)             │ │
│  │ │                        │  │  │ UoM:   MT (base), BAG (billing)  │ │
│  │ └────────────────────────┘  │  │                                   │ │
│  │ ┌─────┐ ┌─────┐ ┌─────┐   │  │ Std Gross: 50.5 kg/bag           │ │
│  │ │ Bag │ │Label│ │Bulk │   │  │ Std Net:   50.0 kg/bag           │ │
│  │ │ 📷  │ │ 📷  │ │ 📷  │   │  │ Density:   0.72 MT/m³            │ │
│  │ └─────┘ └─────┘ └─────┘   │  │ Tolerance: ±2% (in), ±1% (out)  │ │
│  │ [+ Add Photo]              │  │                                   │ │
│  └────────────────────────────┘  └───────────────────────────────────┘ │
│                                                                         │
│  This helps operators visually identify the correct product during      │
│  receiving, picking, and cycle count — reducing wrong-item errors.      │
└─────────────────────────────────────────────────────────────────────────┘
```

#### D. Shared ImageGallery Component

```jsx
// frontend/src/shared/ui/ImageGallery.jsx
// Reusable across Warehouse, Zone, Location, Item detail pages

<ImageGallery
  entityType="WAREHOUSE"
  entityId={warehouse.id}
  images={warehouse.images}         // array from API
  onUpload={handleUpload}           // triggers upload mutation
  onDelete={handleDelete}           // triggers delete mutation
  onSetPrimary={handleSetPrimary}   // triggers set-primary mutation
  maxImages={10}
  editable={hasPermission('MD_WRITE')}
/>

Features:
  - Grid layout with primary image large + thumbnails small
  - Lightbox: click image → full-screen overlay with prev/next navigation
  - Drag-to-reorder thumbnails (change sortOrder)
  - Upload: drag-drop or click, with crop/rotate before upload
  - Delete: confirm modal → remove
  - Mobile: swipe through images
```

### 3.6 Image Gallery Component Tree

```
frontend/src/
├── shared/ui/
│   ├── ImageGallery.jsx           ← New (reusable gallery with CRUD)
│   ├── ImageLightbox.jsx          ← New (full-screen viewer with navigation)
│   ├── ImageUploadCrop.jsx        ← New (upload with crop/rotate tools)
│   └── ImageDropzone.jsx          ← New (drag-drop zone, shared with OCR)
├── pages/master-data/
│   ├── WarehouseDetailPage.jsx    ← New (detail page with gallery + stats + mini-map)
│   ├── ZoneDetailPage.jsx         ← New (detail page with gallery + location grid)
│   ├── LocationDetailPage.jsx     ← New (detail page with gallery + inventory)
│   └── ItemDetailPage.jsx         ← New (detail page with gallery + specs)
├── features/master-data/
│   ├── warehouse/WarehouseCard.jsx ← New (card view with cover image)
│   ├── zone/ZoneCard.jsx          ← New (card view with cover image)
│   └── item/ItemCard.jsx          ← New (card view with product photo)
├── domains/master-data/
│   ├── api/entity-image.api.js    ← New (upload, list, delete, set-primary)
│   └── hooks/
│       ├── useEntityImages.js     ← New (TanStack Query for image gallery)
│       ├── useUploadImage.js      ← New (upload mutation with progress)
│       └── useDeleteImage.js      ← New (delete mutation)
```

---

## 4. Warehouse Map & Location Checker

### 4.1 Vision

An **interactive 2D map** embedded in the master data section that lets operators:
- See all locations on a visual map
- Check which locations are occupied/available
- Navigate to any location by search or click
- Verify they're at the correct location during putaway/pick (QR scan)

This is **NOT the full 2D visualization** (Section 5) — this is a simpler, practical tool for daily operations.

### 4.2 Where It Lives

```
Integration points:
1. Standalone page:     pages/master-data/WarehouseMapPage.jsx
2. Embedded widget:     WarehouseDetailPage.jsx → "Zone Overview" section
3. Location picker:     Any form that selects a location → MapLocationPicker modal
4. Mobile quick check:  Scan QR → See "You are here" on mini-map
```

### 4.3 Map Data Requirements

**Existing fields (already in DB):**
- `MdLocation.xCoord` (Decimal 18,6)
- `MdLocation.yCoord` (Decimal 18,6)
- `MdLocation.areaM2` (Decimal 18,4)
- `MdZone.zoneType` (enum: RECEIVING, STORAGE, STAGING, SHIPPING, QC, DAMAGED, RETURNS)

**New fields needed:**
```sql
ALTER TABLE "MdZone" ADD COLUMN "boundaryPoints" JSONB;
-- Stores polygon vertices: [{"x":0,"y":0},{"x":100,"y":0},{"x":100,"y":50},{"x":0,"y":50}]

ALTER TABLE "MdWarehouse" ADD COLUMN "mapConfig" JSONB;
-- Stores: { width: 1000, height: 600, gridSize: 10, backgroundImageUrl: null, scale: 1 }
-- width/height = warehouse logical map dimensions
-- gridSize = snap grid for location placement
-- backgroundImageUrl = optional uploaded floor plan image as underlay

ALTER TABLE "MdLocation" ADD COLUMN "widthM" DECIMAL(18,4);
ALTER TABLE "MdLocation" ADD COLUMN "depthM" DECIMAL(18,4);
-- Physical dimensions for rendering location rectangles on map
```

### 4.4 New Backend API

```
GET  /api/v1/master-data/warehouses/{id}/map
  → Returns: {
      warehouse: { id, name, mapConfig },
      zones: [{ id, code, name, type, boundaryPoints, color }],
      locations: [{
        id, code, type, status, xCoord, yCoord, widthM, depthM,
        zoneId, zoneCode, zoneType,
        onHandQty, maxCapacityKg, occupancyPct,  // joined from OnHand
        currentInventory: [{ itemName, ownerCode, qty, uom }]  // summary
      }]
    }

POST /api/v1/master-data/warehouses/{id}/map/layout
  → Update zone boundaries + location positions (admin-only, for map editor)
  → Body: { zones: [...], locations: [...] }
```

### 4.5 Frontend UX — Warehouse Map Page

```
┌───────────────── Warehouse Map: WH-001 — TVL Main ─────────────────────┐
│                                                                          │
│  [🏭 WH-001 ▾]  [View: 🗺️ Map | 📋 List]  [🔍 Search location...]    │
│                                                                          │
│  ┌── Legend ─────────────────────────────────────────────────────────┐  │
│  │ Zone Types: 🟩 RECEIVING  🟦 STORAGE  🟨 STAGING  🟧 SHIPPING  │  │
│  │             🟪 QC  🟥 DAMAGED  ⬜ RETURNS                       │  │
│  │ Occupancy:  ⬜ Empty  🟩 <50%  🟨 50-80%  🟧 80-95%  🟥 >95%  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌── Map Canvas ────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │   ┌─────── RECEIVING ZONE (A) ──────┐  ┌── STORAGE ZONE (B) ──┐ │  │
│  │   │                                  │  │                       │ │  │
│  │   │  [A-01] [A-02] [A-03] [A-04]   │  │  [B-01] [B-02] [B-03]│ │  │
│  │   │   🟩     🟨     🟥     ⬜      │  │   🟧     🟩     🟩   │ │  │
│  │   │                                  │  │                       │ │  │
│  │   │  [A-05] [A-06] [A-07] [A-08]   │  │  [B-04] [B-05] [B-06]│ │  │
│  │   │   🟩     🟩     🟨     🟩      │  │   🟨     🟥     🟩   │ │  │
│  │   │                                  │  │                       │ │  │
│  │   └──────────────────────────────────┘  │  [B-07] [B-08] [B-09]│ │  │
│  │                                          │   🟩     🟩     ⬜   │ │  │
│  │   ┌── STAGING (C) ──┐  ┌── SHIPPING (D) ──┐                   │ │  │
│  │   │ [C-01] [C-02]   │  │ [D-01] [D-02]    │                   │ │  │
│  │   │  🟨     ⬜      │  │  🟧     🟩       │  └────────────────┘ │  │
│  │   └─────────────────┘  └──────────────────┘                      │  │
│  │                                                                    │  │
│  │   🔍+ 🔍−  🖐️Pan  📐 Measure  🏷️ Labels [On/Off]              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌── Location Detail Panel (click location) ────────────────────────┐  │
│  │ 📍 Location: A-03  │  Zone: RECEIVING (A)  │  Status: OK        │  │
│  │ Type: FLOOR         │  Area: 120 m²         │  Stack Limit: 50T │  │
│  │ Occupancy: 95% ████████████████████████████░                     │  │
│  │                                                                    │  │
│  │ Current Inventory:                                                 │  │
│  │ ┌─────────────────────────────────────────────────────────────┐  │  │
│  │ │ Item                 │ Owner  │ Qty     │ UoM │ Status     │  │  │
│  │ │ DPM Urea 46%        │ DPM    │ 450 MT  │ MT  │ AVAILABLE  │  │  │
│  │ │ DPM NPK 16-16-8     │ DPM    │ 48 MT   │ MT  │ AVAILABLE  │  │  │
│  │ └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │ [📷 View Photos]  [📋 Transaction History]  [🔄 Move Inventory] │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**UX highlights:**
- **Zoom & pan** with mouse wheel / pinch-to-zoom on mobile
- **Click location** → Detail panel slides up from bottom (mobile) or appears on side (desktop)
- **Hover location** → Tooltip with code + occupancy %
- **Search** → Type location code → Map auto-pans and highlights location with pulse animation
- **Real-time colors** update every 30s via TanStack Query polling (WebSocket in Phase 2)
- **Responsive:** On mobile, map fills screen with bottom sheet for details

### 4.6 Map Editor Mode (Admin Only)

```
Toggled via [✏️ Edit Layout] button (WH_ADMIN role required):

Edit mode features:
1. Drag zone boundaries (resize polygon vertices)
2. Drag location rectangles to new positions
3. Snap-to-grid alignment
4. Add new zones (draw rectangle → assign type)
5. Add new locations within zones
6. Upload background image (floor plan scan/photo)
7. Set map scale (pixels per meter)
8. Save layout → POST /api/v1/master-data/warehouses/{id}/map/layout
```

### 4.7 Location Picker Modal (Reusable)

```
Used in: Putaway page, Move order page, Transfer order page, etc.

┌──────────── Select Location ─────────────────────┐
│                                                    │
│  🔍 [Search location code...]                     │
│  Filter: [Zone ▾] [Status: OK only ✓]            │
│                                                    │
│  ┌── Mini Map ──────────────────────────────────┐ │
│  │  (Same as warehouse map but compact)          │ │
│  │  Click location to select                     │ │
│  │  Selected location highlighted in blue pulse  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Selected: B-05  │  Zone: STORAGE (B)             │
│  Available: 200 MT  │  Status: OK                 │
│                                                    │
│  [Cancel]                         [Confirm ✓]     │
└────────────────────────────────────────────────────┘
```

### 4.8 Map Component Tree

```
frontend/src/
├── pages/master-data/
│   └── WarehouseMapPage.jsx            ← New (full-page map view)
├── features/warehouse-map/
│   ├── WarehouseMap.jsx                ← New (main SVG/Canvas map component)
│   ├── ZonePolygon.jsx                 ← New (zone boundary rendering)
│   ├── LocationCell.jsx                ← New (single location rectangle)
│   ├── MapControls.jsx                 ← New (zoom, pan, measure tools)
│   ├── MapLegend.jsx                   ← New (color legend)
│   ├── LocationDetailPanel.jsx         ← New (click-to-inspect panel)
│   ├── MapEditor.jsx                   ← New (admin drag-to-edit mode)
│   ├── MapLocationPicker.jsx           ← New (modal for location selection)
│   └── MapSearchOverlay.jsx            ← New (search + highlight)
├── domains/master-data/
│   ├── api/warehouse-map.api.js        ← New (GET/POST map endpoints)
│   └── hooks/
│       ├── useWarehouseMap.js          ← New (TanStack Query for map data)
│       └── useMapLayout.js            ← New (mutation for saving layout)
```

---

## 5. 2D Warehouse Visualization (Interactive Floor Plan)

### 5.1 Difference from Warehouse Map

| Feature | Warehouse Map (Section 4) | 2D Visualization (This Section) |
|---------|---------------------------|----------------------------------|
| **Purpose** | Daily operations: find locations, check availability | Management overview: monitor entire warehouse |
| **Data focus** | Location status + inventory lookup | Occupancy trends, throughput heatmap, worker activity |
| **Update frequency** | On-demand / 30s poll | Real-time WebSocket |
| **Target user** | WH_KEEPER, WB_OPERATOR | WH_MANAGER, OPS_SUPER, WH_ADMIN |
| **Interactivity** | Click location → detail | Heatmaps, time slider, filters, overlays |
| **Location** | Master Data section | Dedicated "Warehouse Visualization" module in sidebar |

### 5.2 Full Page Design

```
┌───────── Warehouse Visualization — TVL Main Warehouse ──────────────────┐
│                                                                          │
│  [🏭 WH-001 ▾]  [⏰ Live] [📊 Last 24h] [📅 Custom Range]             │
│                                                                          │
│  ┌── KPI Bar ────────────────────────────────────────────────────────┐  │
│  │ 📦 Total Inventory  │ 📥 Inbound Today │ 📤 Outbound Today      │  │
│  │    38,500 MT         │    1,200 MT       │    850 MT              │  │
│  │ 📊 Utilization       │ 🚛 Vehicles Now  │ 👷 Active Workers      │  │
│  │    78.2%             │    4 in yard      │    18 on floor         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌── Overlay Controls ──────────────────────────────────────────────┐  │
│  │ Layer: [✓ Zones] [✓ Occupancy] [  Throughput] [  Temperature]   │  │
│  │ Color: [Occupancy % ▾]  Opacity: [████████░░] 80%               │  │
│  │ Filter: [All Owners ▾] [All Items ▾] [All Statuses ▾]          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌── 2D Floor Plan ─────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │   (Same map as Section 4 but with additional overlay layers)      │  │
│  │                                                                    │  │
│  │   Occupancy Heatmap Overlay:                                      │  │
│  │   ┌──────────────────────────────────────────────────────────┐   │  │
│  │   │  Each location cell rendered with gradient fill:          │   │  │
│  │   │  Empty (0%) = transparent                                 │   │  │
│  │   │  Low (1-50%) = light green with opacity                   │   │  │
│  │   │  Medium (50-80%) = yellow/amber gradient                  │   │  │
│  │   │  High (80-95%) = orange gradient                          │   │  │
│  │   │  Critical (95-100%) = red with subtle pulse animation     │   │  │
│  │   └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                    │  │
│  │   Throughput Heatmap Overlay (alternate):                         │  │
│  │   ┌──────────────────────────────────────────────────────────┐   │  │
│  │   │  Color intensity = number of transactions in time range   │   │  │
│  │   │  Cool blue (low activity) → Hot red (high activity)       │   │  │
│  │   │  Shows movement patterns, bottleneck zones                │   │  │
│  │   └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                    │  │
│  │   🔍+ 🔍−  🖐️Pan  [Fit All]  [Focus Zone ▾]                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌── Time Slider (when "Last 24h" or "Custom Range" selected) ──────┐  │
│  │ ◄ ████████████████████████░░░░░░░░░░ ►                            │  │
│  │   00:00        06:00        12:00        18:00        23:59       │  │
│  │                              ▲ 14:30                              │  │
│  │   [▶ Play] [⏸ Pause] [Speed: 1x ▾]                              │  │
│  │                                                                    │  │
│  │   Shows warehouse state at selected time — occupancy replay       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌── Zone Summary Sidebar (right panel) ────────────────────────────┐  │
│  │ Click zone on map to see:                                          │  │
│  │                                                                    │  │
│  │ Zone B — STORAGE                                                   │  │
│  │ ┌─────────────────────────────────────┐                           │  │
│  │ │ Capacity:  85% ██████████████████░░ │                           │  │
│  │ │ Locations: 24 total (20 active)     │                           │  │
│  │ │ Inventory: 12,500 MT               │                           │  │
│  │ │ Top items: DPM Urea (60%)          │                           │  │
│  │ │            DPM NPK (25%)           │                           │  │
│  │ │            Other (15%)             │                           │  │
│  │ └─────────────────────────────────────┘                           │  │
│  │                                                                    │  │
│  │ Inbound/Outbound flow (mini chart):                               │  │
│  │ ┌─────────────────────────────────────┐                           │  │
│  │ │ 📈 Mini area chart (7-day trend)    │                           │  │
│  │ └─────────────────────────────────────┘                           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Tech Stack Recommendation

```
Rendering:  Konva.js (react-konva)
  - Canvas-based, performant for hundreds of location cells
  - Built-in zoom/pan (Stage draggable + wheel zoom)
  - Layer system perfect for zone layer + location layer + overlay layer
  - Good React integration

Why NOT SVG/D3:
  - SVG slows with many elements (200+ locations)
  - D3 has steep learning curve and React integration friction

Why NOT Leaflet:
  - Overkill for indoor maps
  - Tile-based system unnecessary for warehouse scale
```

### 5.4 2D Visualization Component Tree

```
frontend/src/
├── pages/warehouse-visualization/
│   └── FloorPlanPage.jsx                   ← New (full-page 2D visualization)
├── features/warehouse-visualization/
│   ├── FloorPlanCanvas.jsx                 ← New (react-konva Stage + Layer)
│   ├── ZoneLayer.jsx                       ← New (Konva Group per zone)
│   ├── LocationLayer.jsx                   ← New (Konva Rect per location)
│   ├── OccupancyOverlay.jsx                ← New (color gradient overlay)
│   ├── ThroughputOverlay.jsx               ← New (heatmap activity overlay)
│   ├── FloorPlanKpiBar.jsx                 ← New (top KPI summary)
│   ├── OverlayControls.jsx                 ← New (layer toggles + filters)
│   ├── TimeSlider.jsx                      ← New (historical playback)
│   ├── ZoneSidebar.jsx                     ← New (zone detail panel)
│   └── FloorPlanTooltip.jsx                ← New (hover tooltip)
├── domains/warehouse-visualization/
│   ├── api/visualization.api.js            ← New
│   └── hooks/
│       ├── useFloorPlanData.js             ← New (locations + occupancy)
│       ├── useOccupancyHistory.js          ← New (time-range data for playback)
│       └── useThroughputData.js            ← New (transaction counts per location)
```

---

## 6. 3D Warehouse Visualization (Rack-Level View)

### 6.1 What It Shows

```
Purpose: Visualize vertical space utilization — rack levels, pallet stacking heights

┌──────────── 3D Warehouse View ───────────────────────────────────────┐
│                                                                       │
│  [🏭 WH-001 ▾]  [Toggle: 2D ↔ 3D]  [View: Orbit | First-Person]   │
│                                                                       │
│  ┌── 3D Canvas ─────────────────────────────────────────────────┐   │
│  │                                                                │   │
│  │           ┌─────┐ ┌─────┐ ┌─────┐                            │   │
│  │           │ ▓▓▓ │ │ ▓▓▓ │ │ ░░░ │  ← Rack Level 3           │   │
│  │           │ ▓▓▓ │ │ ▓▓▓ │ │ ▓▓▓ │  ← Rack Level 2           │   │
│  │           │ ███ │ │ ███ │ │ ███ │  ← Rack Level 1 (floor)   │   │
│  │           └─────┘ └─────┘ └─────┘                            │   │
│  │              B-01     B-02    B-03                             │   │
│  │                                                                │   │
│  │   ▓ = Occupied (color by owner/item)                          │   │
│  │   ░ = Empty                                                    │   │
│  │   Click pallet → detail popup                                  │   │
│  │                                                                │   │
│  │   Controls:                                                    │   │
│  │   🖱️ Left-drag: orbit camera                                  │   │
│  │   🖱️ Right-drag: pan                                          │   │
│  │   🖱️ Scroll: zoom                                             │   │
│  │   Double-click: focus on rack/location                         │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌── Color Legend ─────────────────────────────────────────────┐     │
│  │ Owner: 🟦 DPM  🟩 Client-A  🟧 Client-B  ⬜ Empty         │     │
│  │ Or toggle: 🟩 <50% full  🟨 50-80%  🟥 >80%               │     │
│  └─────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.2 Tech Stack

```
React Three Fiber (R3F) — React wrapper for Three.js
  + @react-three/drei — Helpers (OrbitControls, Text, etc.)
  + @react-three/postprocessing — Optional (bloom, SSAO for visual quality)

Why R3F:
  - React-native integration (JSX for 3D scenes)
  - Component-based (each rack = React component)
  - TanStack Query hooks work naturally alongside R3F
  - Active community, well-maintained
```

### 6.3 3D Data Model

```
Each location with locationType = 'RACK' has:
  - xCoord, yCoord → Position on floor
  - maxHeightM → Total rack height
  - levels (new field or derived) → Number of shelf levels
  - Per level: occupancy from OnHand data

Rendering logic:
  Rack mesh = stack of Box3D geometries
  Each level = 1 box (width=locationWidth, height=levelHeight, depth=locationDepth)
  Color = occupancy of that level
  Click = show inventory at that level
```

### 6.4 3D Component Tree

```
frontend/src/
├── pages/warehouse-visualization/
│   └── Warehouse3DPage.jsx              ← New (or tab within FloorPlanPage)
├── features/warehouse-3d/
│   ├── WarehouseScene.jsx               ← New (R3F Canvas + lighting + controls)
│   ├── FloorGrid.jsx                    ← New (grid plane + zone boundaries)
│   ├── RackMesh.jsx                     ← New (single rack with levels)
│   ├── PalletMesh.jsx                   ← New (pallet/cargo on rack level)
│   ├── AislePath.jsx                    ← New (walkable aisle lines)
│   ├── CameraController.jsx             ← New (orbit + first-person toggle)
│   ├── LocationLabel3D.jsx              ← New (floating text label)
│   └── ClickToInspect3D.jsx             ← New (raycaster → popup on click)
```

### 6.5 Implementation Phases

| Phase | Feature | Effort | Dependency |
|-------|---------|--------|------------|
| **3D-V1** | Basic scene: floor grid + colored boxes per location | 1 week | react-three-fiber setup |
| **3D-V2** | Rack levels: multi-level boxes with per-level occupancy | 1 week | OnHand per location-level |
| **3D-V3** | Click-to-inspect: click rack → popup with inventory details | 3 days | 3D-V2 |
| **3D-V4** | First-person walkthrough: WASD camera for virtual warehouse tour | 1 week | 3D-V3 |
| **3D-V5** | Owner/item color coding + legend | 3 days | 3D-V2 |
| **3D-V6** | Performance: LOD (Level of Detail), instancing for 500+ locations | 1 week | Large warehouse data |

---

## 7. UX Premium Upgrade (Cross-Cutting)

### 7.1 Design System Enhancement

| Area | Current | Upgrade |
|------|---------|---------|
| **Animations** | Basic Framer Motion (fade-in, slide-up) | Page transitions, micro-interactions on every action, skeleton loading states, staggered list animations |
| **Dark Mode** | Not available | Full dark mode toggle with smooth transition. Navy palette already dark-friendly |
| **Empty States** | Generic EmptyState component | Custom illustrations per module (warehouse icon, truck icon, etc.) with helpful CTA |
| **Loading States** | Spinner only | Skeleton screens matching actual layout shape. Shimmer effect on cards |
| **Error States** | Toast only | Inline field errors, boundary error pages with retry, contextual help |
| **Success Feedback** | Toast | Confetti animation for milestone actions (first receipt, go-live check pass) + toast |

### 7.2 Navigation & Information Architecture

```
Current Sidebar (unchanged):
  Dashboard
  Master Data → Owners, Vendors, Items, Warehouses, Zones, Locations, ...
  Inbound Operations → ...
  Outbound Operations → ...
  ...

New additions:
  Master Data → Warehouses → Click warehouse → Detail page with gallery + mini-map
  Master Data → Warehouse Map  ← NEW (direct link to interactive map)
  Warehouse Visualization ← NEW top-level module
    ├── 2D Floor Plan
    ├── 3D Rack View
    └── Heatmap Dashboard
  Integration Hub → OCR Processing ← NEW page
```

### 7.3 Responsive & Mobile UX

```
Current: Desktop-only (table-heavy layouts)
Target: Responsive with mobile-optimized views

Key mobile adaptations:
  1. Card views instead of tables on screens < 768px
  2. Bottom sheet panels instead of side panels
  3. Swipe gestures on maps and galleries
  4. Pull-to-refresh on list pages
  5. Floating action button (FAB) for primary actions
  6. Camera integration for OCR (mobile-first use case)
  7. Map with pinch-to-zoom + tap-to-inspect
```

### 7.4 Micro-Interactions & Animations Detail

```
Page load:
  - Staggered fade-in: KPI cards → table → side panel (50ms delay between)
  - Number count-up animation on KPI values

Data table:
  - Row highlight on hover with subtle bg transition
  - New row appears with slide-in-left animation
  - Deleted row fades out with height collapse

Form submit:
  - Button: "Save" → loading spinner → checkmark → original text
  - Success: green flash on saved fields, toast slide-in from top-right
  - Error: shake animation on invalid fields, red border pulse

Map interactions:
  - Location hover: scale up 1.05× with shadow
  - Location click: pulse ring animation + panel slide-in
  - Zone hover: semi-transparent overlay fade-in
  - Search result: animated dash-circle around found location

Gallery:
  - Image upload: progress ring around thumbnail
  - Lightbox open: image zooms from thumbnail position (shared element transition)
  - Gallery reorder: drag with ghost preview + slot indicator

Status changes:
  - Status badge: color morph animation (e.g., yellow PENDING → green CONFIRMED)
  - Progress bar: animated fill with ease-out-cubic
```

### 7.5 Advanced Table Features

```
Current: Basic pagination, search, column display
Upgrade:
  1. Column resizing (drag column borders)
  2. Column reordering (drag column headers)
  3. Multi-column sort (click header → hold Shift for secondary sort)
  4. Column pinning (freeze first N columns on horizontal scroll)
  5. Row selection with batch actions (select all → bulk status change)
  6. Expandable rows (click → inline detail without page navigation)
  7. Export: CSV, Excel (xlsx), PDF with current filters applied
  8. Column visibility toggle (hide/show columns)
  9. Saved filter presets per user
```

### 7.6 Keyboard Shortcuts (Power User)

```
Global:
  Ctrl+K          → Command palette (search anything: pages, locations, POs, items)
  Ctrl+/          → Toggle sidebar
  Ctrl+Shift+D    → Go to Dashboard
  Ctrl+Shift+M    → Go to Warehouse Map

Context-specific:
  In tables:   ↑↓ navigate rows, Enter = open, Delete = deactivate
  In forms:    Ctrl+Enter = submit, Esc = cancel
  In map:      +/- zoom, Arrow keys pan, F = fit all, L = toggle labels
  In gallery:  ←→ navigate images, Esc = close lightbox
  In OCR:      Tab = next field, Enter = confirm field, R = reject
```

### 7.7 Command Palette (`Ctrl+K`)

```
┌──────────── Quick Search ─────────────────────────────────────┐
│  🔍 [Type to search pages, locations, items, POs, SOs...]    │
│                                                                │
│  Recent:                                                       │
│  📄 Warehouse Map — WH-001                                    │
│  📄 PO-2026-00123 — DPM Urea 500MT                           │
│  📄 Location B-05 — Storage Zone B                            │
│                                                                │
│  Pages:                                                        │
│  🏭 Warehouses         📦 Inventory On-Hand                   │
│  📸 OCR Processing     🗺️ Warehouse Map                       │
│  📋 Inbound Receipts   📊 Dashboard                           │
│                                                                │
│  Actions:                                                      │
│  ➕ Create new PO      ➕ Upload OCR image                     │
│  ➕ Create new SO      🔍 Search inventory                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema Changes Required

### 8.1 New Table

```sql
-- MdEntityImage: Polymorphic image gallery for all master data entities
CREATE TABLE "MdEntityImage" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "entityType"    VARCHAR(30) NOT NULL,  -- WAREHOUSE, ZONE, LOCATION, ITEM
    "entityId"      UUID NOT NULL,
    "imageUrl"      VARCHAR(500) NOT NULL,
    "thumbnailUrl"  VARCHAR(500),
    "caption"       VARCHAR(200),
    "sortOrder"     INTEGER DEFAULT 0,
    "isPrimary"     BOOLEAN DEFAULT false,
    "fileSize"      INTEGER,
    "mimeType"      VARCHAR(50),
    "width"         INTEGER,
    "height"        INTEGER,
    "uploadedBy"    UUID,
    "createdAt"     TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_entity_image_lookup ON "MdEntityImage" ("entityType", "entityId");
```

### 8.2 Altered Tables

```sql
-- Warehouse: add cover image + map config
ALTER TABLE "MdWarehouse" ADD COLUMN "coverImageUrl"  VARCHAR(500);
ALTER TABLE "MdWarehouse" ADD COLUMN "mapConfig"      JSONB;
-- mapConfig: { width, height, gridSize, backgroundImageUrl, scale }

-- Zone: add cover image + boundary polygon
ALTER TABLE "MdZone" ADD COLUMN "coverImageUrl"   VARCHAR(500);
ALTER TABLE "MdZone" ADD COLUMN "boundaryPoints"  JSONB;
-- boundaryPoints: [{"x":0,"y":0}, {"x":100,"y":0}, ...]

-- Location: add cover image + physical dimensions for map rendering
ALTER TABLE "MdLocation" ADD COLUMN "coverImageUrl" VARCHAR(500);
ALTER TABLE "MdLocation" ADD COLUMN "widthM"        DECIMAL(18,4);
ALTER TABLE "MdLocation" ADD COLUMN "depthM"        DECIMAL(18,4);

-- Item: add cover image
ALTER TABLE "MdItem" ADD COLUMN "coverImageUrl" VARCHAR(500);
```

---

## 9. New NPM Dependencies

### Frontend

```json
{
  "dependencies": {
    "react-konva": "^18.2.10",       // 2D canvas rendering (floor plan + map)
    "konva": "^9.3.6",               // Konva.js core
    "@react-three/fiber": "^8.15.0", // 3D rendering (React Three Fiber)
    "@react-three/drei": "^9.95.0",  // 3D helpers (controls, text, etc.)
    "three": "^0.161.0",             // Three.js core
    "react-dropzone": "^14.2.3",     // Drag-drop file upload
    "react-image-crop": "^11.0.4",   // Image crop before upload
    "cmdk": "^0.2.0",               // Command palette (Ctrl+K)
    "@tanstack/react-table": "^8.11.0"  // Advanced table features
  }
}
```

### Backend

```json
{
  "dependencies": {
    "@google-cloud/vision": "^4.0.0",  // OCR provider (Phase 1)
    "sharp": "^0.33.2",                // Image resize/thumbnail generation
    "multer": "^1.4.5-lts.1",         // File upload middleware
    "@nestjs/serve-static": "^4.0.0"   // Serve uploaded files (Phase 1, before S3)
  }
}
```

---

## 10. Implementation Roadmap

### Sprint 1 (Week 1-2): Foundation + Critical Fixes + Image Infrastructure

```
Priority: Set up image pipeline + fix critical bugs

Backend:
- [ ] IMP-01: Fix Auth RequestUser field mismatch (2h)
- [ ] IMP-04: Rate limiting on login (2h)
- [ ] IMP-05: Remove hardcoded API key (1h)
- [ ] IMP-07: Clean up dead files (30m)
- [ ] NEW: FileStorageService — local disk upload/thumbnail/signed URL (1d)
- [ ] NEW: MdEntityImage table + migration (2h)
- [ ] NEW: Entity image CRUD endpoints (upload/list/delete/set-primary) (1d)
- [ ] NEW: Add coverImageUrl to Warehouse/Zone/Location/Item + migration (2h)

Frontend:
- [ ] NEW: ImageDropzone shared component (4h)
- [ ] NEW: ImageGallery shared component (1d)
- [ ] NEW: ImageLightbox shared component (4h)
- [ ] IMP-06: Swagger decorators on auth (4h)
```

### Sprint 2 (Week 3-4): OCR + Warehouse Map + Master Data Upgrade

```
Priority: Core visual features that transform the UX

Backend:
- [ ] IMP-02: Replace MOCK OCR with Google Cloud Vision (3d)
- [ ] NEW: Warehouse map API endpoint (GET /warehouses/{id}/map) (1d)
- [ ] NEW: Map layout save endpoint (POST /warehouses/{id}/map/layout) (4h)
- [ ] NEW: Zone boundaryPoints + Location widthM/depthM migration (2h)

Frontend:
- [ ] NEW: OCR Dashboard page (OcrDashboardPage) (1d)
- [ ] NEW: OCR Upload drawer (OcrUploadDrawer) (1d)
- [ ] NEW: OCR Review page with split view (OcrReviewPage) (2d)
- [ ] NEW: OCR domain hooks (useOcrList, useOcrUpload, etc.) (4h)
- [ ] NEW: Warehouse Map page (WarehouseMapPage) with Konva.js (3d)
- [ ] NEW: MapLocationPicker modal (reusable) (4h)
- [ ] NEW: WarehouseDetailPage with gallery + stats + mini-map (2d)
- [ ] NEW: Card view toggle on WarehousesPage (4h)
```

### Sprint 3 (Week 5-6): 2D Visualization + UX Polish

```
Priority: Management visualization + premium UX

Frontend:
- [ ] NEW: 2D Floor Plan page with Konva.js (FloorPlanPage) (3d)
- [ ] NEW: Occupancy heatmap overlay (1d)
- [ ] NEW: Throughput heatmap overlay (1d)
- [ ] NEW: Time slider for historical playback (2d)
- [ ] NEW: Zone summary sidebar panel (1d)
- [ ] NEW: Skeleton loading states for all pages (1d)
- [ ] NEW: Page transition animations (Framer Motion) (4h)
- [ ] NEW: Staggered list animations (4h)
- [ ] NEW: Command palette (Ctrl+K) (1d)
- [ ] IMP-15: Error boundary + global error handling (1d)

Backend:
- [ ] IMP-03: StorageSnapshot daily calculation (3d)
- [ ] NEW: Occupancy history API (for time slider) (1d)
- [ ] NEW: Throughput aggregation API (for heatmap) (1d)
```

### Sprint 4 (Week 7-8): 3D + Mobile + Real-Time

```
Priority: Wow factor + mobile readiness

Frontend:
- [ ] NEW: 3D Warehouse scene (React Three Fiber) — V1 basic (3d)
- [ ] NEW: 3D Rack levels with occupancy colors — V2 (2d)
- [ ] NEW: 3D Click-to-inspect — V3 (1d)
- [ ] NEW: 2D↔3D toggle on Visualization page (4h)
- [ ] IMP-12: WebSocket real-time updates (weighbridge, work queue) (3d)
- [ ] NEW: Responsive mobile layouts for map + gallery (2d)
- [ ] NEW: OCR camera capture (mobile) (1d)
- [ ] NEW: ItemDetailPage + ZoneDetailPage + LocationDetailPage (2d)

Backend:
- [ ] IMP-08: Connect Work module to actual flows (5d)
- [ ] NEW: WebSocket gateway setup (weighbridge + dashboard) (2d)
```

### Post Go-Live Enhancement (Phase 2)

```
- [ ] IMP-13: Offline-first mobile PWA (3w)
- [ ] IMP-17: Notification system (2w)
- [ ] IMP-18: Bulk operations (2w)
- [ ] IMP-19: Print label / barcode generation (1w)
- [ ] IMP-20: 3D V4 — First-person walkthrough (1w)
- [ ] IMP-21: Batch/Lot tracking (4w)
- [ ] IMP-22: Multi-language i18n (2w)
- [ ] IMP-24: Predictive analytics dashboard (4-6w)
- [ ] IMP-28: 4D Heatmap + Time slider (historical playback) (2-3w)
- [ ] Map Editor mode (admin drag-to-edit zones/locations) (2w)
- [ ] Advanced table features (resize, reorder, pin columns) (1w)
- [ ] Dark mode (1w)
```

---

## 11. Full Feature Backlog

### 11.1 MUST DO (Before Go-Live)

| # | Feature | Module | Current State | Effort |
|---|---------|--------|---------------|--------|
| IMP-01 | Fix Auth RequestUser field mismatch | Auth | 24 broken refs | 2h |
| IMP-02 | Real OCR provider integration | M8 | MOCK extraction | 1w |
| IMP-03 | StorageSnapshot daily calculation | M10 | Placeholder | 1w |
| IMP-04 | Rate limiting on login/refresh | Auth | No throttle | 2h |
| IMP-05 | Remove hardcoded internal API key | Auth | Security risk | 1h |
| IMP-06 | Swagger decorators on auth | Auth | No docs | 4h |
| IMP-07 | Delete dead stub guard files | Auth | Stale code | 30m |
| IMP-08 | Connect Work module to flows | M7/M12 | Scaffold only | 2w |
| **NEW** | File Storage Service | Backend | Empty .gitkeep | 1d |
| **NEW** | MdEntityImage table + API | Backend | — | 1.5d |
| **NEW** | OCR Frontend (3 pages) | Frontend | Zero code | 4d |
| **NEW** | Warehouse Map page | Frontend | Zero code | 3d |

### 11.2 SHOULD DO (Phase 1 Enhancement)

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| IMP-10 | 2D Warehouse Floor Plan | Konva.js interactive visualization | 2w |
| IMP-11 | Real Dashboard Charts | Already using Recharts — enhance data quality | 3d |
| IMP-12 | WebSocket Real-Time | Socket.IO for weighbridge + work queue + dashboard | 2w |
| IMP-14 | Testing Infrastructure | Vitest + React Testing Library | 3w |
| IMP-15 | Error Boundary + Handling | Consistent error pages, retry logic | 1w |
| IMP-16 | Audit Trail UI | Searchable log viewer | 1w |
| **NEW** | Master Data Image Gallery | Photos for Warehouse/Zone/Location/Item | 1w |
| **NEW** | Master Data Detail Pages | WarehouseDetail, ZoneDetail, LocationDetail, ItemDetail | 1w |
| **NEW** | Card View Toggle | Grid card view with cover images on list pages | 3d |
| **NEW** | Command Palette (Ctrl+K) | Global search for pages, entities, actions | 1d |
| **NEW** | Skeleton Loading States | Shimmer placeholders matching layout shapes | 1d |
| **NEW** | Micro-Interactions | Staggered animations, status morphs, number count-ups | 3d |
| **NEW** | Map Location Picker | Reusable modal for selecting location on map | 4h |

### 11.3 NICE TO HAVE (Phase 2)

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| IMP-13 | Offline-First Mobile PWA | Service worker, IndexedDB, sync queue | 3w |
| IMP-17 | Notification System | In-app notifications for approvals, alerts | 2w |
| IMP-18 | Bulk Operations | Bulk import/export, batch PO/SO processing | 2w |
| IMP-19 | Print Label / Barcode | Location labels, packing labels, shipping labels | 1w |
| IMP-20 | 3D Warehouse Visualization | React Three Fiber rack-level 3D view | 3w |
| IMP-21 | Batch/Lot Tracking | InventDim expansion, FEFO allocation | 4w |
| IMP-22 | Multi-Language (i18n) | English/Thai/Vietnamese | 2w |
| IMP-23 | Real ERP Integration | SAP/Oracle connector | 4-6w |
| IMP-24 | Predictive Analytics | ML-based demand forecast, capacity planning | 4-6w |
| IMP-25 | Customer Portal | CUST_VIEWER inventory visibility | 3w |
| IMP-26 | Billing Reconciliation | Auto-match with ERP invoices | 2w |
| IMP-27 | Document Management | Upload/link delivery orders, packing lists | 2w |
| IMP-28 | 4D Heatmap (Time Slider) | Historical occupancy playback | 2-3w |
| IMP-30 | Container Yard Management | Track container positions, stuffing schedule | 3-4w |
| IMP-32 | Mobile Barcode Scanner | Phone camera as barcode reader | 1-2w |
| IMP-34 | SLA Monitoring | Turnaround time tracking, SLA breach alerts | 2w |
| IMP-35 | Automated Cycle Count | ABC analysis-based scheduling | 2w |
| **NEW** | Map Editor Mode | Admin drag-to-edit zone boundaries/locations | 2w |
| **NEW** | Dark Mode | Full dark theme with smooth toggle | 1w |
| **NEW** | Advanced Table Features | Column resize/reorder/pin, saved presets | 1w |
| **NEW** | Keyboard Shortcuts | Global + context-specific shortcuts | 3d |

### 11.4 FUTURE VISION (Phase 3+)

| # | Feature | Description |
|---|---------|-------------|
| IMP-40 | AI-Powered Slotting Optimization | ML model for optimal put-away locations |
| IMP-41 | Digital Twin | Full virtual warehouse replica for simulation |
| IMP-42 | Voice-Directed Operations | Hands-free picking/putaway via voice |
| IMP-43 | Drone Inventory Counting | Automated cycle count with drones |
| IMP-44 | AGV/AMR Integration | Automated guided vehicle system |
| IMP-45 | Blockchain Proof-of-Custody | Immutable custody chain |
| IMP-46 | Carbon Footprint Tracking | Energy + emissions tracking |
| **NEW** | AR Warehouse Navigation | Phone AR overlay showing location directions |
| **NEW** | AI Anomaly Detection | Auto-detect inventory discrepancies, theft patterns |
| **NEW** | Digital Signage Integration | Live dashboard on warehouse floor screens |

---

## 12. Architecture Diagrams

### 12.1 Image & OCR Pipeline

```
                    ┌────────────────────────────┐
                    │     Client (Browser/Mobile) │
                    └──────────┬─────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        [Image Upload]   [OCR Upload]    [Camera Capture]
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   NestJS Backend    │
                    │  ┌───────────────┐  │
                    │  │ Multer Upload │  │
                    │  └───────┬───────┘  │
                    │          ▼          │
                    │  ┌───────────────┐  │
                    │  │ Sharp Resize  │  │
                    │  │ → original    │  │
                    │  │ → thumbnail   │  │
                    │  │ → medium      │  │
                    │  └───────┬───────┘  │
                    │          ▼          │
                    │  ┌───────────────┐  │
                    │  │ File Storage  │──┼──→ Local Disk (Phase 1)
                    │  │ Service       │──┼──→ AWS S3 (Phase 2)
                    │  └───────┬───────┘  │
                    │          │          │
                    │    ┌─────┴─────┐    │
                    │    │           │    │
                    │    ▼           ▼    │
                    │ [Entity     [OCR    │
                    │  Image]     Extract] │
                    │    │           │    │
                    │    ▼           ▼    │
                    │ MdEntity   Google   │
                    │ Image DB   Vision   │
                    │              API    │
                    └─────────────────────┘
```

### 12.2 Visualization Data Flow

```
┌─ Backend ───────────────────────────────────────────────────────┐
│                                                                   │
│  GET /warehouses/{id}/map                                        │
│  ├─ Query MdWarehouse (mapConfig)                                │
│  ├─ Query MdZone (boundaryPoints, zoneType) WHERE warehouseId    │
│  ├─ Query MdLocation (xCoord, yCoord, widthM, depthM) WHERE ... │
│  ├─ Join InvOnHand per location (SUM qty, calc occupancy %)     │
│  └─ Return unified { warehouse, zones[], locations[] }           │
│                                                                   │
│  GET /visualization/occupancy-history?warehouseId=X&range=24h    │
│  ├─ Query InventTrans grouped by location + hour                 │
│  └─ Return [{ locationId, hour, occupancyPct }]                  │
│                                                                   │
│  WebSocket: /ws/dashboard                                        │
│  └─ Push: { type: 'OCCUPANCY_CHANGE', locationId, newPct }      │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ Frontend ──────────────────────────────────────────────────────┐
│                                                                   │
│  TanStack Query: useWarehouseMap(warehouseId)                    │
│  ├─ Fetches + caches map data                                    │
│  ├─ Refetch every 30s OR invalidate on WebSocket event           │
│  └─ Provides: { warehouse, zones, locations }                    │
│                                                                   │
│  React Context: MapDataProvider                                   │
│  ├─ Selected warehouse, active overlays, filters                 │
│  └─ Shared between 2D and 3D views                              │
│                                                                   │
│  ┌─ Konva.js (2D) ──────────┐  ┌─ R3F (3D) ──────────────────┐ │
│  │ Stage (zoom/pan)          │  │ Canvas (orbit/pan/zoom)       │ │
│  │ ├─ Layer: Zones           │  │ ├─ FloorGrid                  │ │
│  │ │  └─ ZonePolygon × N     │  │ ├─ RackMesh × N              │ │
│  │ ├─ Layer: Locations       │  │ │  └─ PalletMesh × levels    │ │
│  │ │  └─ LocationCell × N    │  │ ├─ AislePath × N             │ │
│  │ ├─ Layer: Overlay         │  │ └─ LocationLabel3D × N       │ │
│  │ │  └─ Heatmap gradient    │  └──────────────────────────────┘ │
│  │ └─ Layer: UI              │                                    │
│  │    └─ Tooltip/Selection   │                                    │
│  └───────────────────────────┘                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

**Document updated:** 2026-03-10
**Source:** Full codebase analysis — Backend (NestJS, 14 modules, 372 files, Prisma schema) + Frontend (React 18, 47 pages, 109 components, Tailwind CSS + Recharts + Framer Motion)
**Status:** 0/19+ core tasks completed — ready to begin Sprint 1
