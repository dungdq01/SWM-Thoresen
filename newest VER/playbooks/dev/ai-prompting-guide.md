# Hướng Dẫn AI Prompting — Smartlog CodeBase

> **Mục tiêu tài liệu**: Giải thích cách sử dụng hệ thống AI Agent Team để thực hiện tính năng nghiệp vụ — từ việc trace code thực tế (Locations) đến demo prompt tạo tính năng mới (Warehouses).

---

## 1. Hệ Thống AI Agent Team

### 1.1 Tổng quan

Smartlog CodeBase được trang bị một **hệ thống 14 AI agents** chia theo nhiều team. Tài liệu này tập trung vào **7 DEV agents** và DEV pipeline (`/team`). Các agents giao tiếp với nhau thông qua cơ chế orchestration tự động với **governed lifecycle** — mỗi giai đoạn có gate kiểm soát rõ ràng trước khi chuyển tiếp.

```
                        Developer
                            │
                    /team [mô tả yêu cầu]
                            │
                            ▼
                    ┌───────────────┐
                    │  🚀 Team      │  ← Auto-Orchestrator
                    │  Coordinator  │
                    └──────┬────────┘
                           │
                    ┌──────▼──────────────┐
                    │  💾 Git Checkpoint  │  Phase 0.5
                    │  git stash / tag    │  (rollback nếu cần)
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────┐
                    │ 🎯 Planner  │  Phase 1
                    │  + Risk     │  (outputs CONTEXT_PATH
                    │  + Research │   + RISK_LEVEL)
                    └──────┬──────┘
                           │
                    ┌──────▼──────────────────────────┐
                    │  🔐 Human Approval Gate          │  Phase 1.5
                    │  Hiển thị: risk, scope, files,  │  ← MANDATORY
                    │  DB changes, breaking changes   │  Developer phải
                    └──────┬──────────────────────────┘  approve trước
                           │
                    ┌──────▼──────────────────────────┐
                    │  🔎 Context Validation Gate      │  Phase 1.6
                    │  Verify context.json:            │  ← MANDATORY
                    │  - exists + valid JSON           │  Trước khi pass
                    │  - apiContract, fieldDefinitions │  cho agents
                    │  - requiredSamples, templates    │
                    │  - sql-seed.md nếu DynamicGrid   │
                    └──────┬──────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
     ┌───────────┐               ┌──────────────┐
     │⚙️ Backend │               │ 🎨 Frontend  │  Phase 2
     └───────────┘               └──────────────┘  (Parallel)
            │                             │
            └──────────────┬──────────────┘
                           │
                    ┌──────▼──────┐
                    │  Contract   │  Phase 2.5
                    │  Gate ✅    │  BE endpoint ↔ FE API client
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Build      │  Phase 2.6
                    │  Gate ✅    │  dotnet build + pnpm build + lint
                    └──────┬──────┘
                           │
                    ┌──────▼──────────────┐
                    │  🔍 Reviewer        │  Phase 3
                    │  (outputs           │  (fixes Critical/Warning inline)
                    │   CROSS_LAYER_FIXED)│
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────────────┐
                    │  Post-Review Contract Gate   │  Phase 3.5
                    │  (chỉ chạy nếu              │  (Conditional)
                    │   CROSS_LAYER_FIXED: true)  │
                    └──────┬──────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ 🧪 Tester   │  Phase 4
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Test       │  Phase 4.5
                    │  Gate ✅    │  dotnet test + pnpm test
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  📋 Summary │  Phase 5
                    │  + Persist  │  (keep artifacts in feature/dev/)
                    └─────────────┘
```

### 1.2 Bảng Agents

| Agent | Ký hiệu | Vai trò | Khi nào dùng riêng |
|-------|---------|---------|-------------------|
| **Team** | 🚀 `/team` | Auto-orchestrator, điều phối toàn bộ | **Luôn bắt đầu ở đây** |
| **Planner** | 🎯 `/planner` | Phân tích yêu cầu, lên execution plan | Khi chỉ cần planning |
| **Backend** | ⚙️ `/backend` | .NET 10, CQRS, EF Core, Dynamic Query | Backend-only changes |
| **Frontend** | 🎨 `/frontend` | React 19, TypeScript, ViewConfig, Zod | Frontend-only changes |
| **Reviewer** | 🔍 `/reviewer` | Code review, security, performance | Review PR/code change |
| **Tester** | 🧪 `/tester` | Unit tests, integration tests | Tạo/chạy tests |
| **Codebase** | 📖 `/codebase` | Knowledge base, hỏi đáp về project | Câu hỏi về kiến trúc |

