# Module 8 — Weighbridge, OCR & Integration: Functional Specification

**Version:** 1.2
**Created:** 2026-03-08
**Revised:** 2026-03-08
**Status:** DRAFT — Enhanced for BA completeness review
**Source:** 5 Check-Report Documents + BRD
**Changelog v1.1:** Add ownership boundary per sub-capability, retry policy matrix, OCR→M4 handoff contract, correlation_id rule, manual weight governance clarification. Per Senior Manager review against M4/M5 baseline.
**Changelog v1.2:** Bo sung state machine cho object integration, DB schema toi thieu cho mobile sync va alert, exception/retry matrix chi tiet theo channel, weighbridge local agent contract, OCR governance, ERP push contract baseline, RBAC + reason code matrix, monitoring KPI, UAT scenarios, API contract notes. Uu tien bo sung, han che xoa noi dung goc.

---

## 1. Document Purpose

Dac ta chuc nang Module 8 — Weighbridge, OCR & Integration. Module nay la lop data acquisition va integration, cung cap du lieu can (weighbridge), OCR, mobile sync va ERP push. M8 KHONG chua business rules — chi thu thap va chuyen du lieu cho M4/M5/M10 xu ly.

---

## 2. Module Scope

### 2.1 Phase 1 (In Scope)
- Weighbridge Local Agent (COM port → SWM backend)
- Weighbridge Log Management (immutable log per weigh event)
- OCR Intake (port delivery note extraction)
- Mobile Sync & Offline Resilience
- ERP One-Way Push (Locked Debit Notes)
- Integration Monitoring & Retry

### 2.2 Phase 2 / Out of Scope
- [PHASE 2] ALPR automation (auto plate recognition)
- [PHASE 2] Full ERP 2-way sync
- [PHASE 2] IoT sensor integration (temperature, humidity)
- [OUT OF SCOPE] Weighbridge hardware procurement/installation

---

## 3. Business Context

TVL su dung can tau (weighbridge) la nguon xac nhan trong luong chinh thuc. Module nay dam bao:
- Du lieu can tu hardware (COM port) duoc truyen chinh xac ve SWM backend
- Latency <= 2 giay tu scale read den SWM response
- Fallback manual weight khi hardware loi (chi WH_MANAGER voi reason_code)
- OCR ho tro nhap lieu nhanh cho vessel/port receipts
- Mobile hoat dong offline va sync khi co mang
- Debit Note push sang ERP mot chieu, idempotent

**Quan trong: M8 chi la lop data. M4/M5 la noi ap dung business logic (tolerance, blocking, posting).**

---

## 4. Module Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| M1 Foundation | Uses | AuditLog, IdempotencyService, ReasonCode |
| M4 Inbound | Provides data to | weighbridge_log cho Receipt WEIGH_IN/WEIGH_OUT; OCR data cho vessel intake |
| M5 Outbound | Provides data to | weighbridge_log cho Shipment multi-trip weighing |
| M7 Work Execution | Provides to | Mobile sync infrastructure |
| M10 Billing | Provides to | ERP push cho Locked Debit Notes |

---

## 5. Ownership Boundary by Sub-Capability (v1.1 — NEW)

M8 chua 3 bounded contexts khac nhau. De tranh nham ownership giua backend/mobile/integration team, bang duoi xac dinh ro:

| Sub-Capability | API Contract Owner | Queue/Retry Owner | Monitoring Owner | Source of Truth |
|---------------|-------------------|-------------------|-----------------|----------------|
| Weighbridge (scale + log) | Backend Team | Backend (local agent queue) | Ops Dashboard (M8) | weighbridge_log table |
| OCR Intake | Backend Team | N/A (sync request) | Ops Dashboard (M8) | ocr_result table |
| Mobile Sync | Mobile Team (contract) + Backend (API) | Mobile App (local queue) | Mobile sync status (M8 dashboard) | Server DB (after sync) |
| ERP Push | Integration Team | Backend (erp_push_log queue) | Integration Dashboard (M8) | erp_push_log table |

**Key rules:**
- Mobile Team so huu offline queue logic va conflict detection client-side.
- Backend Team so huu sync API va server-side idempotency.
- Integration Team so huu ERP payload format, auth, va error mapping.
- Moi sub-capability co retry policy rieng (xem Section 6).

---

## 6. Retry Policy Matrix by Integration Channel (v1.1 — NEW)

| Channel | Retry Strategy | Max Attempts | Interval | After Max Fail | Alert Target |
|---------|---------------|-------------|----------|----------------|-------------|
| Weighbridge Local Agent | Fixed interval | 3 | 30s each | Manual fallback (WH_MANAGER approve) | WB_OPERATOR |
| Mobile Sync | Background auto-retry | Unlimited (until sync) | On network restore | Conflict flag (no overwrite) | WH_MANAGER |
| ERP Push | Exponential backoff | 10 | 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s | FAILED + alert | BILLING_OFC |
| OCR Extract | No retry (sync) | 1 | N/A | Show error, operator re-upload | WB_OPERATOR |

**Luu y**: Retry policy cua weighbridge (3x30s fixed) KHAC voi ERP push (exponential backoff). Dev/QA KHONG duoc ap dung chung.

---

## 7. Design Principles

1. **M8 KHONG chua business rules** [CONFIRMED — SystemControlMap]: M8 chi thu thap du lieu. M4/M5 quyet dinh tolerance, posting, approval.
2. **1 weigh event = 1 immutable weighbridge_log** [CONFIRMED — BR-WB-004]: Log khong duoc sua sau khi tao.
3. **Weight tu hardware** [CONFIRMED — BR-WB-001]: Manual weight chi khi hardware loi, can WH_MANAGER approve + reason_code.
4. **Latency <= 2 seconds** [CONFIRMED — BR-WB-003]: Tu scale read den SWM response.
5. **Retry per channel** [v1.1]: Moi integration channel co retry policy rieng (xem Section 6).
6. **ERP one-way push** [CONFIRMED — BR-BIL-011]: SWM → ERP. ERP khong push nguoc.
7. **Idempotent integration** [CONFIRMED]: Moi push dung unique key (debit_note_number, weighbridge_event_id).
8. **Correlation trail end-to-end** [v1.1]: Moi event tu weighbridge/OCR/mobile/ERP push PHAI co external_id + correlation_id + source_channel. Trace nguoc tu bat ky event nao ve source.
9. **Manual weight = M8 capture, M4/M5 authorize** [v1.1]: M8 chi ghi nhan manual event da duoc authorized. Rule cho phep/khong cho phep manual weight theo state va role do M4/M5 enforce.

