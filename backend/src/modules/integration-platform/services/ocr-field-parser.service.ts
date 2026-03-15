import { Injectable, Logger } from '@nestjs/common';

export interface ParsedOcrFields {
  blNumber?: string;
  blConfidence: number;
  vehicleNumber?: string;
  vehicleConfidence: number;
  productName?: string;
  productConfidence: number;
  vesselName?: string;
  vesselConfidence: number;
  qtyExtracted?: number;
  qtyUom?: string;
  qtyConfidence: number;
}

@Injectable()
export class OcrFieldParserService {
  private readonly logger = new Logger(OcrFieldParserService.name);

  parseFields(fullText: string): ParsedOcrFields {
    const result: ParsedOcrFields = {
      blConfidence: 0,
      vehicleConfidence: 0,
      productConfidence: 0,
      vesselConfidence: 0,
      qtyConfidence: 0,
    };

    result.blNumber = this.extractBlNumber(fullText);
    result.blConfidence = this.calcConfidence(result.blNumber, 'bl');

    result.vehicleNumber = this.extractVehicleNumber(fullText);
    result.vehicleConfidence = this.calcConfidence(result.vehicleNumber, 'vehicle');

    result.productName = this.extractProductName(fullText);
    result.productConfidence = this.calcConfidence(result.productName, 'product');

    result.vesselName = this.extractVesselName(fullText);
    result.vesselConfidence = this.calcConfidence(result.vesselName, 'vessel');

    const qty = this.extractQuantity(fullText);
    if (qty) {
      result.qtyExtracted = qty.value;
      result.qtyUom = qty.uom;
      result.qtyConfidence = qty.confidence;
    }

    this.logger.log(
      `Parsed fields: BL=${result.blNumber || 'N/A'}, Vehicle=${result.vehicleNumber || 'N/A'}, ` +
      `Product=${result.productName || 'N/A'}, Vessel=${result.vesselName || 'N/A'}, ` +
      `Qty=${result.qtyExtracted || 'N/A'} ${result.qtyUom || ''}`,
    );

    return result;
  }

