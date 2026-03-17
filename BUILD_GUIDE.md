# Build Skill — Config & Prompt đầy đủ để xây dựng lại OCR Pipeline

> Ghi lại **tất cả config, prompt, formula, constant** trong hệ thống.
> Người mới đọc file này + source code là build lại được.

---

## 1. Tổng quan lớp Config

```
[1] config/default.yml            ← giá trị mặc định
[2] config/logistics.yml          ← instance cụ thể (TVL cảng Phú Mỹ)
[3] config/customers/{id}.yml     ← khách hàng cụ thể
[4] .env.local                    ← secrets + override runtime
[5] src/ocr/prompt_builder.py     ← DEFAULT prompt hardcode trong code
[6] src/extract/extractor.py      ← EXTRACTION system prompt hardcode
[7] src/classify/rules.py         ← keyword rules hardcode
[8] src/extract/confidence.py     ← scoring formulas + constants
[9] src/extract/validator.py      ← validation check handlers
[10] src/api/v1/display_builder.py ← field labels + section config
```

**Nguyên tắc**: Config YAML ghi đè prompt trong code. Nếu YAML có `system_prompt` → dùng YAML. Nếu không → dùng DEFAULT trong Python.

---

## 2. System Prompt — OCR (Gemini Vision → Markdown)

### 2.1 DEFAULT trong code (`src/ocr/prompt_builder.py`)

Dùng khi YAML không có `system_prompt`:

```
Bạn là hệ thống OCR chuyên biệt cho TRẠM CÂN logistics kho vận Việt Nam.
Nhiệm vụ: trích xuất CHÍNH XÁC nội dung từ ảnh chứng từ → Markdown có cấu trúc.

ĐÂY LÀ HỆ THỐNG CHO TRẠM CÂN — MỌI THÔNG SỐ LIÊN QUAN CÂN NẶNG LÀ ƯU TIÊN SỐ 1.

QUY TẮC:
1. Giữ nguyên ngôn ngữ gốc, KHÔNG dịch
2. Đọc được → trích xuất chính xác
3. Không đọc được → [UNREADABLE:reason]
4. Chữ viết tay → [HW: nội dung] hoặc [HW_UNCERTAIN: best guess]
5. Con dấu/logo → [STAMP: mô tả] hoặc [LOGO: mô tả]
6. Chữ ký → [SIGNATURE: tên hoặc unreadable]
7. Field trống → ghi "(trống)"
8. KHÔNG suy luận giá trị thiếu

QUY TẮC ĐẶC BIỆT CHO TRỌNG LƯỢNG:
9. Tìm và trích xuất MỌI con số liên quan trọng lượng: cân tổng, cân bì, hàng tịnh, số bao, SL, kg, tấn
10. Số viết tay liên quan trọng lượng → đọc CỰC KỸ, đánh dấu [HW: số] hoặc [HW_UNCERTAIN: số]
11. Nếu trọng lượng ghi bằng chữ (vd: "hai mươi tấn") → trích xuất nguyên văn + convert sang số
12. Dấu phân cách nghìn VN: dấu chấm (.) — vd: 25.000 = 25000 kg
13. Nếu có nhiều cột số → ghi rõ header cột + giá trị tương ứng
14. Số xe (biển số) cũng là thông tin quan trọng — đọc chính xác
```

### 2.2 DEFAULT User Prompt cho OCR (`src/ocr/prompt_builder.py`)

```
Hãy đọc và trích xuất TOÀN BỘ nội dung từ ảnh chứng từ trạm cân này.

Trả về dạng Markdown có cấu trúc:
1. Tiêu đề phiếu (loại chứng từ, số phiếu)
2. Thông tin header (ngày, khách hàng, xe, ...)
3. Bảng chi tiết hàng hóa (nếu có)
4. **TRỌNG LƯỢNG / SỐ LƯỢNG** — section quan trọng nhất:
   - Ghi rõ tất cả con số cân nặng tìm thấy trên phiếu
   - Bao gồm cả số viết tay, đóng dấu, gạch ngang
   - Nếu có phiếu cân đính kèm → trích xuất riêng
5. Chữ ký, con dấu, ghi chú viết tay

Giữ đúng format gốc trên phiếu. Đánh dấu rõ phần viết tay vs in sẵn.
ĐẶC BIỆT CHÚ Ý: mọi con số kg, tấn, bao — phải trích xuất chính xác, kể cả viết tay.
```

### 2.3 Multi-page chaining (`src/ocr/prompt_builder.py`)

Khi tài liệu nhiều trang, prompt_builder tự nối:

```
Trang trước (trang {N-1}) đã OCR được:
---
{markdown trang trước}
---

Bây giờ đọc tiếp trang {N}/{total}. Nếu có bảng kéo dài từ trang trước, tiếp tục bảng đó.
```

### 2.4 YAML override (`config/logistics.yml` → `system_prompt`)

Khi có → **ghi đè hoàn toàn** DEFAULT trên. Nội dung đầy đủ:

```
Bạn là hệ thống OCR chuyên biệt cho chứng từ logistics kho vận Việt Nam.
Nhiệm vụ: trích xuất CHÍNH XÁC nội dung từ ảnh chứng từ → Markdown có cấu trúc.

## QUY TẮC BẮT BUỘC

### 1. Số liệu trọng lượng — CRITICAL
Chứng từ kho vận dùng đơn vị Kg với format số Việt Nam:
- "18.420 Kg" = 18,420 kg — dấu chấm là PHÂN CÁCH NGHÌN
- "46 860 Kg" = 46,860 kg — dấu cách là PHÂN CÁCH NGHÌN
- "27 700 Kg" = 27,700 kg
- "27.500" = 27,500 (hai mươi bảy nghìn năm trăm)
- Giữ nguyên format gốc trong markdown

### 2. Biển số xe Việt Nam
- Format: [số tỉnh][chữ cái] [số đăng ký] — ví dụ "72H05242", "50H 08419"
- Xe có rơ moóc: biển đầu kéo + biển rơ moóc

### 3. Container Number & Seal
- Container: 4 chữ + 7 số — ví dụ "FTAU1848090", "DFSU1076874"
- Seal: format tùy nhà cung cấp — ví dụ "MO956606", "VNSGN25228.58"
- Đọc chính xác từng ký tự, đặc biệt phân biệt 0/O, 1/I/l

### 4. Tên tàu / Vessel
- Tên tàu có thể embedded trong mô tả hàng: "Tàu AH-GLOBE (ST4)"
- Trích xuất riêng nếu nhận diện được

### 5. Thời gian
- Nhiều format: "30/04/25", "16/10/2025", "Ngày 16 tháng 10 năm 2025"
- Giữ nguyên format gốc trong markdown

### 6. Chữ viết tay (Handwriting) — RẤT QUAN TRỌNG
- Phiếu TVL có RẤT NHIỀU chữ viết tay — đây là data chính, không phải ghi chú
- Đọc được → trích xuất bình thường, đánh dấu [HW: {nội dung}]
- Không chắc → [HW_UNCERTAIN: {best guess}]
- Chữ ký không đọc được tên → [SIGNATURE: unreadable]

### 7. Con dấu & Logo
- Logo công ty: [LOGO: {mô tả}]
- Con dấu: [STAMP: {mô tả, màu}]

### 8. Field trống vs không có
- Field có trên form nhưng để trống → ghi "(trống)"
- Field không tồn tại trên form → KHÔNG tự thêm

### 9. Ngôn ngữ
- Giữ nguyên ngôn ngữ gốc, KHÔNG dịch
- Form TVL song ngữ Việt-Anh: giữ cả hai

### 10. Không đọc được
- [UNREADABLE:blurred] — mờ
- [UNREADABLE:handwriting] — chữ tay không rõ
- [UNREADABLE:cutoff] — bị cắt mép ảnh
- KHÔNG BAO GIỜ suy luận giá trị thiếu
```

---

## 3. Extraction System Prompt — JSON extraction (`src/extract/extractor.py`)

Prompt này LUÔN dùng (không bị YAML ghi đè), gửi kèm khi yêu cầu Gemini trích xuất JSON:

```
Bạn là hệ thống trích xuất dữ liệu từ chứng từ TRẠM CÂN logistics.
Trả về ONLY valid JSON. Không markdown, không text khác.
Field không có → omit key. Field trống → null.
Số trọng lượng: normalize bỏ dấu phân cách nghìn → số nguyên (kg).
Ngày giờ → ISO 8601.

===== QUY TẮC ĐẶC BIỆT CHO TRẠM CÂN =====
1. Mọi field liên quan trọng lượng (weight, kg, tấn, bao, quantity) là CRITICAL.
2. Nếu thấy con số trọng lượng bất kỳ ở đâu trên phiếu (kể cả viết tay, ghi chú) → PHẢI extract vào weight_data.
3. Nếu trọng lượng ghi bằng tấn → CONVERT sang kg (x1000). Ghi lại đơn vị gốc vào weight_unit.
4. Nếu có 'Cân tổng'/'Gross' và 'Cân bì'/'Tare' → tính Net = Gross - Tare. Nếu Net cũng ghi trên phiếu → extract cả 3 và sẽ cross-check.
5. Số xe (biển số) là thông tin bắt buộc — tìm ở mọi vị trí trên phiếu.
6. Nếu trọng lượng không rõ ràng → extract best guess VÀ ghi note giải thích.
7. KHÔNG BAO GIỜ bỏ qua field trọng lượng — nếu không đọc được → ghi null + note.

===== MULTI-CUSTOMER: TÊN TRƯỜNG KHÁC NHAU =====
8. Phiếu từ nhiều khách hàng/nhà máy khác nhau — tên trường có thể KHÁC so với schema.
   Ví dụ: 'TL Tổng' = gross_weight_kg, 'Biển kiểm soát' = vehicle_no, 'Mã KH' = customer_name.
9. Dùng NGỮ NGHĨA để map — không khớp chính xác từng chữ.
   Map theo ý nghĩa: nếu field trên phiếu có ý nghĩa tương đương field trong schema → extract vào field schema đó.
10. Nếu có thông tin trên phiếu KHÔNG match bất kỳ field nào trong schema → extract vào "extra_fields":
    "extra_fields": { "ten_field_goc": "giá trị", ... }
    KHÔNG bỏ qua bất kỳ thông tin nào — tốt hơn là thừa data trong extra_fields.

===== FIELD CONFIDENCE (BẮT BUỘC) =====
Trong JSON trả về, thêm key "_field_confidence" chứa confidence cho MỌI field. Format:
"_field_confidence": {
  "header.company_name": {"level": "high", "source": "printed"},
  "weight_data.net_weight_kg": {"level": "medium", "source": "handwritten", "note": "số viết tay mờ"},
  "line_items[0].quantity": {"level": "low", "source": "handwritten", "note": "không rõ chữ số"},
  ...
}

Quy tắc level:
- "high": đọc rõ ràng, chắc chắn chính xác
- "medium": đọc được nhưng có thể sai (chữ mờ, viết tay khó đọc, bị che 1 phần)
- "low": không chắc chắn, phải đoán (rất mờ, bị cắt, chữ viết tay rất xấu)

Quy tắc source:
- "printed": chữ in/đánh máy
- "handwritten": chữ viết tay
- "stamp": con dấu
- "mixed": kết hợp in + viết tay
- "inferred": suy luận từ ngữ cảnh

QUAN TRỌNG: Với field trọng lượng, nếu level là 'low' → BẮT BUỘC ghi note chi tiết.
```