---

## 8. Sub-Modules

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | Weighbridge Local Agent | COM port reader → SWM backend |
| 2 | Weighbridge Log Management | Immutable log per weigh event |
| 3 | OCR Intake & M4 Handoff | Port delivery note → field extraction → M4 linking |
| 4 | Mobile Sync & Offline | Queue + sync for mobile app |
| 5 | ERP One-Way Push | Locked DN → ERP |
| 6 | Integration Monitoring | Status tracking, retry, alerts |

---

## 9. Data Objects & Schema

### 9.1 weighbridge_log Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| weighbridge_event_id | VARCHAR(30) | Y | UNIQUE — idempotency key |
| receipt_id | FK | N | Link to receipt (inbound) |
| shipment_id | FK | N | Link to shipment (outbound) |
| vehicle_number | VARCHAR(50) | Y | |
| weighing_type | ENUM | Y | WEIGH_IN / WEIGH_OUT / TARE / GROSS_LINE_N |
| gross_weight_kg | DECIMAL(15,3) | N | |
| tare_weight_kg | DECIMAL(15,3) | N | |
| net_weight_kg | DECIMAL(15,3) | N | Auto-calc: gross - tare |
| weighing_sequence | INT | Y | Order in multi-trip loop |
| is_manual_entry | BOOLEAN | Y | Default: FALSE |
| manual_reason_code | VARCHAR(50) | N | Required if is_manual_entry = TRUE |
| approved_by | UUID FK | N | Required if is_manual_entry = TRUE |
| scale_device_id | VARCHAR(50) | Y | |
| photo_alpr_path | VARCHAR(500) | N | Vehicle plate photo — stored in object storage, DB giu path |
| photo_cargo_path | VARCHAR(500) | N | Cargo photo — stored in object storage, DB giu path |
| latency_ms | INT | N | Time from scale read to SWM response |
| external_id | VARCHAR(100) | Y | Idempotency key (= weighbridge_event_id) |
| correlation_id | UUID | Y | Link to source receipt/shipment correlation chain |
| source_channel | VARCHAR(20) | Y | SCALE_AGENT / MANUAL / OCR |
| weighing_timestamp | TIMESTAMPTZ | Y | |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMPTZ | Y | |

### 9.2 ocr_result Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| image_path | VARCHAR(500) | Y | Uploaded image reference |
| bl_number | VARCHAR(50) | N | Extracted B/L number |
| bl_confidence | DECIMAL(5,2) | N | % confidence |
| vehicle_number | VARCHAR(50) | N | |
| vehicle_confidence | DECIMAL(5,2) | N | |
| product_name | VARCHAR(200) | N | |
| product_confidence | DECIMAL(5,2) | N | |
| vessel_name | VARCHAR(200) | N | |
| vessel_confidence | DECIMAL(5,2) | N | |
| qty_extracted | DECIMAL(15,3) | N | |
| qty_confidence | DECIMAL(5,2) | N | |
| overall_confidence | DECIMAL(5,2) | N | Average confidence |
| linked_receipt_id | FK | N | Linked after operator confirm |
| link_method | ENUM | N | AUTO_MATCHED / OPERATOR_SELECTED / OPERATOR_CREATED |
| operator_confirmed | BOOLEAN | Y | Default: FALSE |
| operator_corrections | JSON | N | Fields corrected by operator |
| external_id | VARCHAR(100) | Y | Idempotency |
| correlation_id | UUID | Y | Link to receipt correlation chain |
| source_channel | VARCHAR(20) | Y | Default: OCR |
| created_by | VARCHAR | Y | |
| created_at | TIMESTAMPTZ | Y | |

### 9.3 erp_push_log Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| push_type | ENUM | Y | DEBIT_NOTE |
| reference_id | VARCHAR(50) | Y | debit_note_number (idempotency key) |
| payload | JSON | Y | Full payload sent |
| status | ENUM | Y | PENDING / SUCCESS / FAILED |
| attempt_count | INT | Y | Default: 0 |
| max_attempts | INT | Y | Default: 10 |
| last_attempt_at | TIMESTAMPTZ | N | |
| response_code | INT | N | HTTP status from ERP |
| response_body | JSON | N | ERP response |
| error_message | TEXT | N | If failed |
| next_retry_at | TIMESTAMPTZ | N | Exponential backoff calculated |
| external_id | VARCHAR(100) | Y | = reference_id |
| correlation_id | UUID | Y | Link to debit note correlation chain |
| source_channel | VARCHAR(20) | Y | Default: ERP_PUSH |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |


### 9.4 mobile_sync_batch Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| batch_id | VARCHAR(50) | Y | UNIQUE — id batch tu mobile |
| device_id | VARCHAR(50) | Y | Mobile device identifier |
| keeper_user_id | UUID FK | Y | Nguoi gui batch |
| event_count | INT | Y | So event trong batch |
| payload | JSON | Y | Nguyen batch payload |
| status | ENUM | Y | QUEUED / SENDING / PARTIAL_SUCCESS / SUCCESS / FAILED / CONFLICTED |
| success_count | INT | Y | Default 0 |
| failed_count | INT | Y | Default 0 |
| conflict_count | INT | Y | Default 0 |
| first_sent_at | TIMESTAMPTZ | N | Lan gui dau |
| last_sent_at | TIMESTAMPTZ | N | Lan gui gan nhat |
| last_error_code | VARCHAR(50) | N | Technical/business error code |
| last_error_message | TEXT | N | Noi dung loi |
| external_id | VARCHAR(100) | Y | = batch_id |
| correlation_id | UUID | Y | Correlation chain cua session cong viec / work execution |
| source_channel | VARCHAR(20) | Y | Default: MOBILE_SYNC |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

### 9.5 integration_alert Schema

