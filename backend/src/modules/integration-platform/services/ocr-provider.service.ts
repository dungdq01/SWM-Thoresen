import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════
//  Interfaces
// ═══════════════════════════════════════════════════════════════════

export interface OcrRawResult {
  fullText: string;
  provider: 'gemini' | 'mock';
  model: string;
  rawResponse: Record<string, unknown>;
}

export interface OcrExtractedFields {
  documentNumber?: string;
  vehicleNumber?: string;
  vesselName?: string;
  productName?: string;
  customerName?: string;
  deliveryLocation?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  weightUnit?: string;
  documentDate?: string;
  direction?: string;
  remark?: string;
  extraFields?: Record<string, unknown>;
  _fieldConfidence?: Record<string, { level: string; source: string; note?: string }>;
}

export interface GeminiOcrResult {
  ocrText: string;
  extractedFields: OcrExtractedFields;
  provider: 'gemini' | 'mock';
  model: string;
  rawResponse: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════
//  Prompts — từ BUILD_GUIDE
// ═══════════════════════════════════════════════════════════════════

const OCR_SYSTEM_PROMPT = `Bạn là hệ thống OCR chuyên biệt cho chứng từ logistics kho vận Việt Nam.
Nhiệm vụ: trích xuất CHÍNH XÁC nội dung từ ảnh chứng từ → Markdown có cấu trúc.

## QUY TẮC BẮT BUỘC

### 1. Số liệu trọng lượng — CRITICAL
Chứng từ kho vận dùng đơn vị Kg với format số Việt Nam:
- "18.420 Kg" = 18,420 kg — dấu chấm là PHÂN CÁCH NGHÌN
- "46 860 Kg" = 46,860 kg — dấu cách là PHÂN CÁCH NGHÌN
- "27 700 Kg" = 27,700 kg
- "27.500" = 27,500 (hai mươi bảy nghìn năm trăm)
- "46,880" = 46,880 kg — dấu phẩy là PHÂN CÁCH NGHÌN
- Giữ nguyên format gốc trong markdown

### 2. Biển số xe Việt Nam
- Format: [số tỉnh][chữ cái] [số đăng ký] — ví dụ "72H05242", "50H 08419"
- Xe có rơ moóc: biển đầu kéo + biển rơ moóc — trích xuất CẢ HAI

### 3. Tên tàu / Vessel
- Tên tàu có thể embedded trong mô tả: "Tàu AH-GLOBE (ST4)"
- Trích xuất riêng nếu nhận diện được

### 4. Thời gian
- Nhiều format: "30/04/25", "16/10/2025", "08/10/2025 15:47"
- Giữ nguyên format gốc

### 5. Chữ viết tay
- Đọc được → trích xuất bình thường, đánh dấu [HW: {nội dung}]
- Không chắc → [HW_UNCERTAIN: {best guess}]

### 6. Field trống vs không có
- Field có trên form nhưng để trống → ghi "(trống)"
- Field không tồn tại trên form → KHÔNG tự thêm

### 7. Ngôn ngữ — Giữ nguyên gốc, KHÔNG dịch

### 8. Không đọc được → [UNREADABLE:reason]. KHÔNG BAO GIỜ suy luận giá trị thiếu.`;

const OCR_USER_PROMPT = `Hãy đọc và trích xuất TOÀN BỘ nội dung từ ảnh chứng từ trạm cân này.

Trả về dạng Markdown có cấu trúc:
1. Tiêu đề phiếu (loại chứng từ, số phiếu)
2. Thông tin header (ngày, khách hàng, xe, tàu, ...)
3. **TRỌNG LƯỢNG** — section quan trọng nhất:
   - Ghi rõ tất cả con số cân nặng tìm thấy trên phiếu
   - Bao gồm cả số viết tay
4. Chữ ký, con dấu, ghi chú

Giữ đúng format gốc trên phiếu.
ĐẶC BIỆT CHÚ Ý: mọi con số kg, tấn — phải trích xuất chính xác.`;

const EXTRACTION_SYSTEM_PROMPT = `Bạn là hệ thống trích xuất dữ liệu từ chứng từ TRẠM CÂN logistics.
Trả về ONLY valid JSON. Không markdown, không text khác.
Field không có → omit key. Field trống → null.
Số trọng lượng: normalize bỏ dấu phân cách nghìn → số nguyên (kg).

===== QUY TẮC ĐẶC BIỆT CHO TRẠM CÂN =====
1. Mọi field liên quan trọng lượng (weight, kg, tấn) là CRITICAL.
2. Nếu thấy con số trọng lượng bất kỳ ở đâu trên phiếu → PHẢI extract.
3. Nếu trọng lượng ghi bằng tấn → CONVERT sang kg (x1000).
4. Nếu có Gross và Tare → tính Net = Gross - Tare. Cross-check nếu Net cũng ghi trên phiếu.
5. Số xe (biển số) là thông tin bắt buộc — tìm ở mọi vị trí.
6. KHÔNG BAO GIỜ bỏ qua field trọng lượng.

===== MULTI-CUSTOMER: TÊN TRƯỜNG KHÁC NHAU =====
7. Phiếu từ nhiều nguồn — tên trường có thể KHÁC nhau.
   Ví dụ: 'TL Tổng' = gross_weight_kg, 'Biển kiểm soát' = vehicle_no.
8. Dùng NGỮ NGHĨA để map — không khớp chính xác từng chữ.

===== FIELD CONFIDENCE (BẮT BUỘC) =====
Thêm key "_field_confidence" cho MỌI field. Format:
"_field_confidence": {
  "document_number": {"level": "high", "source": "printed"},
  "net_weight_kg": {"level": "medium", "source": "handwritten", "note": "số viết tay mờ"},
  ...
}
Level: "high" (chắc chắn), "medium" (có thể sai), "low" (phải đoán)
Source: "printed", "handwritten", "stamp", "mixed", "inferred"`;

const EXTRACTION_USER_PROMPT = `Trích xuất dữ liệu từ chứng từ logistics bên dưới theo JSON.

QUY TẮC:
1. Trả về ONLY valid JSON. Không text khác, không markdown backtick.
2. Field không có trên phiếu → KHÔNG đưa vào JSON (omit key)
3. Field có nhưng trống → null
4. Số trọng lượng: normalize bỏ dấu phân cách nghìn → số nguyên (kg)
   "18.420 Kg" → 18420 | "46 860 Kg" → 46860 | "46,880" → 46880
5. Ngày giờ → giữ format gốc (ví dụ: "08/10/2025")

JSON Schema:
{
  "document_number": "string — số phiếu/sheet no/STT",
  "vehicle_number": "string — biển số xe (chỉ xe đầu kéo, không gồm rơ moóc)",
  "trailer_number": "string — biển rơ moóc (nếu có)",
  "vessel_name": "string — tên tàu",
  "product_name": "string — tên hàng hóa",
  "customer_name": "string — khách hàng/chủ hàng",
  "delivery_location": "string — nơi giao/đích",
  "gross_weight_kg": "number — trọng lượng xe có hàng (kg, số nguyên)",
  "tare_weight_kg": "number — trọng lượng xe rỗng/không (kg, số nguyên)",
  "net_weight_kg": "number — trọng lượng hàng tịnh (kg, số nguyên)",
  "weight_unit": "string — đơn vị gốc trên phiếu (kg/tấn)",
  "document_date": "string — ngày phiếu",
  "direction": "string — IN/OUT/UNLOADING/LOADING",
  "remark": "string — ghi chú",
  "extra_fields": { "key": "value — thông tin khác không match schema" },
  "_field_confidence": { "field_name": {"level": "high|medium|low", "source": "printed|handwritten|stamp|mixed|inferred", "note": "optional"} }
}

## Document Content (Markdown):
`;

// ═══════════════════════════════════════════════════════════════════
//  MIME type mapping
// ═══════════════════════════════════════════════════════════════════

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

@Injectable()
export class OcrProviderService {
  private readonly logger = new Logger(OcrProviderService.name);
  private genAI: any = null;