### 3.1 Extraction User Prompt (YAML override) — `config/logistics.yml`

```
Trích xuất dữ liệu từ chứng từ logistics theo JSON schema.

QUY TẮC:
1. Trả về ONLY valid JSON. Không text khác, không markdown backtick.
2. Field không có trên phiếu → KHÔNG đưa vào JSON (omit key hoàn toàn)
3. Field có trên phiếu nhưng trống → null
4. Số trọng lượng: normalize bỏ dấu phân cách nghìn → số nguyên (kg)
   "18.420 Kg" → 18420 | "46 860 Kg" → 46860 | "27.500" → 27500
5. Ngày giờ → ISO 8601: "30/04/25" → "2025-04-30"
6. Container number: uppercase, bỏ khoảng trắng
7. Nếu thấy giá trị viết tay khác giá trị in → trích xuất CẢ HAI
```

### 3.2 Fallback extraction prompt (code) — khi YAML không có

```
Trích xuất dữ liệu có cấu trúc từ chứng từ logistics bên dưới.
Trả về ONLY valid JSON theo schema đã cho.
Field không có → omit key. Field trống → null.
```

### 3.3 Prompt được ghép nối thế nào (`prompt_builder.build_extraction_prompt`)

```
{extraction_prompt từ YAML hoặc fallback}

## Document Type: {document_type}

## JSON Schema:
```json
{schema JSON đầy đủ}
```

## Document Content (Markdown):
{markdown OCR output}
```

---

## 4. Classification — Phân loại chứng từ

### 4.1 Keyword rules hardcode (`src/classify/rules.py`)

Chạy TRƯỚC, khớp → trả ngay (confidence = 0.85, method = "rule"):

```python
KEYWORD_RULES = [
    # DELIVERY_NOTE — Phiếu xuất kho
    (["phiếu xuất kho", "delivery note", "phieu xuat kho"],
     DELIVERY_NOTE, None),

    # RECEIPT_NOTE — Phiếu nhập kho
    (["phiếu nhập kho", "receipt note", "phieu nhap kho"],
     RECEIPT_NOTE, None),

    # WEIGHBRIDGE_TICKET — port variant
    (["phiếu cân kiêm", "weighbridge", "phiếu xuất kho - giao nhận"],
     WEIGHBRIDGE_TICKET, "port"),

    # WEIGHBRIDGE_TICKET — factory variant
    (["weighting data", "phiếu cân hàng", "phieu can hang"],
     WEIGHBRIDGE_TICKET, "factory"),

    # WEIGHBRIDGE_TICKET — generic (bất kỳ phiếu cân nào)
    (["phiếu cân", "trọng lượng vào", "trọng lượng ra",
      "weight in", "weight out", "cân vào", "cân ra",
      "t.lượng khi vào", "t.lượng khi ra"],
     WEIGHBRIDGE_TICKET, None),
]
```

Logic: case-insensitive substring match trên markdown text.

### 4.2 AI classification prompt (YAML override) — `config/logistics.yml`

Nếu keyword không khớp → gọi Gemini với prompt này:

```
Phân loại chứng từ logistics này vào đúng 1 loại.
Trả về JSON duy nhất, không text khác:
{ "document_type": "...", "confidence": 0.0-1.0, "sub_variant": "..." }

Các loại hiện hỗ trợ:
- DELIVERY_NOTE: Phiếu xuất kho (Delivery Note). Nhận dạng:
  tiêu đề "PHIẾU XUẤT KHO" hoặc "DELIVERY NOTE", có bảng hàng hóa xuất.
  Sub-variant:
    "bag" — hàng bao (có đơn vị Bao, Kg)
    "container" — hàng xá đóng cont (có Container No, Seal No)
    "bulk" — hàng xá rời
- RECEIPT_NOTE: Phiếu nhập kho (Receipt Note). Nhận dạng:
  tiêu đề "PHIẾU NHẬP KHO" hoặc "RECEIPT NOTE", có bảng hàng nhập.
- WEIGHBRIDGE_TICKET: Phiếu cân hàng. Nhận dạng:
  có trọng lượng vào/ra, biển số xe, thời gian cân.
  Sub-variant:
    "port" — phiếu từ cảng
    "factory" — phiếu từ nhà máy
- UNKNOWN: Không nhận dạng được
```

### 4.3 Keyword rules trong YAML (`config/logistics.yml`)

```yaml
keyword_rules:
  DELIVERY_NOTE:
    - "phiếu xuất kho"
    - "delivery note"
  RECEIPT_NOTE:
    - "phiếu nhập kho"
    - "receipt note"
  WEIGHBRIDGE_TICKET:
    - "phiếu cân"
    - "weighting data"
    - "weighbridge"
    - "trọng lượng vào"
    - "trọng lượng ra"
```

> **Lưu ý**: Keyword trong code (rules.py) và keyword trong YAML (logistics.yml) có overlap nhưng KHÁC NHAU. Code có thêm `"phieu xuat kho"` (không dấu), `"t.lượng khi vào"`, `"cân vào"`. YAML có `"weighting data"` (typo? nên là "weighing data").

---

## 5. Confidence Scoring — Formulas (`src/extract/confidence.py`)

### 5.1 Constants

```python
# Layer 1: AI level → numeric score
AI_LEVEL_MAP = {"high": 0.95, "medium": 0.70, "low": 0.40}

# Source bonus/penalty
SOURCE_ADJUST = {
    "printed":     +0.03,
    "handwritten": -0.05,
    "stamp":        0.00,
    "mixed":       -0.03,
    "inferred":    -0.10,
}
```

### 5.2 Layer 2: Cross-Verification scores

So sánh extracted value ↔ OCR markdown text:

| Kết quả match | Score | Reason |
|---------------|-------|--------|
| Direct match (text found in OCR) | 0.95 | "verified in OCR" |
| Number found as-is | 0.95 | "number verified" |
| Number with VN separator (25.000) | 0.90 | "number verified (formatted)" |
| Number not found | 0.60 | "number not found in OCR" |
| Date found (DD/MM/YYYY variants) | 0.90 | "date verified" |
| Date not found | 0.65 | "date not found in OCR" |
| Partial word match ≥ 70% | 0.85 | "partial match (N/M words)" |
| Weak word match 40-70% | 0.65 | "weak match" |
| Poor word match < 40% | 0.40 | "poor match" |
| null value | 0.50 | "null" |
| Short string not found | 0.50 | "not found in OCR" |
| Too short to verify (< 2 chars) | 0.70 | — |

### 5.3 Layer 3: Heuristic scores

Dựa trên field name + value pattern:

| Pattern | Score | Reason |
|---------|-------|--------|
| `[UNREADABLE...]` marker | 0.15 | "marked unreadable" |
| `[HW_UNCERTAIN...]` marker | 0.40 | "uncertain handwriting" |
| `[HW:...]` marker | 0.65 | "handwritten" |
| Weight field + numeric + positive | 0.95 | "numeric OK" |
| Weight field + NOT numeric | 0.55 | "weight not numeric" |
| Date field + ISO format | 0.90 | "ISO date" |
| Date field + wrong format | 0.60 | "date format issue" |
| Container + ISO 6346 valid | 0.95 | "valid container" |
| Container + invalid format | 0.60 | "container format issue" |
| Empty string | 0.50 | "empty" |
| Very short (≤ 1 char) | 0.55 | "very short" |
| Default (everything else) | 0.85 | — |

### 5.4 Final Score Formula

```
CÓ AI confidence:
  final = AI_score × 0.50 + CrossVerify × 0.30 + Heuristic × 0.20

KHÔNG CÓ AI confidence:
  final = CrossVerify × 0.50 + Heuristic × 0.50

AI_score = AI_LEVEL_MAP[level] + SOURCE_ADJUST[source]
           clamp to [0.1, 1.0]

final = clamp to [0.05, 1.0], round 2 decimals
```

### 5.5 Score → Level

```python
≥ 0.80  →  "high"
≥ 0.55  →  "medium"
< 0.55  →  "low"
```

### 5.6 Overall + Warnings

```python
overall = average(all field scores)
warnings = [field.reason for field in fields if field.confidence < 0.65]
```

---

## 6. Validation Rules Engine (`src/extract/validator.py`)

### 6.1 Check types có sẵn trong code