### 1.3 Bốn Artifact AI — Mục Đích & Vòng Đời

Mỗi pipeline tạo ra **4 loại file** với mục đích khác nhau. Hiểu rõ sự khác biệt giúp tránh nhầm lẫn khi làm việc với agents.

```
┌─────────────────┬──────────────────────────────┬──────────────┬─────────────────────────┐
│ Artifact        │ Câu hỏi trả lời              │ Audience     │ Lifecycle               │
├─────────────────┼──────────────────────────────┼──────────────┼─────────────────────────┤
│ Plan (.md)      │ Xây cái gì? Tại sao? ADR?    │ Human dev    │ Permanent — ref archive │
│ Task (.md)      │ Ai làm gì? Status? Order?    │ Agents + dev │ Mutable trong session   │
│ Context (.json) │ State hiện tại là gì?        │ Agents only  │ Ephemeral — archive sau │
│ Lessons (.md)   │ Lần trước sai gì? Rule là?   │ All agents   │ Accumulative — growing  │
└─────────────────┴──────────────────────────────┴──────────────┴─────────────────────────┘
```

#### Plan file (`docs/feature/<slug>/dev/plan.md`)

**Đặc tả thiết kế — immutable sau khi approved.**

Chứa: Gap analysis, architecture decisions (ADR), impact analysis, execution phases, notes & risks.

- ✅ Planner viết, developer approve
- ✅ Sau khi approve → **không edit** (chỉ thêm review section ở cuối)
- ✅ Tồn tại lâu dài — reference cho maintenance sau này
- ❌ **Không** chứa task status, không update liên tục

#### Task file (`docs/feature/<slug>/dev/tasks.md`)

**Checklist công việc — mutable trong suốt quá trình build.**

Chứa: Bảng task với columns `#, Task, Agent, Dependencies, Status`.

- ✅ Planner tạo từ Plan
- ✅ Backend/Frontend agents update status (Pending → In Progress → Done)
- ✅ Xóa hoặc archive sau khi feature complete
- ❌ **Không** chứa design rationale, ADR, gap analysis

```
docs/feature/shipment-block1/dev/plan.md    ← SPEC (why/what/how)   → permanent
docs/feature/shipment-block1/dev/tasks.md   ← CHECKLIST (who/when)  → mutable
```

> **Lý do tách**: Plan file là tài liệu thiết kế — không nên bị "ô nhiễm" bởi status updates liên tục.
> Task file thay đổi 10-20 lần trong 1 session — agent không cần đọc lại toàn bộ spec khi chỉ cần check next task.

#### Context file (`docs/feature/<slug>/dev/context.json`)

**Machine-readable handoff giữa agents — ephemeral.**

Chứa: Code snippets từ reference feature, API contract, field definitions, paths, i18n checklist.

```
Planner → [writes context.json] → Backend (reads) → Frontend (reads) → Reviewer (reads)
                                        ↑                    ↑               ↑
                              Không cần đọc lại        Không cần đọc    Không cần đọc
                              Locations từ đầu          lại reference     lại codebase
```

- ✅ Eliminates redundant codebase reads (mỗi agent đọc ~50 files → chỉ còn đọc 1 JSON)
- ✅ Đảm bảo tất cả agents dùng cùng API contract, field types, snippets
- ✅ Giữ `context.json` trong `docs/feature/<slug>/dev/` để trace và handoff xuyên suốt feature
- ❌ Không phải documentation — không cho human đọc

```json
// Ví dụ context.json (rút gọn)
{
  "feature": "Warehouse",
  "apiContract": {
    "endpoints": [
      { "method": "GET", "path": "/api/v1/warehouses/lookup", "response": "LookupDto[]" },
      { "method": "GET", "path": "/api/v1/warehouses", "response": "DynamicGridResult" },
      { "method": "POST", "path": "/api/v1/warehouses/search", "response": "DynamicGridResult" },
      { "method": "POST", "path": "/api/v1/warehouses", "response": "Guid" }
    ],
    "dtoFields": [{ "name": "code", "type": "string" }]
  },
  "templatesNeeded": {
    "backend": ["entity.md", "command.md", "query.md", "controller.md", "ef-config.md", "dynamic-query.md", "sql-seed.md"],
    "frontend": ["feature.md", "view-config.md", "input-config.md"]
  },
  "scriptsNeeded": { "formConfigSeed": true, "formCodes": ["CATWARG01", "CATWARS01"] },
  "requiredSamples": {
    "entity": { "source": "...", "snippet": "public class Location : BaseSoftDeletedEntity..." }
  },
  "i18nChecklist": { "registrations": ["i18n/index.ts", "lib/i18n-helpers.ts → namespacePrefixes"] }
}
```

