# Hướng Dẫn Sử Dụng AI Agent Team — Smartlog

> **Đối tượng**: Tất cả thành viên (Developer, BA, QA, PM, Research, Rollout)
> **Cập nhật**: 2026-03-08

---

## 1. Tổng Quan

Smartlog được trang bị **15 AI agents chuyên biệt**, chia thành 6 team. Mỗi agent có kiến thức riêng về domain của mình và giao tiếp qua **handoff protocol** — agent trước output tín hiệu, agent sau đọc và tiếp tục.

```
                         Bạn (người dùng)
                              │
                   ┌──────────┴──────────┐
                   │                     │
            Cần cross-team?        Chỉ 1 team?
                   │                     │
           /delivery-team          Gọi skill trực tiếp
           (full lifecycle)        (/ba-analyst, /backend, ...)
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
 Research → BA → PM → DEV → QA → Rollout
```

**Nguyên tắc sử dụng:**
- Biết cần gì → gọi skill riêng lẻ (nhanh, trực tiếp)
- Cần nhiều team phối hợp → gọi `/delivery-team` (tự điều phối)
- Chỉ cần code → gọi `/team` (DEV pipeline: plan → code → review → test)

---

## 2. Bảng Tra Cứu Nhanh — Khi Nào Dùng Skill Nào?

### Theo Vai Trò

| Bạn là... | Thường dùng | Prompt mẫu |
|-----------|-------------|------------|
| **BA** | `/ba-analyst` | `/ba-analyst Viết spec cho tính năng quản lý kho hàng` |
| **Developer** | `/team`, `/backend`, `/frontend`, `/debugger` | `/team Tạo CRUD cho entity Warehouse full stack` |
| **QA** | `/qa-planner`, `/qa-executor` | `/qa-planner Tạo test plan cho feature Warehouses` |
| **PM** | `/pm-delivery` | `/pm-delivery Tạo status report sprint 5` |
| **Researcher** | `/research-ideation` | `/research-ideation So sánh SignalR vs gRPC cho realtime` |
| **Triển khai** | `/implementation-rollout` | `/implementation-rollout Chuẩn bị UAT cho tính năng Warehouses` |

### Theo Nhu Cầu

| Tôi muốn... | Gọi | Team |
|-------------|-----|------|
| Phân tích yêu cầu, viết user story | `/ba-analyst` | BA |
| Lên kế hoạch kỹ thuật | `/planner` | DEV |
| Code backend (.NET) | `/backend` | DEV |
| Code frontend (React) | `/frontend` | DEV |
| Code cả backend + frontend | `/team` | DEV |
| Review code | `/reviewer` | DEV |
| Debug & fix bug | `/debugger` | DEV |
| Viết unit test | `/tester` | DEV |
| Lên test plan, test cases | `/qa-planner` | QA |
| Chạy test, ghi bug report | `/qa-executor` | QA |
| So sánh công nghệ, nghiên cứu | `/research-ideation` | Research |
| Theo dõi tiến độ, RAID log | `/pm-delivery` | PM |
| Chuẩn bị UAT, thu feedback | `/implementation-rollout` | Rollout |
| Hỏi về kiến trúc project | `/codebase` | DEV |
| Chạy toàn bộ quy trình | `/delivery-team` | All |

---

## 3. Cách Gọi Skill

### 3.1 Gọi skill riêng lẻ

Gõ `/tên-skill` kèm mô tả yêu cầu:

```
/ba-analyst Viết spec cho tính năng quản lý Container:
- Container có: code (unique), name, size (20ft/40ft/40HC), type (DRY/REEFER), weight
- FK tới Location (nơi đặt container)
- Cần user stories và acceptance criteria
```

```
/backend Tạo backend cho Warehouses entity:
- Entity: code string(20) unique, name string(200), warehouseType enum (BONDED=1, GENERAL=2)
- FK: locationId → Location, DeleteBehavior.Restrict
- FormCodes: CATWARG01 (grid), CATWARS01 (search)
- Tham khảo Locations feature
```