| Field | Type | Required | Note |
|-------|------|----------|------|
| id | UUID | Y | PK |
| alert_code | VARCHAR(50) | Y | DEVICE_DISCONNECT / ERP_PUSH_FAILED / MOBILE_SYNC_CONFLICT / OCR_REVIEW_REQUIRED |
| severity | ENUM | Y | INFO / WARN / HIGH / CRITICAL |
| source_object_type | VARCHAR(50) | Y | WEIGHBRIDGE_DEVICE / ERP_PUSH_LOG / MOBILE_SYNC_BATCH / OCR_RESULT |
| source_object_id | UUID | Y | FK logic reference |
| correlation_id | UUID | N | Neu co correlation chain |
| status | ENUM | Y | OPEN / ACKNOWLEDGED / RESOLVED / CLOSED |
| assigned_role | VARCHAR(50) | Y | WB_OPERATOR / WH_MANAGER / BILLING_OFC / ADMIN |
| first_raised_at | TIMESTAMPTZ | Y | |
| last_raised_at | TIMESTAMPTZ | Y | |
| occurrence_count | INT | Y | Default 1 |
| resolution_note | TEXT | N | Manual action / root cause |
| created_at | TIMESTAMPTZ | Y | |
| updated_at | TIMESTAMPTZ | Y | |

### 9.6 Main Integration Objects & State Machine Catalog (v1.2 — NEW)

| Object | Purpose | Key States | Notes |
|--------|---------|------------|-------|
| weighbridge_event | 1 lan nhan du lieu can tu scale/manual | RECEIVED / VALIDATED / LINKED / CONSUMED / REJECTED / DUPLICATE | Event runtime state; log record van immutable sau khi tao |
| ocr_result | Ket qua OCR cho 1 image upload | UPLOADED / EXTRACTED / REVIEW_REQUIRED / CONFIRMED / LINKED / REJECTED | REVIEW_REQUIRED khi confidence thap hoac multiple candidates |
| mobile_sync_batch | 1 batch sync tu mobile app | QUEUED / SENDING / PARTIAL_SUCCESS / SUCCESS / FAILED / CONFLICTED | Server la source of truth sau khi consume |
| erp_push_log | 1 lenh push DN sang ERP | PENDING / SENT / ACK_SUCCESS / ACK_FAILED / RETRY_SCHEDULED / DEAD_LETTER | DEAD_LETTER = fail sau max attempts, can manual retry |
| integration_alert | Canh bao van hanh / reliability | OPEN / ACKNOWLEDGED / RESOLVED / CLOSED | Theo doi tren dashboard |

---

## 10. Sub-Module 1: Weighbridge Local Agent

### 10.1 Flow
1. Vehicle len can → scale hardware doc gross/tare qua COM port
2. SWM Local Agent queue du lieu → gui WebSocket/REST ve backend
3. Backend tao weighbridge_log (immutable) voi correlation_id + source_channel=SCALE_AGENT
4. Latency <= 2s [BR-WB-003]
5. Neu fail: retry locally 3 lan, moi lan 30s [BR-WB-002] — fixed interval, KHONG exponential
6. Sau 3 fail → alert WB_OPERATOR, fallback manual (WH_MANAGER approve)

### 10.1.1 Weighbridge Log → Receipt/Shipment Linking Mechanism [CONFIRMED — v1.1]

**Mechanism: WB_OPERATOR select truoc khi can.**

Flow:
1. WB_OPERATOR chon receipt (inbound) hoac shipment (outbound) tren UI truoc khi bam "Record Weigh"
2. receipt_id hoac shipment_id duoc gui kem trong weigh event payload
3. M8 set `weighbridge_log.receipt_id` hoac `weighbridge_log.shipment_id` khi tao log
4. Correlation chain: weighbridge_log.correlation_id = receipt.correlation_id (copy khi link)

**Edge case:**
- Neu WB_OPERATOR quen chon → weighbridge_log tao voi receipt_id = NULL (orphan log)
- Orphan logs hien thi trong Integration Monitor dashboard → WB_OPERATOR / WH_MANAGER retrolink
- Retrolink endpoint: `PATCH /api/v1/weighbridge/logs/{id}/link` (WH_MANAGER only, with audit trail)

**Luu y:** Vehicle number trong weighbridge_log dung de cross-check / autocomplete suggest receipt/shipment, nhung khong phai auto-link (tranh sai khi 2 xe cung bien so). WB_OPERATOR phai confirm.

### 10.2 Manual Weight Governance (v1.1 — Clarified)

M8 chi capture manual weight event. Business authorization do M4/M5 enforce:
- M4 inbound: manual weight cho phep khi Receipt o state WEIGH_IN hoac WEIGH_OUT va scale hardware fail
- M5 outbound: manual weight cho phep khi Shipment o state WEIGHING va scale hardware fail
- M8 bat buoc ghi: is_manual_entry=TRUE, manual_reason_code, approved_by (WH_MANAGER UUID)
- M4/M5 se validate: approved_by co role WH_MANAGER, reason_code hop le, state cho phep manual

**M8 KHONG tu quyet dinh khi nao cho phep manual weight. M8 chi la channel ghi nhan.**

### 10.2.1 Weighbridge Local Agent Contract Baseline (v1.2 — NEW)

| Aspect | Requirement |
|--------|-------------|
| Supported input mode | COM port serial read la baseline Phase 1. TCP/IP scale protocol co the mo rong sau neu hardware support. |
| Device abstraction | Local Agent PHAI tach driver/parser theo `scale_device_type` de support nhieu frame format khac nhau ma khong doi backend API. |
| Stable weight rule | Chi gui event khi gia tri can on dinh trong it nhat 3 lan doc lien tiep trong cua so 1-2 giay. Neu dao dong > nguong config thi tiep tuc cho on dinh. |
| Raw payload retention | Agent va backend luu `raw_payload` / raw frame string de debug va audit. |
| Device timestamp | Neu hardware khong tin cay thi server timestamp la source of truth; device timestamp luu de doi chieu. |
| Duplicate protection | 1 event duoc xem la duplicate neu cung `scale_device_id + stable_weight + weighing_timestamp bucket + vehicle_number` trong cua so config. |
| Offline buffering | Agent PHAI co local buffer toi thieu 500 event hoac 24h (lay gia tri nao den truoc) khi mat ket noi backend. |
| Reconnect resend | Sau khi co mang lai, agent resend theo thu tu FIFO; moi event giu nguyen `external_id` de backend idempotent. |
| Heartbeat | Agent gui heartbeat dinh ky ve backend; neu mat heartbeat > nguong config thi sinh alert device disconnect. |
| Security | Agent phai dang ky `device_id` hop le; backend tu choi event tu device khong duoc whitelist. |

