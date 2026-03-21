# Dynamic Query — Nghiên Cứu & Giải Pháp

> **Mục tiêu tài liệu**: Giải thích bài toán, quá trình nghiên cứu và kiến trúc giải pháp Dynamic Query trong hệ thống Smartlog CodeBase — nhìn từ góc độ kiến trúc và lợi ích business.

---

## 1. Bài Toán

### 1.1 Tình huống thực tế

Smartlog CodeBase cần quản lý hơn **20 loại dữ liệu nghiệp vụ** (Locations, Products, Currencies, Accounts, v.v.). Mỗi loại có trang danh sách riêng với các yêu cầu:

- **Lọc dữ liệu** theo nhiều điều kiện khác nhau (tên, mã, ngày tạo, trạng thái...)
- **Sắp xếp** theo bất kỳ cột nào người dùng chọn
- **Phân trang** với tổng số bản ghi chính xác
- **Hiển thị cột động** — mỗi vai trò người dùng thấy các cột khác nhau
- **Kết nối bảng liên quan** (JOIN) để lấy tên thay vì ID

### 1.2 Nếu không có Dynamic Query

Với cách truyền thống (hardcode SQL/EF trong từng handler):

```
Mỗi entity cần:
  → 1 LINQ query phức tạp  (50-100 dòng code)
  → Xử lý filter/sort/paging thủ công
  → JOIN với bảng liên quan thủ công
  → Thay đổi cột → sửa code → redeploy

Với 20 entity → 20 queries × 100 dòng = 2.000+ dòng code lặp lại
```

**Vấn đề:**
- Code lặp lại (DRY violation) — khó bảo trì
- Thay đổi logic filter/sort/paging → sửa ở nhiều nơi
- Thêm entity mới → viết lại toàn bộ query
- Schema thay đổi → sửa nhiều file

---

## 2. Nghiên Cứu Các Giải Pháp

### 2.1 Bảng so sánh

| Tiêu chí | Hardcoded EF/LINQ | OData | GraphQL | **Dynamic Query (Đã Chọn)** |
|----------|:-----------------:|:-----:|:-------:|:---------------------------:|
| Zero-code cho entity mới | ❌ | ✅ | ✅ | ✅ |
| Kiểm soát SQL được tạo ra | ✅ | ⚠️ Một phần | ⚠️ Một phần | ✅ Toàn quyền |
| SQL tối ưu, chỉ JOIN khi cần | ✅ (thủ công) | ❌ | ❌ | ✅ Tự động |
| Cấu hình không cần redeploy | ❌ | ❌ | ❌ | ✅ |
| Tích hợp phân quyền cột (FormCode) | ❌ | ❌ | ❌ | ✅ |
| Độ phức tạp khi query phức tạp | Đơn giản | Trung bình | Cao | Trung bình |
| Learning curve | Thấp | Trung bình | Cao | **Trung bình** |
| Bảo mật SQL Injection | ✅ | ✅ | ✅ | ✅ (parameterized) |
| Phù hợp multi-tenant | ⚠️ | ⚠️ | ⚠️ | ✅ |

### 2.2 Lý do chọn Dynamic Query

**OData** — Phù hợp cho việc expose toàn bộ data model ra ngoài, nhưng khó kiểm soát SQL được tạo ra, không tích hợp tốt với hệ thống phân quyền cột (FormCode) hiện có.

**GraphQL** — Mạnh cho client-driven queries, nhưng overhead lớn cho use case listing đơn giản. Cần client biết cấu trúc data, không phù hợp với Config-Driven UI.

**Dynamic Query (được chọn)** — Giữ toàn quyền kiểm soát SQL, tích hợp tự nhiên với FormCode metadata system, hỗ trợ Fluid Template cho logic phức tạp, zero-code cho entity mới.

---

## 3. Kiến Trúc Giải Pháp

### 3.1 Tổng quan pipeline