```
/qa-planner Tạo test plan cho feature Warehouses:
- Spec: docs/feature/warehouses/ba/spec.md
- Focus: CRUD operations, validation rules, FK constraints
```

### 3.2 Gọi DEV pipeline (`/team`)

Khi cần code cả backend + frontend trong 1 lần:

```
/team Tạo tính năng quản lý Warehouses Full Stack

## Entity Fields
- code: string, required, maxLength=20, unique
- name: string, required, maxLength=200
- warehouseType: enum (BONDED=1, GENERAL=2, COLD_CHAIN=3)
- locationId: Guid, optional, FK → Location

## FormCodes
- Grid: CATWARG01, Search: CATWARS01

## Tham khảo
Dùng Locations feature làm mẫu
```

Pipeline tự động: Plan → Approve → Backend ∥ Frontend → Review → Test

### 3.3 Gọi full lifecycle (`/delivery-team`)

Khi cần phối hợp nhiều team từ đầu đến cuối:

```
/delivery-team Tính năng quản lý Booking (end-to-end)

Cần:
- Research: so sánh cách thiết kế booking workflow
- BA: viết spec đầy đủ
- PM: theo dõi tiến độ
- DEV: implement full stack
- QA: test plan + execution
- Rollout: chuẩn bị UAT cho khách hàng
```

### 3.4 Auto-Parallel — Claude tự chạy song song

**Bạn không cần yêu cầu** — Claude tự phân tích dependency và chạy song song khi có thể. Ví dụ khi bạn gọi `/team` cho full-stack feature, Claude tự động:

```
/planner (tuần tự — cần context trước)
    ↓
/backend ∥ /frontend  ← TỰ ĐỘNG song song
    ↓
/reviewer (tuần tự — cần code xong)
    ↓
/tester (tuần tự — cần reviewed code)
```

#### Nhóm tự động song song

| Nhóm | Agents | Claude tự trigger khi |
|------|--------|----------------------|
| Implementation | `/backend` ∥ `/frontend` | Full-stack task, sau khi planner xong |
| Post-DEV | `/qa-planner` ∥ `/pm-delivery` | Sau khi DEV complete |
| Multi-review | `/reviewer` x N | Feature phức tạp (5+ files hoặc 3+ layers) |
| Early phases | `/research-ideation` ∥ `/ba-analyst` | Cả hai cần thiết và research không block spec |

#### Luôn tuần tự (có dependency)

```
/planner → /backend ∥ /frontend → /reviewer → /tester
/ba-analyst → /planner (cần spec trước)
/qa-planner → /qa-executor (cần test cases trước)
/debugger → /tester (verify fix)
```

> **Lưu ý**: Bạn vẫn có thể ép chạy song song bằng cách liệt kê rõ, nhưng thường không cần — Claude tự xử lý.

> **Tip**: `/team` và `/delivery-team` tự xử lý parallel/sequential — chỉ cần gọi 1 lệnh.

---

## 4. Quy Trình Full Lifecycle

```
 ┌─────────────────────────────────────────────────────────────────┐
 │  /delivery-team (Cross-Team Orchestrator)                       │
 │                                                                 │
 │  1. Research (nếu cần)                                          │
 │     └─ /research-ideation → RECOMMENDATION                     │
 │                                                                 │
 │  2. BA — Viết spec                                              │
 │     └─ /ba-analyst → spec.md, stories.md                        │
 │     ══ SPEC APPROVAL ══ (bạn phải approve spec)                 │
 │                                                                 │
 │  3. PM — Theo dõi (song song với DEV)                           │
 │     └─ /pm-delivery → RAID log, status                          │
 │     ══ SCOPE LOCK ══ (PM xác nhận scope frozen)                 │
 │                                                                 │
 │  4. DEV — Code                                                  │
 │     └─ /team → plan → backend ∥ frontend → review → test        │
 │     ══ QA ENTRY ══ (build + unit test phải pass)                │
 │                                                                 │
 │  5. QA — Test                                                   │
 │     └─ /qa-planner → test plan                                  │
 │     └─ /qa-executor → execution report, bug reports             │
 │                                                                 │
 │  6. Rollout — UAT                                               │
 │     └─ /implementation-rollout → UAT guide, feedback            │
 │     ══ UAT SIGNOFF ══ (stakeholder approve)                     │
 │     ══ FEEDBACK ROUTING ══                                      │
 │        Bug → /qa-executor                                       │
 │        Change Request → /ba-analyst                             │
 │        Enhancement → PM backlog                                 │
 └─────────────────────────────────────────────────────────────────┘
```