### 10.2.2 Weighbridge Exception Matrix (v1.2 — NEW)

| Failure Case | Detect By | Auto Action | Manual Action | Owner | Final Status |
|-------------|-----------|-------------|---------------|-------|-------------|
| COM port khong doc duoc | Local agent | Retry 3x30s | Kiem tra day/port, neu van fail thi manual weight workflow | WB_OPERATOR | OPEN alert / manual fallback |
| Weight dao dong lien tuc | Local agent stable rule | Chua gui event den backend | Kiem tra xe da dung yen chua | WB_OPERATOR | Waiting stable |
| Duplicate signal do operator bam nhieu lan | Backend idempotency | Reject duplicate, ghi audit | Xem log neu can | Backend | DUPLICATE |
| Backend timeout | Agent | Retry theo matrix Section 6 | Theo doi dashboard | WB_OPERATOR | RESENT / FAILED |
| Orphan weigh log (chua link receipt/shipment) | Backend validation | Tao orphan log, hien dashboard | Retrolink voi audit trail | WH_MANAGER | LINKED / CLOSED |
| Device disconnect > threshold | Monitoring | Tao alert | Ops kiem tra local agent/hardware | WH_MANAGER | RESOLVED / CLOSED |

### 10.3 Acceptance Criteria
- **AC-1.1**: Scale read → SWM response <= 2 seconds.
- **AC-1.2**: API fail → retry 3x30s (fixed interval). Sau 3 fail → alert operator.
- **AC-1.3**: Fallback manual weight requires WH_MANAGER approval + reason_code. M8 ghi nhan, M4/M5 validate.
- **AC-1.4**: weighbridge_log created voi is_manual_entry, manual_reason_code, approved_by, correlation_id, source_channel.

---

## 11. Sub-Module 2: Weighbridge Log Management

### 11.1 Rules
- 1 weigh event = 1 weighbridge_log record [BR-WB-004]
- Log IMMUTABLE sau khi tao — khong edit, khong delete
- Fields: gross, tare, net (auto-calc), photos, vehicle, timestamp
- Manual entry: is_manual_entry = TRUE + reason_code + approved_by
- Moi log co external_id + correlation_id + source_channel

### 11.2 Multi-Trip Outbound Weighing [BR-WB-005]
- Tare (0) → Gross_1 (line 1) → Gross_2 (line 2) → ... → Gross_N (line N)
- Net_1 = Gross_1 - Tare
- Net_N = Gross_N - Gross_(N-1)
- Cross-check: Total_net = Gross_final - Tare

### 11.3 Acceptance Criteria
- **AC-2.1**: Moi weigh event tao dung 1 weighbridge_log voi correlation_id + source_channel.
- **AC-2.2**: Log khong the edit/delete sau khi tao.
- **AC-2.3**: Multi-trip weighing formula dung: Net_N = Gross_N - Gross_(N-1).
- **AC-2.4**: Cross-check total: Total_net = Gross_final - Tare.

---

## 12. Sub-Module 3: OCR Intake & M4 Handoff Contract (v1.1 — Enhanced)

### 12.1 OCR Extraction Flow
1. WB_OPERATOR upload port delivery note (image)
2. OCR engine extract fields: B/L, vehicle, product, vessel, qty
3. Confidence score per field
4. WB_OPERATOR review, confirm hoac correct
5. Confirmed → link to receipt (or create receipt candidate)

### 12.2 OCR → M4 Handoff Contract (v1.1 — NEW)

| Aspect | Specification |
|--------|--------------|
| **Extracted fields** | bl_number, vehicle_number, product_name, vessel_name, qty_extracted |
| **Confidence per field** | 0-100%. Stored in ocr_result. |
| **Auto-match threshold** | overall_confidence >= 90% AND bl_number matches existing receipt → auto-suggest link |
| **Auto-match priority** | 1) Exact B/L match, 2) Vehicle + vessel match, 3) Product + qty approximate match |
| **When auto-link allowed** | overall_confidence >= 90% AND exactly 1 receipt candidate matched. link_method = AUTO_MATCHED |
| **When operator must confirm** | confidence < 90% OR multiple candidates OR no match → operator select/create. link_method = OPERATOR_SELECTED |
| **M4 target entity** | ocr_result.linked_receipt_id → receipt (M4). OCR data la input cho receipt creation/update. |
| **Corrections flow** | Operator co the correct bat ky field nao. Corrections saved in operator_corrections JSON. |
| **Handoff trigger** | operator_confirmed = TRUE → M4 co the consume OCR data de populate receipt fields. |

### 12.2.1 OCR Governance Rules (v1.2 — NEW)

| OCR Field | Required de confirm? | Editable by operator? | Confidence threshold baseline | Source priority khi handoff M4 |
|-----------|----------------------|----------------------|------------------------------|-------------------------------|
| bl_number | Y | Y | 90% | Neu operator sua, gia tri operator_confirmed uu tien cao nhat |
| vehicle_number | Y | Y | 90% | Operator confirmed > OCR raw |
| product_name | Y | Y | 85% | Operator confirmed > OCR raw |
| vessel_name | N | Y | 85% | Operator confirmed > OCR raw |
| qty_extracted | N | Y | 85% | Operator confirmed > OCR raw |

**Quy tac bo sung:**
- Neu co >1 receipt candidate, M8 KHONG duoc auto-link. Bat buoc operator select 1 candidate.
- Sau khi `operator_confirmed = TRUE`, M8 luu ca 2 lop du lieu: OCR raw va confirmed snapshot.
- M8 KHONG overwrite receipt da posting / da qua state ma M4 danh dau la khoa; khi do chi duoc tao exception / yeu cau relink theo rule cua M4.
- Moi sua doi field OCR PHAI ghi vao `operator_corrections` (field cu, field moi, user, timestamp).
- Attachment image giu lai de audit; khong cho xoa file neu OCR result da duoc link.

### 12.2.2 OCR Exception Matrix (v1.2 — NEW)

