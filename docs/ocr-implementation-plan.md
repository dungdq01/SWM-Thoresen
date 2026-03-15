# Kế hoạch Triển khai OCR Full End-to-End

> **Stack**: Google Cloud Vision API · NestJS (backend) · React (frontend)
> **Phạm vi**: File upload thực + OCR extraction + UI cho operator review/confirm

---

## Tổng quan

Module OCR trong `integration-platform` đã có sẵn đầy đủ cấu trúc (controller, services, repositories, DB schema, status workflow), nhưng cần hoàn thiện 3 phần:

| Phần | Trạng thái hiện tại | Cần làm |
|------|---------------------|---------|
| File upload | Nhận `imagePath` string | Hỗ trợ multipart/form-data thực |
| OCR extraction | Mock cứng | Tích hợp Google Cloud Vision API |
| Frontend UI | Chưa có | Xây dựng trang OCR đầy đủ |

---

## Phase 1 – Backend: File Upload thực (Multipart/form-data)

### 1.1 Cài dependency

```bash
# Trong thư mục backend/
npm install multer @types/multer --save
npm install @google-cloud/vision --save
```

> `@nestjs/platform-express` (đã có sẵn) đã bao gồm multer.

---

### 1.2 Tạo File Upload Interceptor

**File mới**: `backend/src/modules/integration-platform/interceptors/ocr-file-upload.interceptor.ts`

```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const OcrFileUploadInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: './uploads/ocr',
    filename: (req, file, cb) => {
      const ext = extname(file.originalname);
      cb(null, `OCR-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

---

### 1.3 Sửa `ocr.controller.ts`

**File**: `backend/src/modules/integration-platform/controllers/ocr.controller.ts`

Thay endpoint `POST /uploads`:

```typescript
// TRƯỚC (nhận JSON body)
@Post('uploads')
async uploadForOcr(@Body() dto: UploadOcrDto, @CurrentUser() user: RequestUser)

// SAU (nhận multipart file)
@Post('uploads')
@UseInterceptors(OcrFileUploadInterceptor)
async uploadForOcr(
  @UploadedFile() file: Express.Multer.File,
  @Body('warehouseId') warehouseId: string,
  @CurrentUser() user: RequestUser,
)
```

---

### 1.4 Sửa `ocr-upload.service.ts`

**File**: `backend/src/modules/integration-platform/services/ocr-upload.service.ts`

Sửa interface `OcrUploadParams`:

```typescript
export interface OcrUploadParams {
  filePath: string;          // đường dẫn file đã lưu trên disk
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  providerName: string;
  warehouseId?: string;
  correlationId: string;
  createdBy: string;
}
```

---

## Phase 2 – Backend: Tích hợp Google Cloud Vision API

### 2.1 Cấu hình credentials

**File mới**: `backend/src/config/ocr.config.ts`

```typescript
export const ocrConfig = () => ({
  googleVision: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    // Hoặc dùng credentials JSON inline:
    credentials: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON
      ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON)
      : undefined,
  },
});
```

**Thêm vào `backend/.env.example`**:

```
# Google Cloud Vision API
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_KEY_FILE=./credentials/google-vision-key.json
# Hoặc dùng JSON inline (cho Docker/CI)
# GOOGLE_CLOUD_CREDENTIALS_JSON={"type":"service_account",...}
```

**Thêm vào `.gitignore`**:

```
backend/credentials/
```

---

### 2.2 Tạo `OcrProviderService` (abstraction layer)

**File mới**: `backend/src/modules/integration-platform/services/ocr-provider.service.ts`

```typescript
// Interface cho phép swap provider sau này (AWS Textract, Azure, v.v.)
export interface OcrRawResult {
  fullText: string;
  pages: OcrPage[];
  rawResponse: Record<string, unknown>;
}

@Injectable()
export class OcrProviderService {
  private readonly client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    });
  }

  async extractText(filePath: string): Promise<OcrRawResult> {
    const [result] = await this.client.documentTextDetection(filePath);
    // Map Google Vision response → OcrRawResult
    return { fullText, pages, rawResponse: result };
  }
}
```

