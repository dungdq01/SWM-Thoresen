# Kiến Trúc Hệ Thống — Smartlog CodeBase

> **Mục tiêu tài liệu**: Giải thích các thành phần chính của Backend (.NET 10) và Frontend (React 19), lý do chọn từng pattern kiến trúc, và cách hai lớp này kết nối với nhau.

---

## 1. Tổng Quan Hệ Thống

```
┌─────────────────────────────────────────────────────────────────┐
│                     SMARTLOG CODEBASE                               │
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────────┐    │
│  │   FRONTEND           │      │   BACKEND                │    │
│  │   React 19 + Vite    │◄────►│   .NET 10 Web API        │    │
│  │   TanStack Router    │ HTTP │   Clean Architecture     │    │
│  │   Shadcn UI          │ JSON │   CQRS + Dynamic Query   │    │
│  └──────────────────────┘      └──────────────────────────┘    │
│                                           │                     │
│                                           ▼                     │
│                                ┌──────────────────────┐        │
│                                │   PostgreSQL         │        │
│                                │   Schema: cat/ops/sys│        │
│                                └──────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

| Lớp | Công nghệ | Pattern |
|-----|-----------|---------|
| API | .NET 10 Web API | RESTful, JWT Auth |
| Business | .NET 10 Application | CQRS, Vertical Slice |
| Database | PostgreSQL + EF Core 10 | Repository-free, trực tiếp DbContext |
| UI | React 19 + TypeScript | Factory Pattern, Config-Driven |
| State | TanStack Query + Zustand | Server State / Client State tách biệt |
| Forms | React Hook Form + Zod | Schema-first validation |

---

## 2. Backend — .NET 10 Web API

### 2.1 Cấu trúc 7 Projects

```
Smartlog.sln
├── Smartlog.Api                  ← Entry point (Controllers, middleware)
├── Smartlog.Application          ← Business logic (CQRS Handlers)
├── Smartlog.Application.Contracts← Shared DTOs, pagination interfaces
├── Smartlog.Domain               ← Entities, domain interfaces
├── Smartlog.Domain.Shared        ← Constants, enums, assembly markers
├── Smartlog.Infrastructure       ← EF Core, Refit clients, Caching, RabbitMQ
└── Smartlog.DynamicQuery         ← Dynamic SQL engine (xem docs riêng)
```

**Dependency Flow (quan trọng):**
```
Api → Infrastructure → Application → Domain
                     ↗
        Application.Contracts
        DynamicQuery (cross-cutting)
```

> **Nguyên tắc**: Lớp bên trong KHÔNG biết đến lớp bên ngoài. Domain không phụ thuộc Infrastructure.

### 2.2 Clean Architecture + CQRS

**Tại sao Clean Architecture?**
- Tách biệt rõ ràng business logic (Application) khỏi infrastructure (DB, cache, external services)
- Dễ thay thế PostgreSQL bằng DB khác mà không sửa business logic
- Dễ viết unit test vì dependencies đều là interfaces

**Tại sao CQRS (Command Query Responsibility Segregation)?**

| Command (ghi dữ liệu) | Query (đọc dữ liệu) |
|----------------------|---------------------|
| CreateLocation | GetLocationById |
| UpdateLocation | GetLocationsList |
| DeleteLocation | GetLocationsLookup |
| DeleteMultipleLocations | — |

- **Command** → Validate → Business rules → Save → Trả về minimal result
- **Query** → Fetch data → Map to DTO → Trả về data (không có side effects)
- Mỗi operation tự chứa hoàn toàn trong 1 file (Vertical Slice)

### 2.3 Vertical Slice — Cấu trúc Feature

Mỗi entity có **1 folder riêng** trong `Application/Features/`, chứa tất cả mọi thứ:

```
Application/Features/Locations/
├── Commands/
│   ├── CreateLocation.cs          ← Command record + Validator + Handler (1 file)
│   ├── UpdateLocation.cs
│   ├── DeleteLocation.cs
│   └── DeleteMultipleLocations.cs
├── Queries/
│   ├── GetLocationById.cs         ← Query record + Handler
│   ├── GetLocationsList.cs        ← Dùng DynamicGridQueryHandler
│   └── GetLocationsLookup.cs      ← Trả về {id, code, name} cho dropdown
├── Dtos/
│   └── LocationDto.cs
└── Mappings/
    └── LocationMappings.cs        ← Static extension methods (KHÔNG dùng AutoMapper)