> **Standard Response Types**: `DynamicGridResult` = `{ items, total, page, pageSize }` (dynamic columns from DB). `LookupDto` = `{ value: Guid, label: string }`. `ApiResult<T>` = `{ success, data, message }` wraps tất cả responses.

#### Lessons files — Hai tầng học (Project + Global)

**Self-improvement loop — accumulative qua các sessions.**

```
~/.claude/rules/lessons-global.md    ← Generic: áp dụng cho mọi project
d:\CodeBase\docs\lessons\dev.md      ← DEV-specific lessons for CodeBase
```

| Loại lesson | Ví dụ | File |
|------------|-------|------|
| Generic pattern | Zod schema phải là factory function | lessons-global.md |
| Generic rule | FE-BE validation phải cross-check | lessons-global.md |
| CodeBase-specific | DynamicGrid cần SQL seed script | docs/lessons/dev.md |
| CodeBase-specific | namespacePrefixes trong i18n-helpers.ts | docs/lessons/dev.md |

Planner agent **đọc cả hai** ở Step 0 trước khi planning.

---

### 1.4 Pipeline tự động (Governed Lifecycle)

Mỗi pipeline đều có **hard gates** — gate fail = dừng và fix, không bao giờ bỏ qua.

| Symbol | Ý nghĩa |
|--------|---------|
| 🔐 | Human Approval Gate — developer phải xác nhận trước khi code |
| ✅ | Automated Gate — phải pass mới được tiếp tục |
| ∥ | Parallel execution |

```
New Feature (Full Stack):
  💾 Git Checkpoint → Planner → 🔐 Approval → 🔎 Context Gate
  → Backend ∥ Frontend → ✅ Contract Gate → ✅ Build Gate
  → Reviewer → ✅ Post-Review Contract Gate (nếu cần)
  → Tester → ✅ Test Gate → Summary

New Feature (Backend Only):
  💾 Git Checkpoint → Planner → 🔐 Approval → 🔎 Context Gate
  → Backend → ✅ Contract Gate → ✅ Build Gate
  → Reviewer → ✅ Post-Review Contract Gate (nếu cần)
  → Tester → ✅ Test Gate → Summary

New Feature (Frontend Only):
  💾 Git Checkpoint → Planner → 🔐 Approval → 🔎 Context Gate
  → Frontend → ✅ Contract Gate → ✅ Build Gate
  → Reviewer → Tester → ✅ Test Gate → Summary

Bug Fix:
  💾 Git Checkpoint → Planner (root cause) → 🔐 Approval → 🔎 Context Gate
  → Fix → ✅ Contract Gate → ✅ Build Gate
  → Reviewer → Tester → ✅ Test Gate → Summary

Enhancement:
  💾 Git Checkpoint → Planner (impact) → 🔐 Approval → 🔎 Context Gate
  → Backend ∥ Frontend → ✅ Contract Gate → ✅ Build Gate
  → Reviewer → ✅ Post-Review Contract Gate (nếu cần)
  → Tester → ✅ Test Gate → Summary

Review + Test Only:
  Reviewer → ✅ Post-Review Contract Gate → Tester → ✅ Test Gate → Summary
```

**Risk Level** (Planner tự phân loại, hiện tại Approval Gate):

| Level | Trigger |
|-------|---------|
| 🔴 Critical | auth, permission, payment, JWT, encryption |
| 🟠 High | Breaking API change, schema thay đổi bảng cũ |
| 🟡 Medium | Feature mới có DB migration + API mới |
| 🟢 Low | Master-data CRUD mới, UI-only, i18n |

---

## 2. Trace Feature Thực Tế — Locations

Locations là một trong những entity chuẩn nhất trong codebase. Dưới đây là hành trình từ database đến UI.