| Failure Case | Auto Action | Manual Action | Owner | Result |
|-------------|-------------|---------------|-------|--------|
| OCR engine error | Tra error cho UI | Re-upload / doi anh ro hon | WB_OPERATOR | FAILED |
| Confidence thap < threshold | Mark REVIEW_REQUIRED | Operator review/sua field | WB_OPERATOR | CONFIRMED / REJECTED |
| Multiple receipt candidates | Khong auto-link | Operator select dung receipt | WB_OPERATOR | LINKED |
| Khong co candidate | Tao receipt candidate hoac de chua linked | Operator tao moi / bo qua | WB_OPERATOR | LINKED / REJECTED |
| OCR linked nham | Tao audit exception | WH_MANAGER relink theo policy | WH_MANAGER | LINKED lai / CLOSED |

### 12.3 Acceptance Criteria
- **AC-3.1**: OCR extract fields voi confidence score per field.
- **AC-3.2**: Confidence >=90% va 1 match → auto-suggest link. link_method = AUTO_MATCHED.
- **AC-3.3**: Confidence <90% hoac multiple matches → require operator selection.
- **AC-3.4**: Operator can correct any field before confirm. Corrections saved.
- **AC-3.5**: Image + extracted data + corrections saved for audit voi correlation_id.

---

## 13. Sub-Module 4: Mobile Sync & Offline

### 13.1 Flow
- Queue putaway/pick completions locally khi offline
- Sync khi online: gui queued events voi external_id (idempotent)
- Conflict detection: flag conflict, khong auto-overwrite (server data wins)
- Sync status visible (pending sync count)
- Retry: background auto-retry, unlimited until success (xem Retry Matrix Section 6)

### 13.1.1 Mobile Offline / Sync Rules (v1.2 — NEW)

| Rule Area | Baseline Rule |
|-----------|---------------|
| Event duoc offline | Putaway completion, pick completion, count capture, exception note, photo upload metadata. |
| Event khong duoc offline | Login/auth refresh, permission change, master data publish, force override can manager approval real-time. |
| Replay order | FIFO theo `client_event_time`; trong cung 1 work task phai giu thu tu thao tac. |
| Partial success | Batch status = PARTIAL_SUCCESS; chi resend lai event fail, event thanh cong khong gui lai. |
| Conflict policy | Server data wins; mobile hien conflict de user / manager xem. Khong auto-merge. |
| Duplicate policy | Cung `external_id` thi backend bo qua event duplicate va tra ket qua idempotent. |
| Local retention | Batch offline giu toi thieu 7 ngay hoac den khi sync thanh cong. |
| Sync after long offline | Neu >24h chua sync, sinh canh bao cho supervisor/WH_MANAGER tren dashboard. |

### 13.1.2 Mobile Sync API Baseline (v1.2 — NEW)

Request batch toi thieu gom: `batch_id`, `device_id`, `keeper_user_id`, `events[]`, `client_created_at`, `external_id`, `correlation_id`.

Moi event trong `events[]` nen co:
- `event_type`
- `event_id` / `external_id`
- `work_reference_id`
- `client_event_time`
- `payload`
- `photo_refs[]` (neu co)

Response batch toi thieu:
- `batch_status`
- `accepted_event_ids[]`
- `conflict_event_ids[]`
- `failed_events[]` gom `external_id`, `error_code`, `error_message`

### 13.2 Acceptance Criteria
- **AC-4.1**: Offline operations queued locally voi external_id + correlation_id.
- **AC-4.2**: Sync idempotent via external_id — no duplicate.
- **AC-4.3**: Conflict flagged for WH_MANAGER review. Server data wins, client changes queued as conflict.

---

## 14. Sub-Module 5: ERP One-Way Push

### 14.1 Flow
1. Debit Note LOCKED (M10) → trigger ERP push
2. Payload: DN header + lines + totals
3. Idempotency key: debit_note_number (= external_id)
4. Push status tracking: PENDING → SUCCESS / FAILED
5. Failed → retry voi exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s cap (max 10 attempts)
6. Alert BILLING_OFC sau max attempts exhausted

### 14.1.1 Manual ERP Push Resolution Workflow [v1.1]

Khi ERP push FAILED sau 10 attempts:
1. BILLING_OFC nhan alert tren dashboard (AC-5.4)
2. BILLING_OFC xem error detail: `GET /api/v1/erp/push-status/{id}` — xem response_code + error_message
3. BILLING_OFC contact ERP team de diagnose: ERP server down? Payload format sai? Auth expired?
4. Sau khi ERP team fix → BILLING_OFC bam Retry: `POST /api/v1/erp/retry/{id}`
5. Manual retry: reset next_retry_at = now(), KHONG ap exponential backoff (retry ngay)
6. Escalation neu fail > 24h sau alert: BILLING_OFC → WH_ADMIN → ADMIN

**Luu y:** Manual retry va auto retry dung cung idempotency key (debit_note_number). Re-push cung key → ERP phai de-duplicate phia minh.

### 14.2 ERP API Contract [TO-CONFIRM — P1 BLOCKER]

| Aspect | Status | Note |
|--------|--------|------|
| ERP endpoint URL | [TO-CONFIRM] | Chua co tu ERP team |
| Authentication | [TO-CONFIRM] | API key? OAuth? Certificate? |
| Payload format | [TO-CONFIRM] | JSON? XML? Field mapping? |
| Response format | [TO-CONFIRM] | Success/error codes? |
| Rate limiting | [TO-CONFIRM] | Max requests per minute? |
| Timeout | [TO-CONFIRM] | Suggested 30s per request |

**Day la P1 blocker. Khong the build ERP push cho den khi co API spec tu ERP team.**

### 14.2.1 ERP Push Contract Baseline (v1.2 — NEW)

| ERP API | Trigger | Request Key Fields | Success Criteria | Retryable Errors | Non-Retryable Errors | Idempotency Key |
|---------|---------|-------------------|------------------|------------------|----------------------|-----------------|
| Push Debit Note | Debit Note state = LOCKED (M10) | debit_note_number, customer_code, posting_date, line_items, total_amount, tax_amount | ERP tra ACK thanh cong va luu duoc so chung tu / transaction ref | Timeout, 429, 5xx, network error | 400 mapping error, 401/403 auth config loi, 422 validation fail | debit_note_number |