| Check type | Logic | Params |
|-----------|-------|--------|
| `exists` | field ≠ null, ≠ {}, ≠ [] | — |
| `required` | field ≠ null | — |
| `range` | min ≤ value ≤ max, value > 0 | `min`, `max` |
| `weight_consistency` | \|gross - tare\| = net ± tolerance | `gross`, `tare`, `net`, `tolerance_pct`, `tolerance_abs_kg` |
| `line_weight_match` | Σ(line_items.weight) ≈ net_weight | `weight_field`, `tolerance_pct` |
| `vehicle_plate` | Regex `^\d{2}[A-Z]\d{3,5}$` (sau khi bỏ space/dash) | — |
| `date_sanity` | Not future, not > 365 days old | — |
| `container_format` | Regex `^[A-Z]{4}\d{7}$` (ISO 6346) | — |

### 6.2 Weight consistency chi tiết

```python
tolerance = max(tolerance_abs_kg, net × tolerance_pct / 100)
# Mặc định: max(50, net × 0.02)
diff = abs(|gross - tare| - net)

if diff ≤ tolerance → PASSED
else → ERROR "CRITICAL_weight_calc_MISMATCH"

# Sanity ranges cho từng loại:
Gross (Cân tổng): 1,000 – 100,000 kg
Tare  (Cân bì):   1,000 – 50,000 kg
Net   (Hàng tịnh):     1 – 80,000 kg
```

### 6.3 Weighbridge auto-mapping

Với WEIGHBRIDGE_TICKET, trước khi validate sẽ tự map:
```python
weight_data.gross_weight_kg = max(core.weight_in_kg, core.weight_out_kg)
weight_data.tare_weight_kg  = min(core.weight_in_kg, core.weight_out_kg)
weight_data.net_weight_kg   = core.net_weight_kg
```

### 6.4 Default rules (`config/customers/_default.yml`)

```yaml
validation_rules:
  - field: "weight_data"
    check: "exists"
    severity: "error"
    message: "Không có dữ liệu trọng lượng"

  - field: "weight_data"
    check: "weight_consistency"
    params:
      gross: "weight_data.gross_weight_kg"
      tare: "weight_data.tare_weight_kg"
      net: "weight_data.net_weight_kg"
      tolerance_pct: 2.0
      tolerance_abs_kg: 50
    severity: "error"

  - field: "weight_data.gross_weight_kg"
    check: "range"
    params: { min: 1000, max: 100000 }
    severity: "warning"

  - field: "weight_data.tare_weight_kg"
    check: "range"
    params: { min: 1000, max: 50000 }
    severity: "warning"

  - field: "weight_data.net_weight_kg"
    check: "range"
    params: { min: 1, max: 80000 }
    severity: "warning"

  - field: "document_info.vehicle_no"
    check: "vehicle_plate"
    severity: "warning"

  - field: "document_info.document_number"
    check: "required"
    severity: "warning"

  - field: "line_items"
    check: "line_weight_match"
    params:
      weight_field: "weight_data.net_weight_kg"
      tolerance_pct: 5.0
    severity: "info"
```

### 6.5 YAML instance rules (`config/logistics.yml`)

```yaml
validation:
  rules:
    - name: "document_number_present"
      rule: "document_number is not null and not empty"
      severity: "warning"

    - name: "date_sanity"
      rule: "document_date <= current_date AND document_date >= current_date - 365"
      severity: "warning"

    - name: "container_format"
      rule: "container_no matches /^[A-Z]{4}\\d{7}$/"
      severity: "warning"

    - name: "net_weight_calc"
      rule: "|weight_in_kg - weight_out_kg| == net_weight_kg"
      tolerance_kg: 50
      severity: "error"
      applies_to: "WEIGHBRIDGE_TICKET"

    - name: "weight_sanity"
      rule: "weight > 0 AND weight < 80000"
      severity: "error"
      applies_to: "WEIGHBRIDGE_TICKET"
```

### 6.6 Customer override rules

Mỗi customer có thể:
- **Override toàn bộ**: dùng key `validation_rules` → thay hết default
- **Thêm rules**: dùng key `extra_validation_rules` → merge lên default

Ví dụ Baconco:
```yaml
extra_validation_rules:
  - field: "weight_data.total_quantity_kg"
    check: "required"
    severity: "warning"
    message: "Baconco: cần có tổng số lượng hàng"
```

---

## 7. Field Aliases — Map tên trường (`config/field_aliases.yml`)

### 7.1 Cơ chế normalize (`src/extract/field_aliases.py`)

```
1. lowercase + strip
2. NFKD decompose → bỏ dấu tiếng Việt
3. space/hyphen/dot → underscore
4. Bỏ ký tự đặc biệt (giữ a-z, 0-9, _)
5. Lookup trong alias map → standard path
6. Không match → chuyển vào extra_fields
```

### 7.2 Full alias table

**Weight data:**

| Standard | Aliases |
|----------|---------|
| `weight_data.gross_weight_kg` | gross_weight, can_tong, tl_tong, total_weight, trong_luong_tong, gross_wt, gross, weight_gross, weight_in_kg |
| `weight_data.tare_weight_kg` | tare_weight, can_bi, tl_bi, vehicle_weight, trong_luong_xe, trong_luong_bi, tare_wt, tare, empty_weight, weight_out_kg |
| `weight_data.net_weight_kg` | net_weight, hang_tinh, tl_tinh, tl_hang, trong_luong_tinh, trong_luong_hang, net_wt, net, cargo_weight |
| `weight_data.total_quantity_kg` | total_quantity, tong_sl, tong_so_luong, total_qty, qty_total, so_luong_tong |
| `weight_data.bag_count` | so_bao, tong_bao, total_bags, bags, number_of_bags, sl_bao |
| `weight_data.weight_per_bag_kg` | tl_bao, trong_luong_bao, bag_weight, per_bag_kg |