### 2.1 Backend — File-by-file

```
backend/src/
│
├── Smartlog.Domain/
│   ├── Entities/MasterData/Location.cs          ← Entity (Code, Name, TypeId, CountryId...)
│   └── ...
│
├── Smartlog.Domain.Shared/
│   └── MasterData/LocationConsts.cs             ← CodeMaxLength = 20, NameMaxLength = 200
│
├── Smartlog.Infrastructure/
│   └── EntityConfigurations/LocationConfiguration.cs
│       → Map to table "cat.location"
│       → Set max lengths, FK to Country (DeleteBehavior.Restrict)
│
├── Smartlog.Application/Features/Locations/
│   ├── Commands/
│   │   ├── CreateLocation.cs    ← Command + Validator + Handler (1 file)
│   │   │   • Validate: Code required ≤20, Name required, TypeId valid enum
│   │   │   • Check: Code unique (không trùng trong tenant)
│   │   │   • Check: CountryId tồn tại
│   │   │   • Action: Tạo entity, SaveChangesAsync, return Guid
│   │   │
│   │   ├── UpdateLocation.cs    ← Tương tự Create + tìm entity theo Id
│   │   ├── DeleteLocation.cs    ← Set DeletedTime/DeletedBy, SaveChangesAsync
│   │   └── DeleteMultipleLocations.cs ← ExecuteUpdateAsync bulk (hiệu quả hơn)
│   │
│   ├── Queries/
│   │   ├── GetLocationsList.cs  ← DynamicGridQueryHandler, return DynamicGridResult
│   │   │   • Override: GetConfigName() => "Locations"
│   │   │   • Engine đọc QueryConfigs/Locations.json → SQL tự động
│   │   │
│   │   ├── GetLocationById.cs   ← EF query, include Country navigation
│   │   └── GetLocationsLookup.cs ← { Id, Code, Name }[] cho dropdown
│   │
│   ├── Dtos/LocationDto.cs      ← Shape dữ liệu trả về API
│   └── Mappings/LocationMappings.cs ← Static .ToDto() extension method
│
├── Smartlog.Api/
│   └── Controllers/LocationsController.cs
│       → GET    /api/locations/lookup
│       → GET    /api/locations
│       → POST   /api/locations/search
│       → GET    /api/locations/{id}
│       → POST   /api/locations         (Create → 201)
│       → PUT    /api/locations/{id}    (Update → 204)
│       → DELETE /api/locations/{id}    (Delete → 204)
│       → DELETE /api/locations/delete-multiple (Bulk → 204)
│
└── QueryConfigs/Locations.json  ← Dynamic SQL config (14 columns, 1 JOIN, Fluid templates)
```

### 2.2 Frontend — File-by-file

```
frontend/src/features/locations/
│
├── index.tsx                    ← Entry point: createEntityPage() với tất cả config
│
├── data/
│   └── schema.ts                ← Hai Zod schemas:
│       • locationSchema         ← Entity schema (static): tất cả fields từ API
│       • createLocationFormSchema() ← Form schema (factory function + i18n): chỉ editable fields + rules
│
├── api/
│   └── locations.ts             ← Axios API layer:
│       • searchLocations()      ← POST /api/locations/search
│       • getLocation(id)        ← GET  /api/locations/{id}
│       • createLocation(data)   ← POST /api/locations
│       • updateLocation(id,data)← PUT  /api/locations/{id}
│       • deleteLocation(id)     ← DELETE /api/locations/{id}
│       • deleteLocations(ids[]) ← DELETE /api/locations/delete-multiple
│       • isCodeUnique(code,id)  ← Async validation trong form
│
├── config/
│   ├── locations-list.config.ts ← ViewConfig object:
│   │   • mode: "dynamic"
│   │   • requiredFormConfigs: ["CATLOCAS01", "CATLOCAG01"]
│   │   • header: page-title, toolbar (add/export), quick-search
│   │   • content: search-form (CATLOCAS01) + data-grid (CATLOCAG01)
│   │   • footer: pagination
│   │
│   └── locations-input.config.ts ← FormFieldConfig[]:
│       • code:      text,     required, max 20 chars
│       • name:      text,     required, max 200 chars
│       • address:   textarea, optional, colSpan: 2
│       • type:      select,   options: PORT / WAREHOUSE / AIR_PORT
│       • countryId: select,   dataSource: "countries" (async lookup)
│       • latitude:  number,   optional
│       • longitude: number,   optional
│
└── components/
    ├── locations-provider.tsx   ← React Context: { open, setOpen, currentRow }
    └── locations-dialogs.tsx    ← FeatureDialogManager:
        • Add Dialog: form fields từ locations-input.config.ts
        • Edit Dialog: valueMapper (PascalCase → camelCase normalization)
        • Delete Dialog: confirmation + gọi deleteLocation API
        • ensureCodeUnique: async check trước khi submit
```