**Quy tac:**
- Chi object o state LOCKED moi duoc push.
- `erp_push_log.status` chi chuyen SUCCESS khi nhan ACK thanh cong tu ERP.
- Loi non-retryable PHAI dua vao DEAD_LETTER/FAILED va can BILLING_OFC xu ly thu cong.
- Loi retryable theo exponential backoff, toi da 10 lan.
- Manual retry van dung cung idempotency key cu.

### 14.2.2 ERP Push Failure / Reconciliation Rules (v1.2 — NEW)

- M8 can luu du `request_payload_snapshot` va `response_snapshot` de doi chieu sau nay.
- Neu ERP tra thanh cong nhung timeout tai SWM client, batch can vao trang thai `ACK_UNKNOWN`/can verify bang reconciliation (neu team ky thuat muon mo rong trang thai nay). Trong pham vi spec hien tai, toi thieu phai co co che check lai truoc khi manual re-push de tranh trung chung tu.
- Can co bao cao reconciliation hang ngay: DN LOCKED da push thanh cong, DN fail, DN cho xu ly. Bao cao nay phuc vu BILLING_OFC va ke toan.

### 14.3 Acceptance Criteria
- **AC-5.1**: Chi push Locked Debit Notes.
- **AC-5.2**: Re-push cung debit_note_number → skip (idempotent).
- **AC-5.3**: Failed push → auto-retry voi exponential backoff (1s→2s→4s→8s→...→60s cap). Max 10 attempts.
- **AC-5.4**: BILLING_OFC thay push status (PENDING/SUCCESS/FAILED) tren dashboard.
- **AC-5.5**: erp_push_log ghi day du: payload, response, error, attempt_count, correlation_id.

---

## 15. Sub-Module 6: Integration Monitoring

### 15.1 Monitoring Dashboard
- ERP push history: status, retry count, last attempt, next retry
- Weighbridge connection status per device (heartbeat)
- Mobile sync status: pending sync count per keeper
- Alert escalation khi repeated failure

### 15.1.1 Monitoring KPI & Alert Policy (v1.2 — NEW)

| KPI / Alert | Definition | Threshold / SLA | Owner |
|-------------|------------|-----------------|-------|
| Weighbridge latency | Tu stable read den backend ack | <= 2 giay | WH_MANAGER / Ops |
| Device heartbeat missing | Khong nhan heartbeat tu device | > 5 phut (to-confirm) | WH_MANAGER |
| Orphan weigh logs | Log chua link receipt/shipment | Hien real-time tren dashboard | WH_MANAGER |
| OCR review required count | So OCR ket qua can user review | Dashboard by shift/day | WB_OPERATOR |
| Mobile pending sync >24h | Device/keeper chua sync qua 24h | Alert WARN | WH_MANAGER |
| ERP push failure rate | % push FAILED / total push | Dashboard by day | BILLING_OFC |
| ERP push dead-letter count | So DN fail sau max attempts | Alert HIGH/CRITICAL | BILLING_OFC / ADMIN |

### 15.1.2 Dashboard Minimum Widgets (v1.2 — NEW)

- Weighbridge device status theo tung can / local agent
- Danh sach orphan weigh logs cho phep retrolink
- OCR queue: review_required / confirmed / rejected
- Mobile sync: pending, conflicted, last sync by device/user
- ERP push queue: pending, retry_scheduled, success, failed, dead-letter
- Alert inbox: severity, assigned_role, opened_at, last_raised_at

### 15.2 Acceptance Criteria
- **AC-6.1**: Integration dashboard hien thi push status per DN.
- **AC-6.2**: Alert khi weighbridge device disconnect > 5 minutes.
- **AC-6.3**: Alert khi ERP push fail > max attempts (10).

---

## 16. Correlation & Traceability (v1.1 — NEW)

### 16.1 Rule

Moi event tu M8 PHAI co 3 traceability fields:

| Field | Purpose | Example |
|-------|---------|---------|
| external_id | Idempotency key — prevent duplicates | WB-20260308-001, OCR-20260308-001, DN-20260301-001 |
| correlation_id | Link to source entity chain | Receipt correlation_id, Shipment correlation_id, DN correlation_id |
| source_channel | Identify origin system | SCALE_AGENT, MANUAL, OCR, MOBILE_SYNC, ERP_PUSH |

### 16.2 Trace Path

```
weighbridge_log.correlation_id
  → receipt.correlation_id (M4) hoac shipment.correlation_id (M5)
    → invent_trans.correlation_id (M3)
      → work_line (M7)
        → billing_event (M10)
          → debit_note (M10)
            → erp_push_log.correlation_id (M8)
```

End-to-end: tu scale reading → ERP push, traceable qua 1 correlation_id chain.

### 16.3 Acceptance Criteria
- **AC-T.1**: Moi weighbridge_log, ocr_result, erp_push_log co external_id + correlation_id + source_channel.
- **AC-T.2**: Trace tu weighbridge_log → receipt/shipment → InventTrans → billing → ERP push qua correlation_id.
- **AC-T.3**: Inbound flow: weighbridge_log.correlation_id == receipt.correlation_id khi log duoc link (receipt_id set).
- **AC-T.4**: Outbound flow: weighbridge_log.correlation_id == shipment.correlation_id khi log duoc link.
- **AC-T.5**: ERP flow: erp_push_log.correlation_id == debit_note.correlation_id.

---

## 17. RBAC & Permissions

| Action | WB_OPERATOR | WH_MANAGER | BILLING_OFC | WH_KEEPER |
|--------|-------------|------------|-------------|-----------|
| View weighbridge log | Y | Y | — | — |
| Manual weight entry | — | Y (approve) | — | — |
| OCR upload + confirm | Y | Y | — | — |
| View ERP push status | — | — | Y | — |
| Retry ERP push | — | — | Y | — |
| Mobile sync | — | — | — | Y |
| View integration monitor | — | Y | Y | — |

---

## 17A. Reason Code & Audit Policy (v1.2 — NEW)