  private extractBlNumber(text: string): string | undefined {
    // Vietnamese weighbridge ticket: "Số phiếu: 222510080233" or "Số phiếu:\n222510080233"
    const blPatterns = [
      /S[oố]\s*phi[eế]u[:\s]+(\d{6,})/i,
      /S[oố]\s*phi[eế]u\s*:\s*\n\s*(\d{6,})/i,
      /S[oố]\s*phi[eế]u[:\s]+([A-Z0-9\-]{5,})/i,
      /V[aậ]n\s*đ[oơ]n[:\s]*([A-Z0-9\-/]{5,})/i,
      /V[aậ]n\s*đ[oơ]n\s*:\s*\n\s*([A-Z0-9\-/]{5,})/i,
      /B\/L\s*No[.:\s]*([A-Z0-9\-]+)/i,
      /BL\s*No[.:\s]*([A-Z0-9\-]+)/i,
    ];

    for (const pattern of blPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  private extractVehicleNumber(text: string): string | undefined {
    // Vietnamese weighbridge ticket: "Biển số: 72H05214" or "Biển số:\n72H05214"
    // Plate formats: 72H05214, 51A-12345, 60H-123.45, 29B1-12345
    const vehiclePatterns = [
      /(?:Bi[eể]n\s*s[oố](?:\s*xe)?)[:\s]+(\d{2}[A-Z]\d?[\s\-.]?\d{3,5}(?:\.\d{2})?)/i,
      /(?:Bi[eể]n\s*s[oố](?:\s*xe)?)\s*:\s*\n\s*(\d{2}[A-Z]\d?[\s\-.]?\d{3,5}(?:\.\d{2})?)/i,
      /(?:S[oố]\s*xe)[:\s]+(\d{2}[A-Z]\d?[\s\-.]?\d{3,5}(?:\.\d{2})?)/i,
      /(?:S[oố]\s*xe)\s*:\s*\n\s*(\d{2}[A-Z]\d?[\s\-.]?\d{3,5}(?:\.\d{2})?)/i,
      /(?:Vehicle|Plate)[:\s]*(\d{2}[A-Z]\d?[\s\-.]?\d{3,5}(?:\.\d{2})?)/i,
      /\b(\d{2}[A-Z]\d?[-]\d{3,5}(?:\.\d{2})?)\b/i,
      // Fallback: direct plate pattern (no dash, e.g. 72H05214) — for Vision API split-line output
      /\b(\d{2}[A-Z]\d?\d{4,5})\b/,
    ];

    for (const pattern of vehiclePatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim().replace(/\s+/g, '').toUpperCase();
      }
    }
    return undefined;
  }

  private extractProductName(text: string): string | undefined {
    // Vietnamese weighbridge ticket: "Hàng hóa: UREA" or "Hàng hoá:\nUREA"
    // Note: Vision API may return "hoá" (with accent on a) instead of "hóa"
    const productPatterns = [
      /H[aà]ng\s*h[oóòỏõọôốồổỗộ][aáàảãạ][:\s]+([^\n]+)/i,
      /H[aà]ng\s*h[oóòỏõọôốồổỗộ][aáàảãạ]\s*:\s*\n\s*([^\n]+)/i,
      /T[eê]n\s*h[aà]ng[:\s]+([^\n]+)/i,
      /T[eê]n\s*h[aà]ng\s*:\s*\n\s*([^\n]+)/i,
      /M[aặ]t\s*h[aà]ng[:\s]+([^\n]+)/i,
      /S[aả]n\s*ph[aẩ]m[:\s]+([^\n]+)/i,
      /(?:Description\s*of\s*Goods|Commodity|Goods|Product)[:\s]*([^\n]+)/i,
    ];

    for (const pattern of productPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        let name = match[1].trim();
        // Clean: remove trailing labels
        name = name.split(/\s{2,}|V[aậ]n\s*đ[oơ]n|Lo[aạ]i\s*h[aà]ng/i)[0].trim();
        if (name.length >= 2 && name.length < 200) {
          return name;
        }
      }
    }
    return undefined;
  }