**Document info:**

| Standard | Aliases |
|----------|---------|
| `document_info.document_number` | doc_number, so_phieu, so_chung_tu, phieu_so, ticket_no, ref_no, so_hd, invoice_no, bill_no, receipt_no, voucher_no |
| `document_info.document_date` | doc_date, ngay, ngay_phieu, ngay_chung_tu, date, issue_date, created_date, ngay_lap |
| `document_info.customer_name` | khach_hang, ten_kh, doi_tuong, client_name, buyer_name, receiver_name, consignee, shipper, nguoi_nhan, nguoi_gui, doi_tuong_xuat, doi_tuong_nhap, ten_khach_hang |
| `document_info.vehicle_no` | so_xe, bien_so, bien_so_xe, truck_no, truck_plate, plate_no, license_plate, vehicle_plate, bsx, xe_so, vehicle_number, car_no, truck_number |
| `document_info.transporter_name` | nguoi_van_chuyen, tai_xe, driver_name, driver, ten_tai_xe, ten_lx, carrier_name |
| `document_info.supplier_name` | nha_cung_ung, ten_ncc, vendor_name, seller_name, nguoi_ban |
| `document_info.stock_location` | kho, warehouse, vi_tri_kho, storage_location, ten_kho, warehouse_name |

**Header:**

| Standard | Aliases |
|----------|---------|
| `header.company_name` | ten_cong_ty, ten_cty, company, cong_ty |
| `header.mst` | ma_so_thue, tax_id, tax_code, tax_number, vat_number |

**Line items:**

| Standard | Aliases |
|----------|---------|
| `line_items.product_description` | ten_hang, ten_san_pham, product_name, item_name, description, goods_description, mo_ta_hang, hang_hoa, ten_hang_hoa |
| `line_items.quantity` | so_luong, sl, qty, amount, so_luong_thuc |
| `line_items.unit` | don_vi, dvt, uom, unit_of_measure |
| `line_items.container_no` | so_container, cont_no, container_number, cont, so_cont |
| `line_items.seal_no` | so_seal, seal_number, seal, so_niem_phong |

**Weighbridge:**

| Standard | Aliases |
|----------|---------|
| `core.weight_in_kg` | weight_in, can_vao, first_weight, lan_can_1 |
| `core.weight_out_kg` | weight_out, can_ra, second_weight, lan_can_2 |
| `core.direction` | huong, xuat_nhap, in_out, loai_can |

---

## 8. Display Builder (`src/api/v1/display_builder.py`)

### 8.1 Field Labels — Vietnamese

```python
FIELD_LABELS = {
    # Header
    "company_name": "Công ty",   "mst": "Mã số thuế",
    "form_title": "Tiêu đề",    "copy_info": "Liên",
    # Document info
    "document_date": "Ngày",     "document_number": "Số phiếu",
    "customer_name": "Khách hàng", "vehicle_no": "Số xe",
    "transporter_name": "Người vận chuyển", "stock_location": "Kho",
    "supplier_name": "Nhà cung ứng", "contract_po_no": "Số HĐ/PO",
    # Weight
    "gross_weight_kg": "Cân tổng (kg)", "tare_weight_kg": "Cân bì (kg)",
    "net_weight_kg": "Hàng tịnh (kg)", "total_quantity_kg": "Tổng SL (kg)",
    "bag_count": "Số bao",      "weight_per_bag_kg": "TL/bao (kg)",
    # Line items
    "stt": "STT",               "product_description": "Tên hàng",
    "quantity": "Số lượng",      "weight_kg": "TL (kg)",
    "container_no": "Container", "seal_no": "Seal",
    "vessel_name": "Tàu",       "order_quantity": "SL chứng từ",
    "delivered_quantity": "Thực nhập",
    # Weighbridge
    "direction": "Hướng",        "weight_in_kg": "Cân vào (kg)",
    "weight_out_kg": "Cân ra (kg)", "truck_plate": "Biển đầu kéo",
    "trailer_plate": "Biển rơ moóc", "driver_name": "Tài xế",
    "weigh_in_datetime": "TG cân vào", "weigh_out_datetime": "TG cân ra",
    # Port
    "template_code": "Mã mẫu",  "transaction_number": "Số giao dịch",
    "hold_number": "Hầm tàu",   "service_type": "Loại dịch vụ",
    "crane": "Cần cẩu",         "lgh_number": "Số LGH",
    # Factory
    "po_number": "Số PO",       "weigher_name": "Nhân viên cân",
    # Signatures
    "role": "Vai trò",          "status": "Trạng thái",
    "content": "Nội dung",      "position": "Vị trí",
}
```

### 8.2 Section Config — 11 sections, thứ tự cố định