### 2.3 Data Flow Hoàn Chỉnh

```
[1] User mở /locations
         │
[2] TanStack Router: route _authenticated/locations/index.tsx
         │
[3] <Locations /> component (tạo từ createEntityPage)
         │
[4] ViewBuilder đọc locationsListConfig
         │
[5] TanStack Query: GET /api/form-configs?codes=CATLOCAS01,CATLOCAG01
    → Load column metadata, visible columns theo role
         │
[6] Render: SearchForm (CATLOCAS01 fields) + DataGrid (CATLOCAG01 columns)
         │
[7] POST /api/locations/search { page, pageSize, filters, sort }
         │
[8] LocationsController.Search → IDispatcher → GetLocationsList
         │
[9] DynamicGridQueryHandler → returns DynamicGridResult:
    { items: List<Dictionary<string, object?>>, total, page, pageSize }
    → Load QueryConfigs/Locations.json
    → Get visible columns từ CATLOCAG01
    → Build SQL: SELECT l.code, l.name, c.name AS countryName...
                 FROM cat.location l
                 LEFT JOIN cat.country c ON l.country_id = c.id
                 WHERE l.deleted_time IS NULL
                 AND (l.code ILIKE @filter OR l.name ILIKE @filter)
                 ORDER BY l.created_time DESC
                 LIMIT 20 OFFSET 0
    → Dapper.QueryMultiple (data + count cùng lúc)
         │
[10] Frontend render table + pagination
         │
[11] User nhấn "Thêm mới"
         │
[12] LocationsDialogs: Add dialog mở, form render từ locations-input.config.ts
         │
[13] User nhập: Code="HAN", Name="Hà Nội Port", Type=PORT, Country=Vietnam
         │
[14] Submit: Zod validate → POST /api/locations
         │
[15] CreateLocation handler: validate → unique check → save → return Guid
         │
[16] Frontend: invalidate query cache → grid refresh tự động
```

---

## 3. Demo Prompt — Tạo Feature Warehouses

### 3.1 Mô tả Feature

**Warehouses (Kho hàng)** — Entity mới cần implement:

| Field | Type | Bắt buộc | Ghi chú |
|-------|------|----------|--------|
| `code` | string | ✅ | Tối đa 20 ký tự, unique |
| `name` | string | ✅ | Tối đa 200 ký tự |
| `address` | string | ❌ | Tối đa 500 ký tự |
| `warehouseType` | enum | ✅ | `BONDED` / `GENERAL` / `COLD_CHAIN` |
| `capacity` | decimal | ❌ | Sức chứa (m³) |
| `locationId` | Guid (FK) | ❌ | FK → Location entity |
| `isActive` | boolean | ✅ | Default: true |
| `contactPhone` | string | ❌ | Tối đa 20 ký tự |
| `contactEmail` | string | ❌ | Tối đa 100 ký tự, valid email |

**FormCodes** (theo convention `[SCHEMA][TABLE][G|S][SEQ]`):
- Grid: `CATWARG01`
- Search: `CATWARS01`

### 3.2 Prompt Mẫu Cho `/team`

> 💡 **Copy và dùng trực tiếp** — Đây là prompt đã được tối ưu để Team Agent hiểu rõ yêu cầu.