### Gates (cổng kiểm soát)

Mỗi giai đoạn có gate — **không thể bỏ qua**:

| Gate | Giữa | Điều kiện pass |
|------|-------|---------------|
| Spec Approval | BA → DEV | Bạn approve spec |
| Scope Lock | PM → DEV | PM xác nhận không thêm scope |
| QA Entry | DEV → QA | Build pass + unit test pass |
| UAT Signoff | Rollout → Release | UAT pass + feedback đã phân loại |

---

## 5. Artifacts — File Được Tạo Ra Ở Đâu?

Mỗi feature tạo artifacts trong `docs/feature/<slug>/`:

```
docs/feature/warehouses/
├── research/              ← Nghiên cứu (nếu có)
│   ├── research.md
│   └── adr.md
├── ba/                    ← Đặc tả nghiệp vụ
│   ├── spec.md
│   └── stories.md
├── pm/                    ← Quản lý dự án
│   ├── status.md
│   ├── raid.md
│   └── change-requests/
├── dev/                   ← Code & kỹ thuật
│   ├── plan.md
│   ├── context.json
│   └── tasks.md
├── qa/                    ← Kiểm thử
│   ├── test-plan.md
│   ├── test-cases.md
│   ├── execution-report.md
│   └── bugs/
└── rollout/               ← Triển khai
    ├── uat-session-log.md
    ├── feedback-report.md
    └── feature-guides/
```

---

## 6. Ví Dụ Prompt Theo Tình Huống

### Tôi có ý tưởng mới, chưa rõ nên làm gì

```
/research-ideation Đánh giá nên dùng SignalR hay gRPC cho realtime notification
trong Smartlog. Cần xét: performance, learning curve, tích hợp với .NET 10 + React 19
```

### Tôi có yêu cầu từ khách hàng, cần viết spec

```
/ba-analyst Khách hàng muốn quản lý Container trong hệ thống.
Container có mã (unique), tên, kích thước (20ft/40ft/40HC), loại (DRY/REEFER/OPEN_TOP).
Mỗi container thuộc 1 Location. Cần CRUD đầy đủ + tìm kiếm theo loại.
```

### Spec đã có, cần code ngay

```
/team Implement feature Containers theo spec tại docs/feature/containers/ba/spec.md
Tham khảo Locations feature làm mẫu.
```

### Code xong, cần QA test

```
/qa-planner Tạo test plan cho feature Containers.
Spec: docs/feature/containers/ba/spec.md
Context: docs/feature/containers/dev/context.json
```

### QA xong, chuẩn bị UAT cho khách

```
/implementation-rollout Chuẩn bị UAT session cho feature Containers.
Đọc spec + test cases để tạo demo script và scenarios cho khách hàng.
```

### Cần theo dõi tiến độ sprint

```
/pm-delivery Tạo status report cho sprint hiện tại.
Features đang làm: Containers (70%), Bookings (30%).
Blocker: API gateway chưa sẵn sàng.
```

### Có bug cần fix

```
/debugger API trả về 500 khi tạo mới Warehouse.
Error: "Object reference not set to an instance of an object"
Steps: POST /api/warehouses với body { code: "WH001", name: "Kho 1" }
Environment: local dev
```

### Hỏi về kiến trúc project

```
/codebase Giải thích cách DynamicGrid hoạt động trong backend.
FormCode là gì và flow từ backend → frontend như thế nào?
```

---

## 7. Tips Viết Prompt Hiệu Quả