```python
SECTION_CONFIG = [
    # 1. TRỌNG LƯỢNG — luôn hiện đầu tiên, render dạng cards
    { "key": "weight_data",   "render": "weight_cards",
      "weight_card_fields": ["gross_weight_kg", "tare_weight_kg",
                             "net_weight_kg", "total_quantity_kg", "bag_count"],
      "collapsed": False },

    # 2. Phiếu cân (weighbridge core) — key_value, skip signatures/vehicle nested
    { "key": "core",          "render": "key_value",
      "skip_keys": {"signatures", "handwritten_marks", "vehicle"},
      "flatten_keys": {"vehicle": ["truck_plate", "trailer_plate"]},
      "collapsed": False },

    # 3. Thông tin chứng từ
    { "key": "document_info", "render": "key_value", "collapsed": False },

    # 4. Hàng hóa — bảng
    { "key": "line_items",    "render": "table", "collapsed": False },

    # 5. Thông tin công ty — thu gọn mặc định
    { "key": "header",        "render": "key_value", "collapsed": True },

    # 6. Chữ ký — chips
    { "key": "signatures",    "render": "chips",
      "chip_template": {"icon_field": "status", "primary": "role", "secondary": "name"},
      "collapsed": False },

    # 7. Ghi chú viết tay — chips
    { "key": "handwritten_marks", "render": "chips",
      "chip_template": {"primary": "content", "secondary": "position"},
      "collapsed": False },

    # 8-9. Port / Factory specific
    { "key": "port_specific",    "render": "key_value", "collapsed": False },
    { "key": "factory_specific", "render": "key_value", "flatten": True, "collapsed": False },

    # 10. Extra fields (ngoài schema)
    { "key": "extra_fields",  "render": "key_value", "collapsed": False },

    # 11. OCR Metadata — thu gọn
    { "key": "ocr_metadata",  "render": "key_value", "collapsed": True },
]
```

### 8.3 Weight card styles

```python
"gross_weight_kg"    → card_style = "secondary"
"tare_weight_kg"     → card_style = "secondary"
"net_weight_kg"      → card_style = "primary"    # NỔI BẬT NHẤT
everything else      → card_style = "default"
unit = "bao" nếu bag_count, còn lại = "kg"
```

### 8.4 Render types — Frontend cần implement 4 loại

| Render type | Data structure | Mô tả |
|-------------|---------------|--------|
| `weight_cards` | `fields[]: {key, label, value, type, is_card, card_style, unit, confidence}` | Cards nổi bật cho trọng lượng |
| `key_value` | `fields[]: {key, label, value, type, confidence}` | Bảng 2 cột label-value |
| `table` | `columns[]: {key, label}` + `rows[]: {_index, [col]: {value, type, confidence}}` | Bảng đầy đủ |
| `chips` | `items[]: {primary, secondary, icon_field, _raw}` | Tags/badges nhỏ |

---

## 9. JSON Schema — Cấu trúc output cho từng document type

### 9.1 DELIVERY_NOTE (`config/schema/delivery_note.json`)

```
header:
  company_name, company_address, company_phone, company_fax, mst, form_title, copy_info

document_info:
  document_date (ISO 8601), document_number, customer_name, based_on,
  customer_address, vehicle_no (CRITICAL), transporter_name, stock_location, stock_details

weight_data (CRITICAL):
  gross_weight_kg, tare_weight_kg, net_weight_kg (number|null, kg)
  total_quantity_kg, bag_count (integer), weight_per_bag_kg
  weight_unit, weight_note

line_items[] (CRITICAL):
  stt, product_code, product_description, unit, quantity, weight_kg
  note, container_no, seal_no, vessel_name, destination

signatures[]: role, label, name, status (signed|signed_unreadable|unsigned)
handwritten_marks[]: content, position, is_weight_related (bool), confidence (readable|uncertain|unreadable)
extra_fields: { additionalProperties }
```

### 9.2 RECEIPT_NOTE (`config/schema/receipt_note.json`)

Giống DELIVERY_NOTE nhưng:
- `document_info` có `supplier_name` thay vì `customer_name`
- `document_info` có `contract_po_no`, `warehouse`
- `header` có thêm `serial_no`
- `line_items[]` có `order_quantity` (SL chứng từ) + `delivered_quantity` (thực nhập) thay vì `quantity`

### 9.3 WEIGHBRIDGE_TICKET (`config/schema/weighbridge_ticket.json`)

```
sub_variant: "port" | "factory" | null

core:
  document_number, document_date
  direction: "IN" | "OUT" | "UNKNOWN"
  customer_name, product_name
  vehicle: { truck_plate, trailer_plate }
  weighbridge_id
  weight_in_kg, weight_out_kg, net_weight_kg (INTEGER, kg)
  weigh_in_datetime, weigh_out_datetime (ISO 8601)
  driver_name, remark
  signatures[], handwritten_marks[]  ← NẰM TRONG core

port_specific (khi sub_variant = "port"):
  template_code, transaction_number, shift, lgh_number
  vessel_name, hold_number, service_type, destination
  bag_count, specification
  tare_weight_kg, gross_with_tare_kg
  crane, driver_license, internal_code, er_code

factory_specific (khi sub_variant = "factory"):
  company: { name, address, phone, fax }
  po_number, direction_label, weigher_name

extra_fields: { additionalProperties }
```