```
HTTP Request (POST /api/locations/search)
        │
        ▼
┌─────────────────────┐
│  LocationsController│  ← Nhận DynamicGridQuery request
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│              DynamicGridQueryHandler                 │
│                                                     │
│  1. Load JSON Config  ───► QueryConfigs/Locations.json
│  2. Fetch Column Meta ───► FormCode: CATLOCAG01      │
│  3. Build Filters     ───► FormCode: CATLOCAS01      │
│  4. Render Templates  ───► Fluid Template Engine     │
│  5. Generate SQL      ───► JsonConfigQueryBuilder    │
│  6. Execute SQL       ───► Dapper (QueryMultiple)    │
│  7. Return Result     ───► DynamicGridResult         │
└─────────────────────────────────────────────────────┘
           │
           ▼
       DynamicGridResult
       { items[], columns[], totalCount, pagination }
```

### 3.2 QueryConfig JSON — Trái tim của giải pháp

Mỗi entity có **1 file JSON config** trong `src/QueryConfigs/`. File này định nghĩa **toàn bộ** cấu trúc query mà không cần viết code.

**Cấu trúc file JSON:**

```
QueryConfig
├── TABLE_INFO      ← Bảng chính, schema, alias, FormCodes
├── COLUMN_INFO[]   ← Danh sách cột có thể hiển thị
├── JOIN_INFO[]     ← Bảng liên quan có thể JOIN
├── WHERE_INFO[]    ← Điều kiện lọc cố định và động
└── ORDER_INFO[]    ← Thứ tự sắp xếp mặc định
```

**Ví dụ minh họa (Locations — đã đơn giản hóa):**

```json
{
  "TABLE_INFO": {
    "DB_NM": "cat",
    "TABLE_NM": "location",
    "TABLE_ALIAS": "l",
    "GRID_FORM_CODE": "CATLOCAG01",
    "SEARCH_FORM_CODE": "CATLOCAS01"
  },
  "COLUMN_INFO": [
    { "COLUMN_NM": "code",         "COLUMN_ALIAS": "code",        "QUERY": "l.code"      },
    { "COLUMN_NM": "name",         "COLUMN_ALIAS": "name",        "QUERY": "l.name"      },
    { "COLUMN_NM": "country_name", "COLUMN_ALIAS": "countryName", "QUERY": "c.name"      },
    { "COLUMN_NM": "type_name",    "COLUMN_ALIAS": "typeName",
      "QUERY": "CASE l.type_id WHEN 1 THEN 'Port' WHEN 2 THEN 'Warehouse' END" }
  ],
  "JOIN_INFO": [
    {
      "SORT_SEQ": 1,
      "TABLE_NM": "country", "TABLE_ALIAS": "c", "DB_NM": "cat",
      "JOIN_TYPE": "LEFT",
      "QUERY": "ON l.country_id = c.id"
    }
  ],
  "WHERE_INFO": [
    { "SORT_SEQ": 1, "QUERY": "l.deleted_time IS NULL" },
    { "SORT_SEQ": 2,
      "QUERY": "{% if filter %}AND (l.code ILIKE @filter OR l.name ILIKE @filter){% endif %}" }
  ],
  "ORDER_INFO": [
    { "SORT_SEQ": 1, "QUERY": "l.created_time DESC" }
  ]
}
```

---

## 4. Tính Năng Nổi Bật

### 4.1 Smart Join Optimization

**Vấn đề**: Nếu luôn JOIN tất cả bảng liên quan, query sẽ chậm không cần thiết.

**Giải pháp**: Engine phân tích cột nào đang được hiển thị (`COLUMN_INFO`) và **chỉ include JOIN khi có ít nhất 1 cột của bảng đó được chọn hiển thị**.

```
Ví dụ: User chỉ chọn xem [code, name, typeName]
  → "country_name" dùng JOIN với bảng "country" → KHÔNG được chọn
  → JOIN "country" sẽ bị BỎ QUA tự động
  → SQL tạo ra gọn hơn, nhanh hơn
```

Điều này đặc biệt quan trọng khi một entity có thể có 5-10 bảng JOIN tiềm năng.

### 4.2 Fluid Template — Logic filter động

Trong `WHERE_INFO`, điều kiện có thể chứa **Fluid Template** (ngôn ngữ template tương tự Liquid):