```
/team Tạo tính năng quản lý Warehouses (Kho hàng) Full Stack — Backend .NET 10 + Frontend React 19

## Mô tả
Cần implement đầy đủ CRUD cho entity Warehouse trong schema masterdata (cat).

## Entity Fields
- code: string, required, maxLength=20, unique per tenant
- name: string, required, maxLength=200
- address: string, optional, maxLength=500
- warehouseType: enum (BONDED=1, GENERAL=2, COLD_CHAIN=3), required
- capacity: decimal, optional (đơn vị: m³)
- locationId: Guid, optional, FK → cat.location (DeleteBehavior.Restrict)
- isActive: bool, required, default=true
- contactPhone: string, optional, maxLength=20
- contactEmail: string, optional, maxLength=100, valid email format

## FormCodes
- Grid:   CATWARG01
- Search: CATWARS01

## Backend Requirements
- Kế thừa BaseSoftDeletedEntity
- FluentValidation cho Create/Update commands
- Unique check on code field
- FK validation: locationId phải tồn tại nếu được cung cấp
- DynamicGridQueryHandler cho listing
- QueryConfig JSON với JOIN to location table để lấy location name
- 8 endpoints chuẩn: GET /lookup, GET /, POST /search, GET /{id}, POST /, PUT /{id}, DELETE /{id}, DELETE /delete-multiple
- Migration tạo bảng cat.warehouses

## Frontend Requirements
- Zod entity schema + form schema (code, name, address, warehouseType, capacity, locationId, isActive, contactPhone, contactEmail)
- API layer đầy đủ
- ViewConfig với mode=dynamic, formCodes CATWARG01/CATWARS01
- Form fields: code/text, name/text, address/textarea(colSpan:2), warehouseType/select(3 options), capacity/number, locationId/select(dataSource:locations), isActive/switch, contactPhone/text, contactEmail/text
- i18n: tiếng Việt + tiếng Anh
- Route: /warehouses

## Tham khảo
Dùng Locations feature làm mẫu (code, name, address, type enum, FK countryId → locationId pattern tương tự)
```

### 3.3 AI Sẽ Tạo Ra ~25 Files

Sau khi nhận prompt trên, AI team sẽ tạo:

**Backend (~16 files):**
```
Domain/Entities/MasterData/Warehouse.cs
Domain.Shared/MasterData/WarehouseConsts.cs
Infrastructure/EntityConfigurations/WarehouseEntityConfiguration.cs
Infrastructure/Migrations/[timestamp]_AddWarehouseTable.cs
Infrastructure/DynamicQuery/Scripts/form_warehouse.sql  ← REQUIRED cho DynamicGrid
Application/Features/Warehouses/Commands/CreateWarehouse.cs
Application/Features/Warehouses/Commands/UpdateWarehouse.cs
Application/Features/Warehouses/Commands/DeleteWarehouse.cs
Application/Features/Warehouses/Commands/DeleteMultipleWarehouses.cs
Application/Features/Warehouses/Queries/GetWarehouseById.cs
Application/Features/Warehouses/Queries/GetWarehousesList.cs
Application/Features/Warehouses/Queries/GetWarehousesLookup.cs
Application/Features/Warehouses/Dtos/WarehouseDto.cs
Application/Features/Warehouses/Mappings/WarehouseMappings.cs
Api/Controllers/WarehousesController.cs
QueryConfigs/Warehouses.json
```

**Frontend (~10 files):**
```
features/warehouses/index.tsx
features/warehouses/data/schema.ts
features/warehouses/api/warehouses.ts
features/warehouses/config/warehouses-list.config.ts
features/warehouses/config/warehouses-input.config.ts
features/warehouses/components/warehouses-provider.tsx
features/warehouses/components/warehouses-dialogs.tsx
routes/_authenticated/warehouses/index.tsx
i18n/locales/vi/warehouses.json
i18n/locales/en/warehouses.json
```

> ⚠️ **Lưu ý quan trọng sau khi AI tạo xong**: Chạy `form_warehouse.sql` trên database để đăng ký form metadata. DynamicGrid không hiển thị data nếu thiếu bước này.

### 3.4 Prompt Cho Từng Agent Riêng Lẻ

Khi chỉ cần làm 1 layer (ví dụ đã có backend rồi, chỉ cần frontend):

**Chỉ Backend:**
```
/backend Tạo backend cho Warehouses entity theo Clean Architecture + CQRS:

Entity (cat schema, BaseSoftDeletedEntity):
  - code: string(20), unique
  - name: string(200)
  - warehouseType: enum (BONDED=1, GENERAL=2, COLD_CHAIN=3)
  - locationId: Guid? FK→Location, DeleteBehavior.Restrict
  - isActive: bool default=true
  [... thêm fields ...]

FormCodes: CATWARG01 (grid), CATWARS01 (search)
Tham khảo pattern từ Locations feature.
```