---

## 10. Customer Profile System

### 10.1 Default (`config/customers/_default.yml`)

```yaml
customer_id: _default
customer_name: "Default"
document_types: [DELIVERY_NOTE, RECEIPT_NOTE, WEIGHBRIDGE_TICKET]
field_mapping: {}                    # Không override alias
extra_fields: []                     # Không có field đặc thù
validation_rules: [...]              # 8 rules mặc định (xem section 6.4)
confidence:
  high_threshold: 0.80
  medium_threshold: 0.55
  warning_threshold: 0.65
```

### 10.2 Ví dụ customer: Baconco (`config/customers/baconco.yml`)

```yaml
customer_id: baconco
customer_name: "CÔNG TY TNHH BACONCO"
description: "KCN Phú Mỹ I — phiếu cân kết hợp xuất kho"

document_types: [DELIVERY_NOTE, WEIGHBRIDGE_TICKET]

field_mapping:
  "Nhân viên cân": "document_info.transporter_name"
  "Ghi chú (Remark)": "weight_data.weight_note"

extra_fields:
  - name: weigher_name
    type: string
    description: "Tên nhân viên cân"

extra_validation_rules:
  - field: "weight_data.total_quantity_kg"
    check: "required"
    severity: "warning"
    message: "Baconco: cần có tổng số lượng hàng"
```

---

## 11. OCR + Extraction — Gemini params

```python
# OCR Vision call (ảnh → markdown)
model = "gemini-2.5-pro"      # hoặc fallback: "gemini-2.5-flash"
temperature = 0.1              # thấp để chính xác
max_output_tokens = 8192
# MIME types: image/jpeg, image/png, image/webp, image/bmp, image/tiff

# Extraction call (markdown → JSON)
model = "gemini-2.5-pro"
temperature = 0.1
max_output_tokens = 8192
system_instruction = EXTRACTION_SYSTEM_PROMPT (section 3)
```

---

## 12. Pipeline Flow (`src/pipeline.py`)

```
[Upload file]
     │
     ▼
[Stage 2: Convert]  PDF → split pages → preprocess_image()
     │               Image → single page
     ▼
[Stage 3: OCR]      Gemini Vision (system_prompt + user_prompt)
     │               → full_markdown + page tokens
     ▼
[Stage 3.5: Classify]  classify_by_rules(markdown)     ← keyword match
     │                  │ nếu None → Gemini classify    ← AI fallback
     │                  → {document_type, confidence, sub_variant}
     ▼
[Stage 4: Extract]  Gemini text (EXTRACTION_SYSTEM_PROMPT + schema + markdown)
     │               → raw JSON with _field_confidence
     │               → normalize_extracted_data() (field aliases)
     │               → validate_extracted() (rule engine)
     │               → score_confidence() (3-layer scoring)
     ▼
[Stage 5: Output]   Write .json + .md
     │               Build OcrProcessResponse
     ▼
[API Response]      job_id, status, extracted_data, confidence_report,
                    validation_report, markdown_content, result_id
```

---

## 13. ENV Variables

```env
SAHUS_OCR_GEMINI_API_KEY=xxx              # BẮT BUỘC
SAHUS_OCR_INSTANCE_CONFIG_PATH=config/logistics.yml
SAHUS_OCR_OUTPUT_DIR=./ocr_output
SAHUS_OCR_GEMINI_MODEL=gemini-2.5-pro
SAHUS_OCR_GEMINI_FALLBACK_MODEL=gemini-2.5-flash
SAHUS_OCR_CONCURRENCY=5
SAHUS_OCR_MAX_RETRIES=2
SAHUS_OCR_TIMEOUT_SECONDS=30
SAHUS_OCR_IMAGE_DENSITY=300
SAHUS_OCR_IMAGE_MAX_HEIGHT=2048
SAHUS_OCR_MAX_UPLOAD_SIZE_MB=20
```

Windows bắt buộc: `PYTHONIOENCODING=utf-8` khi chạy server.

---

## 14. Checklist build lại hệ thống

- [ ] Viết system prompt OCR (10 quy tắc đặc thù domain)
- [ ] Viết extraction system prompt (rules weight, multi-customer, field confidence)
- [ ] Viết extraction user prompt (normalize rules: số, ngày, container)
- [ ] Viết classification prompt + keyword rules (cả code + YAML)
- [ ] Thiết kế JSON schema cho mỗi document type (mark CRITICAL fields)
- [ ] Thu thập field aliases (ít nhất 5-10 variant mỗi field quan trọng)
- [ ] Cấu hình validation rules + tolerance values
- [ ] Tuning confidence: AI_LEVEL_MAP, SOURCE_ADJUST, cross-verify scores, heuristic scores
- [ ] Cấu hình display sections + field labels tiếng Việt
- [ ] Tạo customer profiles nếu có nhiều khách hàng
- [ ] Chạy thử 20+ phiếu → review confidence distribution → adjust thresholds