```
{% if filter %}AND (l.code ILIKE @filter OR l.name ILIKE @filter){% endif %}
```

- `{% if filter %}` — Chỉ thêm điều kiện này nếu user đã nhập giá trị filter
- `@filter` — Parameter được escape tự động, **không thể SQL Injection**
- Hỗ trợ: `{% if %} {% else %} {% endif %}`, vòng lặp `{% for %}`, functions Fluid

**Kết quả**: Cùng 1 query config xử lý được trường hợp có filter lẫn không có filter, không cần viết 2 query khác nhau.

### 4.3 Tích hợp FormCode — Phân quyền cột

**FormCode** là mã định danh liên kết config backend với UI frontend và hệ thống phân quyền:

```
CATLOCAG01
│││└─── 01 = thứ tự
││└──── G = Grid (danh sách)
│└───── LOC = 4 ký tự đại diện tên bảng (location)
└────── CAT = schema (masterdata)
```

| Schema | Ký hiệu | Ví dụ entity | Grid Code | Search Code |
|--------|---------|-------------|-----------|-------------|
| masterdata (cat) | CAT | currency | CATCURRG01 | CATCURRS01 |
| masterdata (cat) | CAT | location | CATLOCAG01 | CATLOCAS01 |
| operations (ops) | OPS | order | OPSORDEG01 | OPSORDES01 |
| system (sys) | SYS | account | SYSACCOG01 | SYSACCOS01 |

Khi engine load config, nó dùng `GRID_FORM_CODE` để:
1. Lấy danh sách cột **visible** cho user hiện tại (phân quyền theo role)
2. Loại bỏ cột user không có quyền xem
3. Tối ưu JOIN dựa trên cột thực sự hiển thị

---

## 5. Thêm Entity Mới — Zero Code

Nhờ Dynamic Query, để thêm tính năng listing cho entity mới chỉ cần:

```
1. Tạo file JSON config (src/QueryConfigs/NewEntity.json)     ← 5-10 phút
2. Tạo Query handler kế thừa DynamicGridQueryHandler          ← 5 dòng code
3. Không cần viết SQL, không cần viết LINQ, không cần JOIN thủ công
```

**Handler minimalist:**
```csharp
// Toàn bộ logic listing chỉ cần 5 dòng
public sealed class GetNewEntityListHandler(...)
    : DynamicGridQueryHandler<GetNewEntityList.Query>(...)
{
    protected override string GetConfigName() => "NewEntity";
}
```

So sánh: Cách truyền thống cần viết 50-100 dòng LINQ phức tạp. Dynamic Query giảm xuống còn **5 dòng + 1 file JSON config**.

---

## 6. Giới Hạn & Hướng Phát Triển

### 6.1 Giới hạn hiện tại

| Giới hạn | Giải pháp hiện tại |
|----------|-------------------|
| Aggregate phức tạp (SUM, AVG theo group) | Viết handler riêng cho use case đặc biệt |
| Subquery lồng nhau sâu | Dùng VIEW ở database layer |
| Real-time data streaming | Không phải use case của tính năng này |

### 6.2 Lợi ích đạt được

| Chỉ số | Trước | Sau |
|--------|-------|-----|
| Dòng code cho entity listing mới | ~100 dòng | ~5 dòng |
| Thời gian tạo listing mới | 4-8 giờ | 30-60 phút |
| Điểm thay đổi khi sửa logic paging | 20+ handlers | 1 chỗ (DynamicGridQueryHandler) |
| Cấu hình cột mà không cần redeploy | ❌ | ✅ |
| Hỗ trợ phân quyền cột tự động | ❌ | ✅ |

---

## 7. Liên kết Tham Khảo

- Hướng dẫn chi tiết kỹ thuật: [`backend/docs/project/dynamic-query-and-dynamic-sql-guide.md`](../backend/docs/project/dynamic-query-and-dynamic-sql-guide.md)
- Ví dụ QueryConfig: [`backend/src/QueryConfigs/`](../backend/src/QueryConfigs/)
- Handler cơ sở: [`backend/src/Smartlog.DynamicQuery/`](../backend/src/Smartlog.DynamicQuery/)