---

### 2.3 Tạo `OcrFieldParserService`

**File mới**: `backend/src/modules/integration-platform/services/ocr-field-parser.service.ts`

Parse raw text từ Google Vision thành các field có cấu trúc, dùng regex phù hợp với tài liệu vận chuyển Việt Nam:

| Field | Regex pattern ví dụ |
|-------|---------------------|
| BL Number | `B\/L\s*No[:\s]*([A-Z0-9\-]+)` |
| Số xe | `\b(\d{2}[A-Z]\d?[-\s]\d{4,5})\b` |
| Tên hàng | Context xung quanh keyword "Hàng hóa", "Description of Goods" |
| Tên tàu | Context xung quanh "Vessel", "Tên tàu", "M/V" |
| Số lượng | `\b(\d[\d,.]+)\s*(KG|MT|Tấn|TON|tấn)\b` |

Tính **confidence score** dựa trên:
- Pattern match rõ ràng → 95%+
- Match nhưng có ký tự lạ → 75–85%
- Không match → 0%

---

### 2.4 Sửa `ocr-extract.service.ts`

**File**: `backend/src/modules/integration-platform/services/ocr-extract.service.ts`

Thay `mockOcrExtraction()` bằng:

```typescript
private async realOcrExtraction(filePath: string): Promise<OcrExtractedData> {
  // 1. Gọi Google Vision
  const rawResult = await this.ocrProviderService.extractText(filePath);

  // 2. Parse các field
  const fields = await this.ocrFieldParserService.parseFields(rawResult.fullText);

  // 3. Trả về OcrExtractedData với confidence scores
  return {
    blNumber: fields.blNumber,
    blConfidence: fields.blConfidence,
    vehicleNumber: fields.vehicleNumber,
    vehicleConfidence: fields.vehicleConfidence,
    // ...
    rawResponse: rawResult.rawResponse,
  };
}
```

Giữ nguyên toàn bộ logic `evaluateConfidence()` và status transition.

---

### 2.5 Sửa `integration-platform.module.ts`

Đăng ký các providers mới:

```typescript
providers: [
  // Hiện có
  OcrUploadService,
  OcrExtractService,
  OcrConfirmationService,
  OcrResultRepository,
  OcrConfirmedSnapshotRepository,
  // Thêm mới
  OcrProviderService,
  OcrFieldParserService,
]
```

---

## Phase 3 – Frontend: API Layer

### 3.1 Sửa `integration.api.js`

**File**: `frontend/src/domains/integration/api/integration.api.js`

Thêm các OCR API functions theo pattern `withDataSource()` hiện có:

```javascript
// Upload ảnh (multipart/form-data)
uploadOcrImage: withDataSource(
  (formData) => integrationMockApi.uploadOcrImage(formData),
  (formData) => httpClient.post('/integration/ocr/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
),

// Danh sách kết quả OCR
getOcrResults: withDataSource(
  (params) => integrationMockApi.getOcrResults(params),
  (params) => httpClient.get('/integration/ocr/results', { params })
),

// Chi tiết 1 kết quả
getOcrResultById: withDataSource(
  (id) => integrationMockApi.getOcrResultById(id),
  (id) => httpClient.get(`/integration/ocr/results/${id}`)
),

// Xác nhận kết quả
confirmOcrResult: withDataSource(
  (id, data) => integrationMockApi.confirmOcrResult(id, data),
  (id, data) => httpClient.post(`/integration/ocr/results/${id}/confirm`, data)
),

// Từ chối
rejectOcrResult: withDataSource(
  (id, data) => integrationMockApi.rejectOcrResult(id, data),
  (id, data) => httpClient.post(`/integration/ocr/results/${id}/reject`, data)
),
```

---

### 3.2 Thêm OCR mock data

**File**: `frontend/src/mocks/integration.mock.js`

Thêm mock responses để phát triển UI offline (không cần backend chạy):