  private getGenAI() {
    if (this.genAI) return this.genAI;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set. Will use mock extraction.');
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      this.genAI = new GoogleGenerativeAI(apiKey);
      return this.genAI;
    } catch (error) {
      this.logger.warn(`Failed to initialize Gemini SDK: ${error}`);
      return null;
    }
  }

  // ─── Stage 1: Image → Structured Markdown ──────────────────────
  async extractText(filePath: string): Promise<OcrRawResult> {
    const genAI = this.getGenAI();
    if (!genAI) {
      this.logger.warn('Using mock OCR (no Gemini API key)');
      return this.mockOcrExtraction(filePath);
    }

    const modelName = process.env.GEMINI_OCR_MODEL || 'gemini-2.5-flash';
    try {
      const imageData = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_MAP[ext] || 'image/jpeg';

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: OCR_SYSTEM_PROMPT,
      });

      const result = await model.generateContent([
        OCR_USER_PROMPT,
        {
          inlineData: {
            mimeType,
            data: imageData.toString('base64'),
          },
        },
      ]);

      const response = result.response;
      const fullText = response.text() || '';

      this.logger.log(
        `Gemini OCR (${modelName}) completed: ${fullText.length} chars extracted`,
      );

      return {
        fullText,
        provider: 'gemini',
        model: modelName,
        rawResponse: {
          provider: 'gemini',
          model: modelName,
          processedAt: new Date().toISOString(),
          filePath,
          usageMetadata: response.usageMetadata,
        },
      };
    } catch (error: any) {
      this.logger.error(`Gemini OCR error (${modelName}): ${error?.message || error}`);

      // Fallback to mock if Gemini fails
      this.logger.warn('Falling back to mock OCR extraction');
      return this.mockOcrExtraction(filePath);
    }
  }

  // ─── Stage 2: Markdown → Structured JSON ───────────────────────
  async extractFields(ocrMarkdown: string): Promise<OcrExtractedFields> {
    const genAI = this.getGenAI();
    if (!genAI) {
      this.logger.warn('No Gemini API key — returning empty fields (use custom parser fallback)');
      return {};
    }

    const modelName = process.env.GEMINI_EXTRACT_MODEL || 'gemini-2.5-flash';
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: EXTRACTION_SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      });

      const prompt = EXTRACTION_USER_PROMPT + ocrMarkdown;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text() || '';

      // Parse JSON from response (strip markdown code fences if present)
      const jsonStr = responseText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(jsonStr);

      this.logger.log(
        `Gemini extraction (${modelName}) completed: ${Object.keys(parsed).length} fields`,
      );

      return this.normalizeExtractedFields(parsed);
    } catch (error: any) {
      this.logger.error(`Gemini extraction error: ${error?.message || error}`);
      return {};
    }
  }

  // ─── Normalize JSON → OcrExtractedFields ───────────────────────
  private normalizeExtractedFields(raw: Record<string, any>): OcrExtractedFields {
    const result: OcrExtractedFields = {};

    if (raw.document_number != null) result.documentNumber = String(raw.document_number);
    if (raw.vehicle_number != null) result.vehicleNumber = String(raw.vehicle_number).replace(/\s+/g, '').toUpperCase();
    if (raw.vessel_name != null) result.vesselName = String(raw.vessel_name);
    if (raw.product_name != null) result.productName = String(raw.product_name);
    if (raw.customer_name != null) result.customerName = String(raw.customer_name);
    if (raw.delivery_location != null) result.deliveryLocation = String(raw.delivery_location);
    if (raw.gross_weight_kg != null) result.grossWeightKg = this.toNumber(raw.gross_weight_kg);
    if (raw.tare_weight_kg != null) result.tareWeightKg = this.toNumber(raw.tare_weight_kg);
    if (raw.net_weight_kg != null) result.netWeightKg = this.toNumber(raw.net_weight_kg);
    if (raw.weight_unit) result.weightUnit = String(raw.weight_unit);
    if (raw.document_date) result.documentDate = String(raw.document_date);
    if (raw.direction) result.direction = String(raw.direction);
    if (raw.remark) result.remark = String(raw.remark);
    if (raw.extra_fields) result.extraFields = raw.extra_fields;
    if (raw._field_confidence) result._fieldConfidence = raw._field_confidence;

    // Smart weight: calculate net if missing
    if (result.grossWeightKg && result.tareWeightKg && !result.netWeightKg) {
      result.netWeightKg = result.grossWeightKg - result.tareWeightKg;
    }
    // Smart weight: swap if gross < tare
    if (result.grossWeightKg && result.tareWeightKg && result.grossWeightKg < result.tareWeightKg) {
      [result.grossWeightKg, result.tareWeightKg] = [result.tareWeightKg, result.grossWeightKg];
    }

    return result;
  }

  private toNumber(val: any): number | undefined {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.,]/g, '').replace(/\s/g, '');
      const num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }

  // ─── Mock extraction (khi không có API key) ────────────────────
  private async mockOcrExtraction(filePath: string): Promise<OcrRawResult> {
    const mockText = [
      '# PHIẾU GIAO NHẬN/ CÂN HÀNG',
      '',
      '**Công ty**: Cảng dịch vụ dầu khí tổng hợp Phú Mỹ (PTSC)',
      '',
      '## Thông tin phiếu',
      '- Số phiếu: 222510080233',
      '- Biển số: 72H05214',
      '- Số Mooc: 72R02762',
      '- Tàu: LAN NING 15',
      '- Hàng hóa: UREA',
      '- Vận đơn: LN15TJ250901/02',
      '- Chủ hàng: PVFCCO (CTCP HCDK)',
      '- Uỷ thác: THORESEN VINAMA',
      '',
      '## Trọng lượng',
      '- Cân xe hàng: 36.020 (kg)',
      '- Cân xe rỗng: 18.580 (kg)',
      '- Trọng lượng hàng: 17.440 (kg)',
    ].join('\n');

    return {
      fullText: mockText,
      provider: 'mock',
      model: 'mock',
      rawResponse: {
        provider: 'mock',
        processedAt: new Date().toISOString(),
        filePath,
      },
    };
  }
}