| Action | Role duoc phep | Reason code bat buoc | Evidence / audit toi thieu |
|--------|----------------|----------------------|----------------------------|
| Manual weight entry | WH_MANAGER | Y | approved_by, manual_reason_code, timestamp, lien ket receipt/shipment |
| Retrolink orphan weigh log | WH_MANAGER | Y | old link/new link, comment, user, timestamp |
| OCR relink / force correction sau confirm | WH_MANAGER | Y | truoc/sau correction, image ref, affected receipt |
| ERP manual retry | BILLING_OFC | N (khuyen nghi co note) | error snapshot, user, retry time |
| Mark false duplicate / dong alert | WH_MANAGER / ADMIN | Y | root cause + resolution note |

**Nguyen tac audit:**
- M1 AuditLog la noi luu audit chuan.
- M8 phai gui audit event cho cac thao tac manual/override neu co.
- Cac field `external_id`, `correlation_id`, `source_channel` phai xuat hien trong audit payload de truy vet lien module.

---

## 18. Business Rules

| Rule ID | Rule | BRD Reference |
|---------|------|--------------|
| IO-BR-001 | Weight tu hardware, manual chi WH_MANAGER + reason | BR-WB-001 |
| IO-BR-002 | Weighbridge retry: 3x30s fixed interval, sau do manual fallback | BR-WB-002 |
| IO-BR-003 | Latency <= 2 seconds | BR-WB-003 |
| IO-BR-004 | 1 weigh = 1 immutable log | BR-WB-004 |
| IO-BR-005 | Multi-trip: Net_N = Gross_N - Gross_(N-1) | BR-WB-005 |
| IO-BR-006 | ERP push one-way, idempotent, exponential backoff (max 10) | BR-BIL-011 |
| IO-BR-007 | OCR confidence >=90% auto-suggest, <90% operator confirm | — |
| IO-BR-008 | Mobile offline queue + sync via external_id, no auto-overwrite | CFM-09 |
| IO-BR-009 | M8 capture manual weight, M4/M5 authorize (state + role check) | BR-WB-001 + v1.1 |
| IO-BR-010 | All M8 events MUST have external_id + correlation_id + source_channel | v1.1 |

---

## 19. API Endpoints

| # | Method | Endpoint | Actor | Description |
|---|--------|----------|-------|-------------|
| 1 | POST | /api/v1/weighbridge/weigh-event | WB_OPERATOR/System | Record weigh event from scale |
| 2 | POST | /api/v1/weighbridge/manual-entry | WH_MANAGER | Manual weight entry |
| 3 | GET | /api/v1/weighbridge/logs | WB_OPERATOR, WH_MANAGER | List weighbridge logs |
| 4 | GET | /api/v1/weighbridge/logs/{id} | WB_OPERATOR, WH_MANAGER | Get log detail |
| 5 | POST | /api/v1/ocr/extract | WB_OPERATOR | Upload image for OCR |
| 6 | GET | /api/v1/ocr/{id} | WB_OPERATOR | Get OCR result detail |
| 7 | POST | /api/v1/ocr/{id}/confirm | WB_OPERATOR | Confirm OCR result + link to receipt |
| 8 | POST | /api/v1/erp/push-debit-note | System/BILLING_OFC | Push locked DN to ERP |
| 9 | GET | /api/v1/erp/push-status | BILLING_OFC | View push status list |
| 10 | GET | /api/v1/erp/push-status/{id} | BILLING_OFC | View push detail |
| 11 | POST | /api/v1/erp/retry/{id} | BILLING_OFC | Retry failed push |
| 12 | POST | /api/v1/mobile/sync | WH_KEEPER | Batch sync offline ops |
| 13 | GET | /api/v1/integration/monitor | WH_MANAGER, BILLING_OFC | Integration dashboard |

### 19.1 API Contract Notes (v1.2 — NEW)

**Yeu cau chung cho tat ca API M8:**
- Header idempotency: event tao moi nen mang `external_id` / `Idempotency-Key` neu actor la system/mobile/agent.
- Tat ca response loi can co: `error_code`, `error_message`, `correlation_id`, `timestamp`.
- Cac API thao tac manual (manual-entry, retrolink, ERP retry) phai ghi audit trail.
- API list/detail dashboard can support filter theo `status`, `device_id`, `date_from`, `date_to`, `correlation_id`.

### 19.2 Endpoint Behavioral Notes (v1.2 — NEW)

| Endpoint | Behavioral Note |
|----------|-----------------|
| POST /api/v1/weighbridge/weigh-event | Idempotent theo `weighbridge_event_id/external_id`; duplicate request tra ket qua da ton tai. |
| POST /api/v1/weighbridge/manual-entry | Chi duoc goi boi WH_MANAGER; backend M8 chi capture, M4/M5 validate state cho phep. |
| PATCH /api/v1/weighbridge/logs/{id}/link | Retrolink orphan log; bat buoc audit trail, reason code, role check. |
| POST /api/v1/ocr/extract | Upload image, tra ve OCR result va confidence. |
| POST /api/v1/ocr/{id}/confirm | Luu confirmed snapshot + corrections + linked_receipt_id. |
| POST /api/v1/mobile/sync | Consume batch; support partial success va idempotent event-level. |
| POST /api/v1/erp/push-debit-note | Chi cho object state LOCKED; neu da push thanh cong thi tra status idempotent. |
| POST /api/v1/erp/retry/{id} | Chi retry khi status FAILED / DEAD_LETTER, phai luu user trigger. |

---

---

## 20. [TO-CONFIRM] Items

| # | Item | Priority | Impact | Deadline |
|---|------|----------|--------|----------|
| 1 | ERP API spec: endpoint, auth, payload format, response format, rate limit | **P1 — BLOCKER** | Cannot build ERP push without this | Truoc FS M8 |
| 2 | OCR engine selection (cloud vs on-prem) | **P1** | Architecture, latency, cost, data privacy. Cloud OCR co the vi pham <= 5s SLA neu network cham. Phai benchmark truoc Sprint 1. Criteria: latency, data sensitivity, cost/request. | Truoc Sprint 1 |
| 3 | ALPR Phase 1 or Phase 2? | P2 | Scope | Truoc Sprint planning |
| 4 | Alert notification channel: in-app only or email/SMS? | P2 | Monitoring UX | Truoc Sprint 2 |
| 5 | Weighbridge heartbeat interval (currently assumed 5 min)? | P2 | Monitoring accuracy | Truoc Sprint 2 |
| 6 | ERP push max attempts (currently 10) — confirm or adjust? | P2 | Reliability | Truoc Sprint 2 |