**Chỉ Frontend:**
```
/frontend Tạo frontend feature Warehouses:

API Contract (backend đã có):
  - GET    /api/warehouses/lookup  → LookupDto[]
  - GET    /api/warehouses         → DynamicGridResult
  - POST   /api/warehouses/search  → DynamicGridResult
  - GET    /api/warehouses/{id}    → WarehouseDto
  - POST   /api/warehouses         → Guid
  - PUT    /api/warehouses/{id}    → 204
  - DELETE /api/warehouses/{id}    → 204
  - DELETE /api/warehouses/delete-multiple → 204

WarehouseDto fields: id, code, name, address, warehouseType(1/2/3), 
  capacity, locationId, locationName, isActive, contactPhone, contactEmail

FormCodes: CATWARG01, CATWARS01
Form fields: [... mô tả như trên ...]
Route: /warehouses
i18n: vi + en
Tham khảo Locations feature.
```

---

## 4. Tips Viết Prompt Hiệu Quả

### 4.1 Nên làm

| ✅ Cách tốt | Giải thích |
|------------|-----------|
| Liệt kê rõ tất cả fields + types + constraints | AI tạo đúng validation ngay lần đầu |
| Chỉ rõ FK relationships và behavior (Restrict/Cascade) | Tránh migration sai |
| Nêu rõ enum values và numeric codes | Tránh AI tự đặt số |
| Chỉ rõ required/optional từng field | FluentValidation đúng ngay |
| Đề xuất feature tham khảo (`Dùng Locations làm mẫu`) | AI reuse đúng pattern |
| Cung cấp FormCodes theo đúng convention | Không phải sửa lại sau |

### 4.2 Không nên làm

| ❌ Cách tệ | Vấn đề |
|-----------|--------|
| "Tạo CRUD cho Warehouse" (quá mơ hồ) | AI phải đoán fields, thường sai |
| Không liệt kê enum values | AI đặt tên/số tùy ý |
| Không nêu FK | AI bỏ qua relationship |
| Không chỉ FormCode | AI đặt code sai convention |
| Yêu cầu quá nhiều thứ trong 1 prompt | Phức tạp, dễ bỏ sót |

### 4.3 Hai Lỗi Thường Gặp Sau Khi Tạo Feature

**Lỗi 1 — Grid trắng, không hiển thị data:**
> Nguyên nhân: Chưa chạy `form_[entity].sql` trên database.
> DynamicGrid load column metadata từ bảng `system.form` ở runtime — thiếu script này thì grid không có config để render.
> **Fix**: Tìm file `Infrastructure/DynamicQuery/Scripts/form_[entity].sql` và chạy trực tiếp trên DB.

**Lỗi 2 — i18n keys hiển thị raw (ví dụ `warehouses.fields.code` thay vì `Mã kho`):**
> Nguyên nhân: Namespace chưa đăng ký đủ 4 nơi.
> **Checklist**:
> 1. `src/i18n/locales/vi/[feature].json` và `en/[feature].json` — file đã tồn tại?
> 2. `src/i18n/index.ts` — namespace có trong `resources` và `ns` array? ← **Thiếu = ALL keys raw**
> 3. `src/lib/i18n-helpers.ts` — namespace có trong `namespacePrefixes` array? ← **Thiếu = ALL keys raw**
> 4. Zod form schema dùng factory function `createXxxSchema()` với `i18n.t()` messages? ← **Static = raw Zod errors**

### 4.4 Convention FormCode — Quick Reference

```
Format: [SCHEMA_3][TABLE][G|S][SEQ_2]

Schema prefix:
  CAT = masterdata (cat schema)
  OPS = operations (ops schema)
  SYS = system     (sys schema)

Table part (viết tắt tên bảng, độ dài thay đổi):
  LOC  → location
  CURR → currency
  PROD → product
  WARE → warehouse
  ORDE → order

G = Grid (danh sách), S = Search form

Ví dụ:
  CATWAREHG01 ← sai (quá dài, không phải viết tắt)
  CATWARG01   ← đúng (WARE = viết tắt warehouse)
  CATCURRG01  ← đúng (currency grid)
  OPSORDEG01  ← đúng (order grid trong ops schema)
```

### 4.5 Workflow Gợi Ý (với Governed Gates)