| Nên | Không nên |
|-----|-----------|
| Liệt kê rõ fields + types + constraints | Viết mơ hồ "tạo CRUD cho X" |
| Chỉ rõ FK relationships | Bỏ qua relationships |
| Nêu FormCodes theo convention | Để AI tự đặt FormCode |
| Chỉ feature tham khảo ("dùng Locations làm mẫu") | Không cho context |
| Mô tả enum values cụ thể (BONDED=1, GENERAL=2) | Để AI tự đoán enum |
| Chia nhỏ nếu yêu cầu phức tạp | Nhồi quá nhiều vào 1 prompt |

### Convention FormCode

```
Format: [SCHEMA][TABLE][G|S][SEQ]

Schema:  CAT = masterdata, OPS = operations, SYS = system
Table:   4 ký tự viết tắt (LOC, CURR, WARE, CONT, BOOK...)
G = Grid, S = Search
SEQ:     01, 02...

Ví dụ:   CATWARG01 (warehouse grid), CATCONTS01 (container search)
```

---

## 8. Bảng Tổng Kết 15 Skills

| # | Skill | Mô tả | Team |
|---|-------|-------|------|
| 1 | `/delivery-team` | Điều phối toàn bộ lifecycle cross-team | All |
| 2 | `/team` | Pipeline DEV tự động (plan→code→review→test) | DEV |
| 3 | `/ba-analyst` | Phân tích yêu cầu, viết spec, user stories | BA |
| 4 | `/planner` | Lên kế hoạch kỹ thuật, thiết kế giải pháp | DEV |
| 5 | `/backend` | Code .NET 10 (entity, CQRS, EF Core, API) | DEV |
| 6 | `/frontend` | Code React 19 (component, Zod, ViewConfig, i18n) | DEV |
| 7 | `/reviewer` | Review code, kiểm tra pattern, security | DEV |
| 8 | `/tester` | Viết unit test, integration test | DEV |
| 9 | `/debugger` | Điều tra bug, root cause analysis, fix & verify | DEV |
| 10 | `/qa-planner` | Lên test plan, thiết kế test cases | QA |
| 11 | `/qa-executor` | Chạy test, ghi bug report, triage defect | QA |
| 12 | `/research-ideation` | Nghiên cứu công nghệ, so sánh giải pháp | Research |
| 13 | `/pm-delivery` | Theo dõi milestone, RAID, status report | PM |
| 14 | `/implementation-rollout` | Hỗ trợ UAT, thu feedback khách hàng | Rollout |
| 15 | `/codebase` | Tra cứu kiến trúc, conventions, commands | DEV |

---

## 9. FAQ

**Q: Khi nào dùng `/team` vs `/delivery-team`?**
- `/team` = chỉ code (plan → backend/frontend → review → test)
- `/delivery-team` = toàn bộ quy trình (research → BA → PM → DEV → QA → rollout)

**Q: Khi nào dùng `/tester` vs `/qa-planner`?**
- `/tester` = viết code test (xUnit, vitest) — automated tests
- `/qa-planner` = thiết kế test plan, test cases — business-level testing

**Q: Khi nào dùng `/ba-analyst` vs `/planner`?**
- `/ba-analyst` = "Cần build gì? User cần gì?" — nghiệp vụ
- `/planner` = "Build như thế nào? Code structure?" — kỹ thuật

**Q: Tôi chỉ muốn hỏi về project, không cần build gì?**
- Dùng `/codebase` để tra cứu kiến trúc, conventions, naming rules

**Q: Khi nào dùng `/debugger` vs tự fix?**
- `/debugger` = bug phức tạp, cần điều tra root cause, trace qua nhiều layer
- Tự fix = lỗi đơn giản, rõ ràng, chỉ cần sửa 1 chỗ

**Q: Feedback từ UAT đi đâu?**
- Bug → `/qa-executor` ghi bug report
- Change Request → `/ba-analyst` cập nhật spec
- Enhancement → PM backlog (tính năng mới, chưa ưu tiên)
- Question → cập nhật feature guide

**Q: File tạo ra lưu ở đâu?**
- Tất cả artifacts theo feature: `docs/feature/<slug>/<team>/`
- Lessons per team: `docs/lessons/<team>.md`
- Shared knowledge: `docs/shared/`