---

## 21. Acceptance Criteria Summary

| Sub-Module | AC Count | AC IDs |
|-----------|----------|--------|
| 1. Weighbridge Local Agent | 4 | AC-1.1..1.4 |
| 2. Weighbridge Log Management | 4 | AC-2.1..2.4 |
| 3. OCR Intake & M4 Handoff | 5 | AC-3.1..3.5 |
| 4. Mobile Sync & Offline | 3 | AC-4.1..4.3 |
| 5. ERP One-Way Push | 5 | AC-5.1..5.5 |
| 6. Integration Monitoring | 3 | AC-6.1..6.3 |
| T. Correlation & Traceability | 5 | AC-T.1..T.5 |
| **Total** | **29** | |

---

## 22. User Stories

### US-M8-001: Weighbridge Local Agent
**As a** WB_OPERATOR, **I want** scale weight auto-read via COM port and delivered to backend within 2 seconds, **so that** weighing is fast and accurate.
- **Priority:** MUST HAVE — **AC:** AC-1.1..1.4

### US-M8-002: OCR Intake & Handoff
**As a** WB_OPERATOR, **I want to** upload port delivery notes for OCR extraction with auto-match to receipts, **so that** vessel receipts can be created faster with less manual entry.
- **Priority:** MUST HAVE — **AC:** AC-3.1..3.5

### US-M8-003: Mobile Sync & Offline
**As a** WH_KEEPER, **I want** mobile app to queue operations offline and sync when online with conflict detection, **so that** work continues uninterrupted.
- **Priority:** MUST HAVE — **AC:** AC-4.1..4.3

### US-M8-004: ERP One-Way Push
**As a** BILLING_OFC, **I want** locked Debit Notes auto-pushed to ERP idempotently with retry and monitoring, **so that** billing data is synchronized.
- **Priority:** MUST HAVE — **AC:** AC-5.1..5.5

### US-M8-005: Integration Traceability
**As an** ADMIN, **I want** every M8 event to carry external_id + correlation_id + source_channel, **so that** I can trace any data point end-to-end from scale to ERP.
- **Priority:** MUST HAVE — **AC:** AC-T.1, AC-T.2

---

## 22A. UAT Scenario Matrix (v1.2 — NEW)

| UAT ID | Scenario | Expected Result |
|--------|----------|----------------|
| UAT-M8-001 | Scale doc du lieu binh thuong | weighbridge_log tao thanh cong <= 2s, status linked/orphan dung context |
| UAT-M8-002 | Backend tam thoi khong phan hoi | Agent retry 3x30s, sau do alert operator |
| UAT-M8-003 | Manual weight sau khi scale fail | Bat buoc WH_MANAGER + reason_code, audit day du |
| UAT-M8-004 | Operator quen chon receipt truoc khi can | Tao orphan log, hien dashboard cho retrolink |
| UAT-M8-005 | Multi-trip outbound weighing | Net_N tinh dung, tong net cross-check dung |
| UAT-M8-006 | OCR confidence cao va 1 candidate | Auto-suggest / auto-link theo rule |
| UAT-M8-007 | OCR confidence thap | REVIEW_REQUIRED, operator sua roi confirm |
| UAT-M8-008 | OCR co nhieu receipt candidate | Khong auto-link, operator phai chon |
| UAT-M8-009 | Mobile app offline -> online sync | Batch sync thanh cong, khong tao duplicate |
| UAT-M8-010 | Mobile batch partial success | Event thanh cong khong gui lai, event fail duoc danh dau resend |
| UAT-M8-011 | Mobile conflict voi server data | Conflict duoc flag, server wins |
| UAT-M8-012 | Locked DN push ERP thanh cong | erp_push_log = SUCCESS, luu response snapshot |
| UAT-M8-013 | ERP push timeout / 5xx | Retry theo exponential backoff toi da 10 lan |
| UAT-M8-014 | ERP push 400 mapping error | Fail non-retryable, BILLING_OFC xu ly thu cong |
| UAT-M8-015 | Manual ERP retry sau khi ERP fix | Retry thanh cong, van giu idempotency key cu |
| UAT-M8-016 | Device disconnect > threshold | Dashboard sinh alert va phan role xu ly |
| UAT-M8-017 | Full trace weigh -> receipt/shipment -> DN -> ERP | Tra cuu duoc bang correlation_id |

---

## 23. Baseline Source Documents

| # | Document | Key Content Used |
|---|----------|-----------------|
| 1 | TVL_SWM_BA_PO_Master.md | US-M8-001..004 |
| 2 | TVL_SWM_SystemFlow_EndToEnd.md | Weighbridge flow, ERP push |
| 3 | TVL_SWM_Business_Rules_Document.md | BR-WB-001..005, BR-BIL-011 |
| 4 | TVL_SWM_UserFlow_A_to_Z.md | WB_OPERATOR flows 1.1-1.4 |
| 5 | TVL_SWM_SystemControlMap.md | M8 ownership boundaries |
| 6 | Module 4 Inbound Spec | Manual weight authorization, OCR handoff, receipt states |
| 7 | Module 5 Outbound Spec | Manual weight authorization, multi-trip weighing |
| 8 | Module 7 Work Execution Spec | Mobile offline/sync baseline, conflict handling |
| 9 | TVL_SWM_overview_spec_module.md | Cross-module dependency, traceability, spec completeness checklist |
| 10 | TVL_SWM_Business_Rules_Document.md | Weighbridge / billing rules baseline |


---

## 24. BA Completion Notes (v1.2 — NEW)

Tai lieu v1.2 nay uu tien **bo sung** de lam day hon ban goc, khong thay doi ban chat pham vi Module 8.

**Ket luan BA:**
- M8 van la lop data acquisition + integration, khong giu business rules cua inbound/outbound/billing.
- Cac phan da du muc build FS/tech spec hon truoc: object/state, schema, exception matrix, OCR governance, mobile sync baseline, ERP retry contract, monitoring KPI, UAT.
- Van con cac muc `[TO-CONFIRM]` can khoa voi stakeholder/ERP team truoc khi chot FS va design ky thuat cuoi cung.