  private extractVesselName(text: string): string | undefined {
    // Vietnamese weighbridge ticket: "Tàu: LAN NING 15"
    const vesselPatterns = [
      /T[aà]u[:\s]+([^\n,]+)/i,
      /(?:Vessel|M\/V|MV)[:\s]*([^\n,]+)/i,
      /(?:Ship)[:\s]*([^\n,]+)/i,
    ];

    for (const pattern of vesselPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        // Clean: remove trailing labels like "Kho/bãi:", "Salan:" etc.
        let name = match[1].trim();
        name = name.split(/\s{2,}|Kho|Salan|Bãi/i)[0].trim();
        if (name.length > 2 && name.length < 100) {
          return name;
        }
      }
    }
    return undefined;
  }

  private extractQuantity(text: string): { value: number; uom: string; confidence: number } | undefined {
    // Vietnamese weighbridge ticket: "Trọng lượng hàng: 17.440 (kg)" or "Trọng lượng hàng:\n17.440 (kg)"
    // Note: Vietnamese uses dot as thousands separator: "17.440" = 17440 kg
    const qtyPatterns = [
      // Priority 1: "Trọng lượng hàng" same line
      /Tr[oọ]ng\s*l[uư][oợ]ng\s*h[aà]ng[:\s]*([\d.,]+)\s*\(?([kK][gG]|MT|[tT][aấ]n|TON)\)?/i,
      // Priority 1b: "Trọng lượng hàng" next line
      /Tr[oọ]ng\s*l[uư][oợ]ng\s*h[aà]ng\s*:\s*\n\s*([\d.,]+)\s*\(?([kK][gG]|MT|[tT][aấ]n|TON)\)?/i,
      // Priority 2: Generic weight labels
      /(?:Net\s*Weight|Tr[oọ]ng\s*l[uư][oợ]ng\s*t[iị]nh|Tr[oọ]ng\s*l[uư][oợ]ng)[:\s]*([\d.,]+)\s*\(?([kK][gG]|MT|[tT][aấ]n|TON)\)?/i,
      /(?:Net\s*Weight|Tr[oọ]ng\s*l[uư][oợ]ng)\s*:\s*\n\s*([\d.,]+)\s*\(?([kK][gG]|MT|[tT][aấ]n|TON)\)?/i,
      // Priority 3: General quantity/weight
      /(?:Quantity|S[oố]\s*l[uư][oợ]ng|Weight|Gross\s*Weight)[:\s]*([\d.,]+)\s*\(?([kK][gG]|MT|[tT][aấ]n|TON|TONS?|CBM|PCS|PKGS?)\)?/i,
    ];

    for (const pattern of qtyPatterns) {
      const match = text.match(pattern);
      if (match?.[1] && match?.[2]) {
        // Parse Vietnamese number format: "17.440" (dot as thousands sep) → 17440
        const raw = this.parseVietnameseNumber(match[1]);
        if (!isNaN(raw) && raw > 0) {
          const uom = this.normalizeUom(match[2]);
          return { value: raw, uom, confidence: 92 };
        }
      }
    }
    return undefined;
  }

  private parseVietnameseNumber(numStr: string): number {
    // Vietnamese format: dot = thousands separator, comma = decimal
    // "17.440" → 17440, "17,440" → 17440, "36.020" → 36020, "1.234,56" → 1234.56
    const trimmed = numStr.trim();

    // If has both dot and comma: "1.234,56" → dot is thousands, comma is decimal
    if (trimmed.includes('.') && trimmed.includes(',')) {
      return parseFloat(trimmed.replace(/\./g, '').replace(',', '.'));
    }

    // If only dot: check if it's thousands separator (e.g. "17.440") or decimal (e.g. "17.5")
    if (trimmed.includes('.')) {
      const parts = trimmed.split('.');
      const lastPart = parts[parts.length - 1];
      // If last part has exactly 3 digits → dot is thousands separator
      if (lastPart.length === 3) {
        return parseFloat(trimmed.replace(/\./g, ''));
      }
      // Otherwise treat as decimal point
      return parseFloat(trimmed);
    }

    // If only comma: treat as thousands separator (e.g. "17,440" → 17440)
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3) {
        return parseFloat(trimmed.replace(/,/g, ''));
      }
      return parseFloat(trimmed.replace(',', '.'));
    }

    return parseFloat(trimmed);
  }

  private normalizeUom(uom: string): string {
    const upper = uom.toUpperCase();
    if (['TẤN', 'TON', 'TONS', 'MT'].includes(upper) || uom === 'Tấn' || uom === 'tấn') {
      return 'MT';
    }
    if (upper === 'KG') return 'KG';
    if (upper === 'CBM') return 'CBM';
    if (upper === 'PCS' || upper === 'PKGS') return 'PCS';
    return upper;
  }

  private calcConfidence(value: string | undefined, fieldType: string): number {
    if (!value) return 0;

    switch (fieldType) {
      case 'bl': {
        // Số phiếu numeric (e.g. "222510080233") → high confidence
        if (/^\d{8,}$/.test(value)) return 95;
        if (/^[A-Z]{2,4}[-]?\d{4,}/.test(value)) return 96;
        if (/^[A-Z0-9\-]{5,}$/.test(value)) return 92;
        return 78;
      }
      case 'vehicle': {
        // 72H05214 (no dash) or 51A-12345 (with dash)
        if (/^\d{2}[A-Z]\d?[-]?\d{3,5}$/.test(value)) return 95;
        return 80;
      }
      case 'product': {
        if (value.length > 5) return 88;
        if (value.length >= 2) return 82;
        return 75;
      }
      case 'vessel': {
        if (/^(MV|M\/V)\s/i.test(value)) return 93;
        if (value.length > 3) return 87;
        return 72;
      }
      default:
        return 80;
    }
  }
}