```
1. Dùng /team cho feature mới
        │
        ▼
2. 💾 Git Checkpoint tự động (stash/tag) → safe rollback point
        │
        ▼
3. Planner chạy (+ research codebase) → AI hiển thị Plan Summary:
        Risk Level / Scope / Files / DB Changes / Breaking Changes
        → Developer đọc plan tại docs/feature/<slug>/dev/plan.md
        → Xác nhận: "Yes proceed" hoặc yêu cầu điều chỉnh
        │
        ▼ (sau khi approve)
4. 🔎 Context Validation → verify context.json hợp lệ
        │
        ▼
5. Backend + Frontend chạy song song
   → Contract Gate tự động check
   → Build Gate tự động check (fail → re-spawn same agent, không dùng phantom agent)
   → Reviewer fix issues inline
   → Post-Review Contract Gate (nếu có cross-layer fix)
   → Tester tạo test files
   → Test Gate chạy dotnet test + pnpm test (fail → re-spawn Tester với debug prompt)
        │
        ▼
6. Nhận Summary:
   - Files created / Review issues fixed / Test results (PASS/FAIL) / Risk Level
   - context.json được giữ tại docs/feature/<slug>/dev/context.json
        │
        ▼
7. Nếu cần điều chỉnh từng layer:
   /backend  → Backend-only fix
   /frontend → Frontend-only fix
   /reviewer → Review riêng PR/file
   /codebase → Hỏi về kiến trúc
```

**Gates summary — không thể bỏ qua:**

| Gate | Khi nào | Pass condition |
|------|---------|---------------|
| 💾 Git Checkpoint | Trước Planning | `git stash` hoặc `git tag` (rollback point) |
| 🔐 Human Approval | Sau Planning | Developer confirm |
| 🔎 Context Validation | Sau Approval | context.json exists + valid + required fields + sql-seed rule |
| ✅ Contract Gate | Sau Implementation | BE endpoint = FE API call |
| ✅ Build Gate | Sau Contract Gate | `dotnet build` + `pnpm build` + lint |
| ✅ Post-Review Contract Gate | Sau Reviewer (nếu cross-layer fix) | Endpoint/DTO match |
| ✅ Test Gate | Sau Tester | `dotnet test` + `pnpm test` all pass |

---

## 5. Ví Dụ Kết Quả Thực Tế

Sau khi chạy `/team` với prompt Warehouses ở trên, developer nhận được:

**Thời gian**: ~5-10 phút (AI agents chạy song song)

**Kết quả**:
- ✅ 26 files được tạo đúng pattern
- ✅ Migration tạo bảng `cat.warehouses` với đúng columns + constraints
- ✅ `form_warehouse.sql` đăng ký FormCode metadata vào database
- ✅ 8 endpoints REST hoạt động ngay
- ✅ Form Add/Edit với validation đầy đủ
- ✅ Dynamic grid với columns theo FormCode
- ✅ Search form filter được
- ✅ Soft delete, bulk delete
- ✅ i18n Vietnamese + English (đăng ký đủ 3 nơi: locale files + index.ts + i18n-helpers.ts)
- ✅ Code review feedback từ Reviewer agent
- ✅ Unit test scenarios từ Tester agent

**So sánh với manual coding**:
| | Manual | AI-assisted |
|-|--------|-------------|
| Thời gian | 2-3 ngày | 1-2 giờ |
| Pattern consistency | Phụ thuộc developer | Nhất quán 100% |
| Test coverage | Thường bỏ qua | Auto-generated |
| Code review | Cần chờ peer | Ngay lập tức |

---

## 6. Liên Kết Tham Khảo

- Kiến trúc tổng quan: [`docs/shared/architecture-overview.md`](../shared/architecture-overview.md)
- Dynamic Query: [`docs/dynamic-query-research.md`](./dynamic-query-research.md)
- Backend skill chi tiết: [`.claude/skills/backend/SKILL.md`](../.claude/skills/backend/SKILL.md)
- Frontend skill chi tiết: [`.claude/skills/frontend/SKILL.md`](../.claude/skills/frontend/SKILL.md)
- Backend feature guide: [`backend/docs/masterdata/masterdata-feature-dev-guide.md`](../backend/docs/masterdata/masterdata-feature-dev-guide.md)
- Frontend feature playbook: [`frontend/docs/architecture/create-new-feature-playbook.md`](../frontend/docs/architecture/create-new-feature-playbook.md)