```

> **Triết lý**: "Một tính năng mới = thêm file mới, không sửa file cũ". Ít breaking changes, dễ code review.

### 2.4 Entity Hierarchy

```
Entity (abstract)
  └── BaseEntity
        Fields: Id (Guid), CreatedTime, CreatedBy, UpdatedTime, UpdatedBy, RowVersion
        └── BaseSoftDeletedEntity
              Fields thêm: DeletedTime, DeletedBy
              → Tất cả Masterdata entities kế thừa lớp này
```

**Soft Delete** — Thay vì xóa thật, entity được đánh dấu `DeletedTime/DeletedBy`. Điều này:
- Giữ audit trail đầy đủ
- Cho phép khôi phục dữ liệu
- Tương thích với referential integrity (báo cáo lịch sử vẫn xem được)

**Audit tự động** — `AppDbContext` tự điền `CreatedTime`, `CreatedBy`, `UpdatedTime`, `UpdatedBy` khi `SaveChangesAsync()` — developer không cần nhớ set thủ công.

### 2.5 API Convention

Mọi entity tuân theo cùng 1 chuẩn endpoint:

| Method | Path | Mô tả | Response |
|--------|------|--------|----------|
| GET | `/api/{entities}/lookup` | Dropdown data | `LookupDto[]` |
| GET | `/api/{entities}` | Danh sách (dynamic grid) | `DynamicGridResult` |
| POST | `/api/{entities}/search` | Danh sách có filter | `DynamicGridResult` |
| GET | `/api/{entities}/{id}` | Chi tiết 1 bản ghi | `EntityDto` |
| POST | `/api/{entities}` | Tạo mới | `Guid` (HTTP 201) |
| PUT | `/api/{entities}/{id}` | Cập nhật | HTTP 204 |
| DELETE | `/api/{entities}/{id}` | Xóa mềm | HTTP 204 |
| DELETE | `/api/{entities}/delete-multiple` | Xóa nhiều | HTTP 204 |

Mọi response đều được wrap trong `ApiResult<T>` — nhất quán xử lý lỗi ở frontend.

### 2.6 Pipeline Behaviors — Middleware cho CQRS

Mọi Command/Query đều tự động đi qua 3 tầng xử lý:

```
Request
  │
  ▼
[1] LoggingBehavior       ← Log request/response, tracing
  │
  ▼
[2] PerformanceBehavior   ← Cảnh báo nếu query > 500ms
  │
  ▼
[3] ValidationBehavior    ← FluentValidation tự động
  │
  ▼
Handler (business logic)
```

> Developer chỉ cần viết `FluentValidation` rules trong cùng file của Command/Query — hệ thống tự kích hoạt.

### 2.7 Infrastructure

| Thành phần | Công nghệ | Mục đích |
|-----------|-----------|---------|
| Database | PostgreSQL + EF Core 10 | ORM, migration |
| Schema | `cat` (masterdata), `ops` (operations), `sys` (system) | Namespace logic |
| Multi-tenant | Connection string từ JWT claims | Mỗi tenant có DB riêng |
| Auth | JWT Bearer (SmartlogAuth) | Xác thực, phân quyền |
| External API | Refit (HTTP client) | Gọi TenantAdmin, AuthAdmin |
| Cache | (cấu hình trong infrastructure) | Response caching |
| Events | RabbitMQ | Async messaging giữa services |
| Column naming | snake_case tự động | Chuẩn PostgreSQL convention |

---

## 3. Frontend — React 19 + TypeScript

### 3.1 Tech Stack

| Danh mục | Công nghệ | Vai trò |
|-----------|----------|--------|
| **Framework** | React 19 + TypeScript strict | UI rendering |
| **Build** | Vite + SWC | Dev server, bundler nhanh |
| **Routing** | TanStack Router (file-based) | Type-safe routing |
| **Server State** | TanStack Query v5 | Cache/sync data từ API |
| **Client State** | Zustand | Global UI state (dialogs, filters) |
| **Forms** | React Hook Form + Zod | Validation theo schema |
| **UI Components** | Shadcn UI + Radix | Accessible, headless components |
| **Styling** | TailwindCSS v4 | Utility-first CSS |
| **HTTP** | Axios | API calls, JWT injection tự động |
| **i18n** | i18next | Đa ngôn ngữ (Tiếng Việt + English) |

### 3.2 Cấu trúc `src/`

```
src/
├── core/                    ← 🔧 Dynamic UI Engine (trái tim hệ thống)
│   ├── builder/             ← ViewBuilder: render page từ config
│   ├── factories/           ← createEntityPage() — factory chính
│   ├── registry.ts          ← Map componentType → React component
│   ├── types.ts             ← ViewConfig, ComponentConfig contracts
│   ├── store/               ← Zustand stores (formConfig, search)
│   └── hooks/               ← use-view-data, use-entity-mutations
│
├── features/                ← 📦 Tính năng nghiệp vụ (20+ features)
│   └── {feature-name}/
│       ├── index.tsx        ← createEntityPage() call (entry point)
│       ├── api/             ← Axios API layer
│       ├── data/schema.ts   ← Hai Zod schemas (entity + form)
│       ├── config/          ← ViewConfig + FormFieldConfig
│       └── components/      ← Provider + Dialogs
│
├── components/              ← 🎨 Shared UI Components
│   ├── ui/                  ← Shadcn primitives
│   ├── layout/              ← AppShell, Sidebar, Header
│   └── data-table/          ← TanStack Table wrapper
│
├── routes/                  ← 🗺️ TanStack Router (file-based)
│   ├── _authenticated/      ← Protected routes
│   ├── (auth)/              ← Login, OAuth callback
│   └── (errors)/            ← 404, 403, 500
│
├── i18n/locales/            ← 🌐 Translations
│   ├── en/                  ← English JSON files
│   └── vi/                  ← Vietnamese JSON files
│
└── lib/                     ← 🛠️ Utilities
    ├── api-client.ts        ← Axios instance với JWT interceptor
    ├── react-query.ts       ← QueryClient cấu hình
    └── handle-server-error.ts ← Error parsing từ ApiResult<T>