```javascript
ocrResults: [
  {
    id: 'ocr-001',
    ocrRequestId: 'OCR-1234567890-abc12345',
    status: 'EXTRACTED',
    blNumber: 'BL-20240315-001',
    blConfidence: 95.5,
    vehicleNumber: '51A-12345',
    vehicleConfidence: 92.3,
    productName: 'Thép cuộn Grade A',
    productConfidence: 88.0,
    vesselName: 'MV Ocean Star',
    vesselConfidence: 90.0,
    qtyExtracted: 25000,
    qtyUom: 'KG',
    qtyConfidence: 85.0,
    overallConfidence: 90.2,
    createdAt: '2024-03-15T08:30:00Z',
  },
  // ... thêm cases khác: REVIEW_REQUIRED, CONFIRMED, REJECTED
]
```

---

## Phase 4 – Frontend: Trang OCR UI

### 4.1 Trang danh sách – `OcrPage.jsx`

**File mới**: `frontend/src/pages/integration/OcrPage.jsx`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  OCR Scanner                          [+ Upload Ảnh] │
├─────────────────────────────────────────────────────┤
│  Filter: [Trạng thái ▼] [Kho ▼] [Từ ngày] [Đến]   │
├────────┬──────────┬────────┬──────────┬─────────────┤
│ Mã OCR │ Trạng thái│ BL No  │ Số xe    │ Confidence  │
├────────┼──────────┼────────┼──────────┼─────────────┤
│ OCR-.. │ EXTRACTED│ BL-001 │ 51A-1234 │ ████ 90.2%  │
│ OCR-.. │ REVIEW ⚠│ BL-002 │ 51B-5678 │ ███░ 72.1%  │
│ OCR-.. │ CONFIRMED│ BL-003 │ 51C-9012 │ ████ 95.0%  │
└────────┴──────────┴────────┴──────────┴─────────────┘
│ ← 1 2 3 ... →                        20 / trang ▼  │
```

**Status badges**:
- `UPLOADED` → xám
- `EXTRACTING` → xanh dương, animation
- `EXTRACTED` → xanh lá
- `REVIEW_REQUIRED` → vàng ⚠
- `CONFIRMED` → xanh đậm ✓
- `LINKED` → tím
- `REJECTED` → đỏ ✗

---

### 4.2 Modal Upload – `OcrUploadModal.jsx`

**File mới**: `frontend/src/pages/integration/components/OcrUploadModal.jsx`

**Flow**:

```
[1] Chọn file          [2] Uploading...      [3] Đang trích xuất...
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│                │    │  ████████░░ 70%│    │  ⟳ Đang phân  │
│  Kéo thả ảnh  │ →  │                │ →  │  tích ảnh...   │
│  hoặc Browse  │    │  Uploading...  │    │  (polling 2s)  │
│               │    │                │    │                │
│ .jpg .png .pdf│    │                │    │                │
└────────────────┘    └────────────────┘    └────────────────┘
```

- Sau khi extraction xong → tự đóng modal, refresh danh sách, highlight row mới

---

### 4.3 Panel Review – `OcrReviewPanel.jsx`

**File mới**: `frontend/src/pages/integration/components/OcrReviewPanel.jsx`

**Layout** (hiển thị khi click vào row):

```
┌──────────────────────┬──────────────────────────────────┐
│                      │  Kết quả OCR                     │
│   [Ảnh gốc]          │  ┌─────────────────────────────┐ │
│                      │  │ BL Number  [BL-20240315-001] │ │
│   preview ảnh        │  │            ████████ 95.5%    │ │
│                      │  ├─────────────────────────────┤ │
│                      │  │ Số xe      [51A-12345      ] │ │
│                      │  │            ███████░ 92.3%    │ │
│                      │  ├─────────────────────────────┤ │
│                      │  │ ⚠ Tên hàng [Thép cuộn     ] │ │
│                      │  │            ██████░░ 78.0%    │ │
│                      │  └─────────────────────────────┘ │
│                      │                                  │
│                      │  [Từ chối]        [Xác nhận ✓]  │
└──────────────────────┴──────────────────────────────────┘
```

- Các field có thể **edit inline** trước khi xác nhận
- Badge ⚠ màu vàng trên field nào có confidence < ngưỡng
- Banner "REVIEW REQUIRED" nổi bật nếu status là `REVIEW_REQUIRED`

---

### 4.4 Đăng ký Route

**File**: `frontend/src/app/routes.jsx`

```jsx
{
  path: 'integration',
  element: <IntegrationLayout />,
  children: [
    { path: 'monitoring', element: <MonitoringPage /> },
    { path: 'alerts', element: <AlertsPage /> },
    { path: 'weighbridge', element: <WeighbridgePage /> },
    { path: 'channels', element: <ChannelsPage /> },
    { path: 'ocr', element: <OcrPage /> },      // ← Thêm mới
  ]
}
```

---

### 4.5 Thêm menu item vào Sidebar

Tìm file navigation/sidebar và thêm:

```jsx
{ label: 'OCR Scanner', path: '/app/integration/ocr', icon: <ScanIcon /> }
```

---

## Tóm tắt Files cần sửa/tạo

### Backend

| File | Hành động |
|------|-----------|
| `backend/src/modules/integration-platform/interceptors/ocr-file-upload.interceptor.ts` | **Tạo mới** |
| `backend/src/modules/integration-platform/services/ocr-provider.service.ts` | **Tạo mới** |
| `backend/src/modules/integration-platform/services/ocr-field-parser.service.ts` | **Tạo mới** |
| `backend/src/config/ocr.config.ts` | **Tạo mới** |
| `backend/src/modules/integration-platform/controllers/ocr.controller.ts` | Sửa |
| `backend/src/modules/integration-platform/services/ocr-upload.service.ts` | Sửa |
| `backend/src/modules/integration-platform/services/ocr-extract.service.ts` | Sửa |
| `backend/src/modules/integration-platform/integration-platform.module.ts` | Sửa |
| `backend/.env.example` | Sửa |

### Frontend

| File | Hành động |
|------|-----------|
| `frontend/src/pages/integration/OcrPage.jsx` | **Tạo mới** |
| `frontend/src/pages/integration/components/OcrUploadModal.jsx` | **Tạo mới** |
| `frontend/src/pages/integration/components/OcrReviewPanel.jsx` | **Tạo mới** |
| `frontend/src/domains/integration/api/integration.api.js` | Sửa |
| `frontend/src/mocks/integration.mock.js` | Sửa |
| `frontend/src/pages/integration/index.js` | Sửa |
| `frontend/src/app/routes.jsx` | Sửa |
| Sidebar/navigation component | Sửa |

---

## Kiểm tra End-to-End

### Backend
```bash
# Test upload file thực
curl -X POST http://localhost:3000/api/v1/integration/ocr/uploads \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/test-bl.jpg" \
  -F "warehouseId=<uuid>"

# Poll kết quả
curl http://localhost:3000/api/v1/integration/ocr/results/<id>
# Expect: status thay đổi UPLOADED → EXTRACTING → EXTRACTED/REVIEW_REQUIRED
```

### Frontend
1. Vào `/app/integration/ocr`
2. Click "Upload Ảnh" → kéo thả file BL/vận đơn
3. Chờ extraction xong (~3–5s)
4. Review kết quả, chỉnh sửa nếu cần
5. Bấm "Xác nhận" → status chuyển sang `CONFIRMED`

---

## Lưu ý quan trọng

| Vấn đề | Xử lý |
|--------|-------|
| **Google Vision credentials** | Dùng service account key JSON, **không commit vào git**, thêm `credentials/` vào `.gitignore` |
| **File storage** | Phase này lưu local disk `uploads/ocr/`. Production cần GCS/S3 (scope sau) |
| **Async extraction** | Fire-and-forget pattern giữ nguyên. Frontend poll mỗi 2s để cập nhật status |
| **OCR thất bại** | Nếu Google Vision lỗi → status = `REVIEW_REQUIRED`, operator nhập tay |
| **Regex tuning** | Patterns BL/xe cần test với ảnh thực của khách hàng, có thể cần điều chỉnh |
