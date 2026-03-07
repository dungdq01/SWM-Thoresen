# TVL SWM — Transaction Data Dictionary

| Key | Value |
|-----|-------|
| **Version** | 1.0 |
| **Date** | March 2026 |
| **Sheets** | invent_trans, on_hand, invent_dim, Event_Mapping, Idempotency_Rules, Audit_Log, Reconciliation_Rules, ENUM_Values, ERD_Reference, OnHand_Impact_Matrix |

---

## Sheet 1: invent_trans (22 fields)

| # | Field | Type | Constraint | Description |
|---|-------|------|-----------|-------------|
| 1 | id | UUID | PK | Khóa chính |
| 2 | trans_id | VARCHAR(30) | UNIQUE | TRX-YYYYMMDD-SEQ |
| 3 | posted_at | TIMESTAMPTZ | NOT NULL | Immutable sau post |
| 4 | ref_type | ENUM | NOT NULL | PO/ASN/SO/SHIPMENT/TRANSFER/ADJUSTMENT/CYCLE_COUNT/STATUS_CHANGE/MOVE |
| 5 | ref_id | VARCHAR(30) | NOT NULL | Header ID |
| 6 | ref_line_id | VARCHAR(30) | NULLABLE | Line ID (per line posting) |
| 7 | external_id | VARCHAR(50) | NULLABLE | Idempotency check |
| 8 | item_id | VARCHAR(50) | FK → item | 1 trans = 1 SKU |
| 9 | qty | DECIMAL(15,3) | NOT NULL | + = nhận, - = xuất |
| 10 | uom | VARCHAR(10) | FK, DEFAULT KG | Đơn vị |
| 11 | dim_from_id | UUID | FK → invent_dim | Source dimension |
| 12 | dim_to_id | UUID | FK → invent_dim | Target dimension |
| 13 | status_from | ENUM | NULLABLE | Trạng thái trước |
| 14 | status_to | ENUM | NOT NULL | Trạng thái sau |
| 15 | stage | ENUM | NOT NULL | EXPECTED/REGISTERED/PHYSICAL/DEDUCTED/CANCELLED |
| 16 | reason_code | VARCHAR(20) | FK, NULLABLE | BẮT BUỘC cho ADJUSTMENT |
| 17 | owner_id | VARCHAR(20) | FK, NOT NULL | Chủ hàng (denorm) |
| 18 | weighbridge_ticket_id | VARCHAR(30) | NULLABLE | Link phiếu cân |
| 19 | notes | VARCHAR(500) | NULLABLE | Ghi chú |
| 20 | created_by | UUID | FK → users | Người thực hiện |
| 21 | is_reversed | BOOLEAN | DEFAULT FALSE | Đã reverse? |
| 22 | reversed_by_trans_id | VARCHAR(30) | NULLABLE | Link trans reverse |

---

## Sheet 2: on_hand (11 fields)

| # | Field | Type | Description | Reconciliation Rule |
|---|-------|------|-------------|---------------------|
| 1 | id | UUID | PK | |
| 2 | item_id | VARCHAR(50) | FK → item | |
| 3 | invent_dim_id | UUID | FK → invent_dim. UNIQUE(item_id, invent_dim_id) | |
| 4 | **physical_qty** | DECIMAL(15,3) | Tồn kho vật lý | = SUM(trans WHERE stage=PHYSICAL) |
| 5 | **reserved_qty** | DECIMAL(15,3) | Đã reserve | = SUM(active allocations) |
| 6 | **available_qty** | DECIMAL(15,3) | Sẵn sàng | = physical - reserved |
| 7 | **ordered_qty** | DECIMAL(15,3) | Expected | = SUM(trans WHERE stage=EXPECTED) |
| 8 | uom | VARCHAR(10) | DEFAULT KG | |
| 9 | last_movement_at | TIMESTAMPTZ | Biến động cuối | |
| 10 | last_count_at | TIMESTAMPTZ | Kiểm kê cuối | |
| 11 | updated_at | TIMESTAMPTZ | Auto-update | |

---

## Sheet 3: invent_dim (11 fields)

| # | Field | Phase 1 TVL | Phase 2 |
|---|-------|-------------|---------|
| 1 | id (UUID PK) | Active | Active |
| 2 | dim_hash (SHA-256) | Active | Active |
| 3 | site_id | Always TVL-SITE | Multi-site? |
| 4 | **warehouse_id** | **BẮT BUỘC** | BẮT BUỘC |
| 5 | **location_id** | **BẮT BUỘC** | BẮT BUỘC |
| 6 | batch_id | **OFF** (NULL) | Xem xét bật |
| 7 | serial_id | OFF (NULL) | OFF |
| 8 | **inventory_status** | **4 status** | + WET, CONTAMINATED? |
| 9 | **owner_id** | **BẮT BUỘC** | BẮT BUỘC |
| 10 | config_id | OFF | Phase 2+ |
| 11 | created_at | Active | Active |