```

### 3.3 Factory Pattern — `createEntityPage()`

Đây là **kiến trúc quan trọng nhất** của frontend. Thay vì viết component cho từng entity, mọi tính năng masterdata đều được tạo từ cùng 1 factory function.

**Cách hoạt động:**

```
createEntityPage({
  useEntityHook,    ← Context hook (dialog state management)
  Provider,         ← React Context provider
  DialogsComponent, ← CRUD dialogs (Add/Edit/Delete)
  listConfig,       ← ViewConfig object (định nghĩa layout + cột + search)
  api,              ← { search, deleteByIds, getRecord }
  exportConfig,     ← Cấu hình Excel export
  translationNs,    ← Namespace i18n
})
→ Returns: React Component hoàn chỉnh có đầy đủ CRUD
```

**Tại sao Factory Pattern?**
- 20+ entity, mỗi entity có cùng UI pattern: danh sách + search + add/edit/delete dialog
- Thay vì copy-paste component → tất cả dùng chung 1 implementation
- Bug fix ở factory → fix cho tất cả entity cùng lúc
- Thêm feature mới (ví dụ: audit log button) → thêm 1 lần vào factory

### 3.4 Config-Driven UI — ViewConfig

**Khái niệm**: Developer **viết config thay vì viết component**. `ViewBuilder` đọc config và render UI tương ứng.

```
ViewConfig (TypeScript object)
├── metadata
│   ├── mode: "dynamic"
│   └── requiredFormConfigs: ["CATLOCAG01", "CATLOCAS01"]  ← Load từ backend
├── layout
│   ├── header
│   │   ├── page-title: "Locations"
│   │   ├── toolbar: [add-button, export-button]
│   │   └── quick-search
│   └── content
│       ├── search-form: formCode "CATLOCAS01"  ← Dynamic search form
│       └── data-grid:   formCode "CATLOCAG01"  ← Dynamic columns
│           ├── row-actions: [edit, delete]
│           └── bulk-actions: [delete-batch]
└── footer: pagination
```

`ViewBuilder` nhận `ViewConfig` này và render đúng các React components cần thiết — developer KHÔNG viết JSX.

### 3.5 Hai Zod Schemas

Mỗi feature có **2 Zod schemas tách biệt**:

| Schema | Mục đích | Fields |
|--------|---------|--------|
| `entitySchema` | Validate data từ API | Tất cả fields (id, code, name, audit...) |
| `formSchema` | Validate input người dùng | Chỉ editable fields + validation rules |

Lý do tách: Data từ API có thể chứa `id`, `createdBy`, `rowVersion` — không cần expose lên form. Form schema chỉ validate những gì user nhập.

```
type LocationEntity = z.infer<typeof locationSchema>   ← Type-safe API response
type LocationForm   = z.infer<typeof locationFormSchema> ← Type-safe form values
```

### 3.6 Server State vs Client State

| State | Công nghệ | Ví dụ |
|-------|----------|-------|
| **Server State** | TanStack Query | Danh sách locations, lookup data |
| **Client State** | Zustand | Dialog open/close, selected rows |
| **Form State** | React Hook Form | Input values, validation errors |
| **Route State** | TanStack Router | URL params, search filters |

> **Nguyên tắc**: Không lưu server data vào Zustand. TanStack Query tự cache và invalidate.

---

## 4. Kết Nối Backend ↔ Frontend

### 4.1 FormCode Bridge

FormCode là "cầu nối" giữa 2 hệ thống, đảm bảo cấu hình nhất quán:

```
Backend (QueryConfig JSON)                Frontend (ViewConfig TypeScript)
─────────────────────────                ────────────────────────────────
"GRID_FORM_CODE": "CATLOCAG01"   ←───►  formCode: "CATLOCAG01"
"SEARCH_FORM_CODE": "CATLOCAS01" ←───►  formCode: "CATLOCAS01"
                                         requiredFormConfigs: [
                                           "CATLOCAG01", "CATLOCAS01"
                                         ]
