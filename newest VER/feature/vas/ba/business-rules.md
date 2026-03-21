# VAS Module — Business Rules

> **Version**: 1.0 | **Date**: 2026-03-18

---

## BR-VAS-001: BOM Uniqueness per Service Type + Target Item

| Attribute | Value |
|-----------|-------|
| **Category** | Constraint |
| **Description** | Trong 1 tenant, mỗi tổ hợp (service_type, target_item_id) chỉ được có 1 BOM với is_active=true. |
| **Trigger** | Tạo mới BOM hoặc activate BOM |
| **Implementation** | UNIQUE INDEX trên (tenant_id, service_type, target_item_id) WHERE is_active=true |
| **Exception** | Không có |
| **Source** | Operations |

---

## BR-VAS-002: BOM Deactivation Guard

| Attribute | Value |
|-----------|-------|
| **Category** | Constraint |
| **Description** | BOM không thể deactivate khi có VWO đang ở trạng thái CONFIRMED hoặc IN_PROGRESS sử dụng BOM đó. |
| **Trigger** | Deactivate BOM |
| **Check** | SELECT COUNT(*) FROM vas_work_order WHERE bom_id=? AND status IN ('CONFIRMED','IN_PROGRESS') |
| **Exception** | Không có |
| **Source** | Operations |

---

## BR-VAS-003: WO Confirm — Available Qty Check

| Attribute | Value |
|-----------|-------|
| **Category** | Validation |
| **Description** | Khi WO được CONFIRMED, với mỗi source lot được chọn, available_qty của lot đó phải ≥ qty được phân bổ cho lot đó. |
| **Trigger** | WO Confirm action |
| **Formula** | planned_qty_per_lot = user_input_allocation_qty |
| **Check** | available_qty = physical_qty - reserved_qty - allocated_qty |
| **Exception** | CLIENT_OWNED packaging: bỏ qua kiểm tra |
| **Source** | Inventory Golden Rules |

---

## BR-VAS-004: Session Confirm — Input Completeness

| Attribute | Value |
|-----------|-------|
| **Category** | Validation |
| **Description** | Session không thể CONFIRMED nếu bất kỳ điều kiện sau đúng: (a) output_qty ≤ 0, (b) target_location_id chưa chọn, (c) bất kỳ session_line nào có consumed_qty ≤ 0, (d) bất kỳ session_line nào có source_location_id chưa chọn. |
| **Trigger** | Session Confirm action |
| **Exception** | CLIENT_OWNED packaging: không cần session_line → không apply rule (c) và (d) |
| **Source** | Operations |

---

## BR-VAS-005: CLIENT_OWNED Packaging — Không Tạo InventTrans

| Attribute | Value |
|-----------|-------|
| **Category** | Derivation |
| **Description** | Với BOM line có packaging_ownership = CLIENT_OWNED, khi session CONFIRMED, hệ thống không tạo session_line và không tạo InventTrans ISSUE cho vật tư đó. |
| **Trigger** | Session Confirm |
| **Exception** | Không có |
| **Source** | Decision D-05 (adapted) |

---

## BR-VAS-006: DE_BAGGING — Bao Rỗng Không Nhập Kho

| Attribute | Value |
|-----------|-------|
| **Category** | Constraint |
| **Description** | Với VAS service_type = DE_BAGGING, sau khi rã bao, bao bì rỗng bị bỏ đi. Hệ thống không tạo InventTrans RECEIPT cho bao bì rỗng. |
| **Trigger** | Session Confirm, khi service_type = DE_BAGGING |
| **Exception** | Không có. Nếu tương lai cần tái sử dụng bao rỗng → phải tạo thêm VAS type mới. |
| **Source** | Operations (confirmed 2026-03-18) |

---

## BR-VAS-007: WO Completion Guard

| Attribute | Value |
|-----------|-------|
| **Category** | Sequencing |
| **Description** | WO chỉ có thể COMPLETED khi tất cả sessions thuộc WO đó có status CONFIRMED (không có session OPEN hoặc CANCELLED nào còn tồn tại ở OPEN). |
| **Trigger** | Complete WO action |
| **Check** | SELECT COUNT(*) FROM vas_session WHERE vwo_id=? AND status='OPEN' = 0 |
| **Exception** | Không có |
| **Source** | Operations |

---

## BR-VAS-008: Billing Trigger khi WO Completed

| Attribute | Value |
|-----------|-------|
| **Category** | Sequencing |
| **Description** | Khi WO → COMPLETED, hệ thống tạo billing_transaction với fee_type=VAS, quantity=actual_qty, rate từ billing_contract active của owner. |
| **Trigger** | WO status chuyển sang COMPLETED |
| **Exception** | Nếu không có billing_contract active cho owner: WO vẫn COMPLETED, billing_transaction không tạo, cảnh báo hiển thị cho manager. |
| **Source** | Billing Module |

---

## BR-VAS-009: Confirmed Session Immutable

| Attribute | Value |
|-----------|-------|
| **Category** | Constraint |
| **Description** | Session đã CONFIRMED không thể chỉnh sửa. Không thể update consumed_qty, output_qty, location. InventTrans đã tạo không thể xóa. |
| **Trigger** | Mọi request update trên session có status=CONFIRMED |
| **Correction Process** | Cancel session (tạo đảo chiều InventTrans) → tạo session mới với thông tin đúng. |
| **Exception** | System admin có thể force-cancel qua audit trail. |
| **Source** | Audit & Compliance |

---

## BR-VAS-010: Session Confirm — Available Qty per Lot per Line

| Attribute | Value |
|-----------|-------|
| **Category** | Validation |
| **Description** | Khi operator nhập consumed_qty cho từng lot trong session confirm, hệ thống kiểm tra available_qty của lot đó tại thời điểm confirm ≥ consumed_qty. |
| **Trigger** | Session Confirm action |
| **Formula** | available_qty = physical_qty - reserved_qty - allocated_qty (tính từ invent_trans, không từ on_hand cache) |
| **Exception** | Không có |
| **Source** | Inventory Golden Rules (RULE 5 — Concurrency Safety) |

---

## Waste Calculation (Báo cáo, không phải Business Rule)

Waste không có InventTrans riêng. Waste được phản ánh trực tiếp qua consumed_qty:

```
Waste per session line = consumed_qty − (session.output_qty × bom_line.qty_ratio)

VD: output = 5,000 kg, qty_ratio = 1.0 → lý thuyết cần 5,000 kg bulk
    consumed_qty = 5,050 kg → waste = 50 kg
    → InventTrans ISSUE = 5,050 kg (actual deducted from inventory)
```

Waste report: aggregate theo WO, session, hoặc date range.

---

## InventTrans Reference Convention

| Field | Value |
|-------|-------|
| `ref_type` | VAS |
| `ref_id` | `vas_session.id` |
| `trans_type` | ISSUE (for source materials) / RECEIPT (for target item) |
| `stage` | DEDUCTED (for issue) / PHYSICAL (for receipt) |

> **Note**: `invent_trans.ref_type` ENUM cần extend thêm giá trị `VAS` (hiện chỉ có INBOUND, OUTBOUND, TRANSFER, ADJUSTMENT).