---

## Sheet 4: Event_Mapping (Tóm tắt)

### Inbound
| Event | InventTrans | OnHand |
|-------|------------|--------|
| 🟢 RECEIVED | POST PHYSICAL +qty | +physical, +available |
| 🚫 REJECTED | KHÔNG tạo | ZERO IMPACT |
| 🔵 PUTAWAY | MOVE (2 trans) | Net 0 (location change) |
| 🔴 Force Cancel | REVERSAL -qty | -physical |

### Outbound
| Event | InventTrans | OnHand |
|-------|------------|--------|
| CONFIRMED | EXPECTED -qty | +ordered |
| 🟡 ALLOCATED | REGISTERED -qty | -available, +reserved |
| 🟢 SHIPPED/line | POST PHYSICAL -qty | -physical, -reserved |
| 🔴 Force Cancel | REVERSAL +qty | +physical |

### Inventory
| Event | InventTrans | OnHand |
|-------|------------|--------|
| Internal Move | MOVE (2 trans) | LOC change |
| Status Change | STATUS_CHANGE | available thay đổi |
| Cycle Count ± | ADJUSTMENT ±qty | ±physical |
| Shrinkage | ADJUSTMENT -qty | -physical |

### Transfer
| Event | InventTrans | OnHand |
|-------|------------|--------|
| Ship (source) | -qty, AVAILABLE→IN_TRANSIT | -physical (source WH) |
| Receive (dest) | +qty, IN_TRANSIT→AVAILABLE | +physical (dest WH) |

### VAS/Bagging
| Event | InventTrans | OnHand |
|-------|------------|--------|
| Consume bulk | -consumed_qty | -physical (bulk SKU) |
| Produce bagged | +produced_qty | +physical (bag SKU) |
| Consume packaging | -pkg_qty (if TVL_OWNED) | -physical (pkg SKU) |

---

## Sheet 5: Idempotency_Rules (8 rules)

| Rule | Scope | Check | Response |
|------|-------|-------|----------|
| IDEM-001 | external_id | SELECT WHERE external_id exists | HTTP 409, return existing |
| IDEM-002 | trans_id | UNIQUE constraint | Retry new SEQ |
| IDEM-003 | WorkLine 1:1 | Check ref_line_id | Skip if exists |
| IDEM-004 | Receipt posting | Check ref_type+ref_id+line+PHYSICAL | Skip if posted |
| IDEM-005 | Shipment posting | Same pattern | Skip if posted |
| IDEM-006 | InventDim | dim_hash | Return existing dim_id |
| IDEM-007 | Reversal | is_reversed check | Reject double reverse |
| IDEM-008 | Allocation | status check | Row-level lock |

---

## Sheet 6: Audit_Log (15 fields)

Core fields: id, entity_type, entity_id, action, field_name, old_value, new_value, user_id, user_role, ip_address, device_type, timestamp, reason_code, notes, correlation_id.

---

## Sheet 7: Reconciliation_Rules (10 rules)

| ID | Rule | Severity | Frequency |
|----|------|----------|-----------|
| RCN-001 | Physical = SUM(Trans) | CRITICAL | Daily |
| RCN-002 | Available = Physical - Reserved | HIGH | Real-time |
| RCN-003 | No negative physical | CRITICAL | Pre-check |
| RCN-004 | Trans immutability | CRITICAL | DB trigger |
| RCN-005 | Snapshot consistency | HIGH | After EOD |
| RCN-006 | Cross-entity balance per owner | MEDIUM | Weekly |
| RCN-007 | External ID uniqueness | CRITICAL | Real-time |
| RCN-008 | Reversal pair integrity | MEDIUM | Daily |
| RCN-009 | Dim hash uniqueness | HIGH | On INSERT |
| RCN-010 | Total IN = OUT + on_hand + adj | HIGH | Monthly |

---

## Sheet 8: ENUM_Values

### ref_type
PO, ASN, SO, SHIPMENT, TRANSFER, ADJUSTMENT, CYCLE_COUNT, STATUS_CHANGE, MOVE

### stage
EXPECTED, REGISTERED, PHYSICAL, DEDUCTED, CANCELLED

### inventory_status
AVAILABLE, DAMAGED, BLOCKED, IN_TRANSIT

### status_from/to
ORDERED, REGISTERED, AVAILABLE, RESERVED, PICKED, DAMAGED, BLOCKED, IN_TRANSIT, CANCELLED, DEDUCTED

### audit_action
CREATE, UPDATE, DELETE, REVERSE, POST, CANCEL, APPROVE, REJECT

---

## Sheet 9: ERD_Reference

Xem chi tiết quan hệ giữa các bảng trong file Excel.

## Sheet 10: OnHand_Impact_Matrix

Xem ma trận impact đầy đủ cho tất cả business events.

---

*END OF DOCUMENT*