```

Nếu FormCode sai hoặc thiếu → frontend không load được cột grid / search form.

### 4.2 API Contract

| Backend | Frontend |
|---------|---------|
| `ApiResult<T>` wrapper | `unwrapResponse()` helper |
| DTO fields: PascalCase | Zod schema: camelCase |
| Error: `BusinessRuleException` → 400 | `handleServerError()` → toast |
| Success POST: Guid (201) | Navigate + invalidate cache |
| Success PUT/DELETE: 204 | Invalidate cache + close dialog |

### 4.3 PascalCase ↔ camelCase

Backend trả về `{ "Code": "HAN", "CountryId": "..." }` (PascalCase C# convention).

Frontend Zod schema dùng `camelCase`. Trong Dialogs, `valueMapper` xử lý chuyển đổi:

```typescript
valueMapper: (row) => ({
  code:      row.Code,        // PascalCase → camelCase
  name:      row.Name,
  countryId: row.CountryId,
})
```

### 4.4 Data Flow End-to-End

```
1. User mở /locations
   │
2. TanStack Router load route component
   │
3. Locations component (createEntityPage) render
   │
4. ViewBuilder đọc locationsListConfig
   │
5. Fetch FormConfig từ backend (CATLOCAG01, CATLOCAS01)
   │
6. Render search form + data grid
   │
7. Data grid gọi POST /api/locations/search
   │
8. LocationsController → dispatcher → GetLocationsList handler
   │
9. DynamicGridQueryHandler:
     Load Locations.json → Build SQL → Dapper execute
   │
10. Trả về DynamicGridResult { items, columns, totalCount }
    │
11. Frontend render table với dynamic columns + pagination
    │
12. User click "Add" → LocationsDialogs mở
    │
13. Submit form → POST /api/locations → 201 Created
    │
14. TanStack Query invalidate cache → grid tự refresh
```

---

## 5. Điểm Mạnh Kiến Trúc

| Điểm mạnh | Backend | Frontend |
|-----------|---------|---------|
| **Thêm entity mới** | ~15 files, ~800 dòng (có template sẵn) | ~8 files, ~300 dòng (có template sẵn) |
| **Zero business logic duplicate** | CQRS — mỗi operation 1 handler | Factory — mọi entity dùng chung |
| **Type safety** | C# strong typing + FluentValidation | TypeScript strict + Zod schema |
| **Testability** | Handlers độc lập, dễ unit test | Components nhỏ, dễ test |
| **Scalability** | Multi-tenant DB, stateless API | TanStack Query cache, lazy routes |
| **Maintainability** | Vertical slice — tìm code dễ | Feature folder — tự chứa hoàn toàn |

---

## 6. Liên kết Tham Khảo

**Backend:**
- Kiến trúc chi tiết: [`backend/docs/project/project-architecture-guide.md`](../backend/docs/project/project-architecture-guide.md)
- Hướng dẫn thêm feature: [`backend/docs/project/new-feature-development-guide.md`](../backend/docs/project/new-feature-development-guide.md)
- Dynamic Query: [`docs/dynamic-query-research.md`](./dynamic-query-research.md)

**Frontend:**
- Kiến trúc frontend: [`frontend/docs/architecture/project-architecture-overview.md`](../frontend/docs/architecture/project-architecture-overview.md)
- Thêm feature mới: [`frontend/docs/architecture/create-new-feature-playbook.md`](../frontend/docs/architecture/create-new-feature-playbook.md)
- Dynamic UI Engine: [`frontend/docs/architecture/dynamic-ui-engine.md`](../frontend/docs/architecture/dynamic-ui-engine.md)
