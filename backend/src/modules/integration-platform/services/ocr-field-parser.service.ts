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
  customerName?: string;
  customerConfidence: number;
  deliveryLocation?: string;
  deliveryConfidence: number;
  grossWeight?: number;
  grossWeightUom?: string;
  grossWeightConfidence: number;
  tareWeight?: number;
  tareWeightUom?: string;
  tareWeightConfidence: number;
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
      customerConfidence: 0,
      deliveryConfidence: 0,
      grossWeightConfidence: 0,
      tareWeightConfidence: 0,
      qtyConfidence: 0,
    };

    const lines = fullText.split('\n').map((l) => l.trim());

    // Build a label→value map using line-by-line pairing
    // Vision API outputs labels and values in spatial order:
    //   "Biển số:" (label-only line)
    //   "Tàu:" (label-only line)
    //   "Số phiếu: 222510080233" (label+value on same line)
    //   "72H05214" (orphan value for "Biển số")
    //   "LAN NING 15" (orphan value for "Tàu")
    const labelMap = this.buildLabelValueMap(lines);

    this.logger.log(`Label map: ${JSON.stringify(Object.fromEntries(labelMap))}`);

    // --- Số phiếu ---
    result.blNumber = this.resolveField(labelMap, fullText, [
      { mapKeys: ['số phiếu'] },
      { regex: /S[oố]\s*phi[eế]u[:\s]+(\d{6,})/i },
      { regex: /S[oố]\s*phi[eế]u[:\s]+([A-Z0-9\-]{5,})/i },
      { regex: /V[aậ]n\s*đ[oơ]n[:\s]*([A-Z0-9\-/]{5,})/i },
      { regex: /B\/L\s*No[.:\s]*([A-Z0-9\-]+)/i },
    ]);
    result.blConfidence = this.calcConfidence(result.blNumber, 'bl');

    // --- Biển số xe ---
    result.vehicleNumber = this.resolveField(labelMap, fullText, [
      { mapKeys: ['biển số', 'biển số xe', 'số xe'] },
    ]);
    // Fallback: find plate pattern directly in text
    if (!result.vehicleNumber) {
      const plateMatch = fullText.match(/\b(\d{2}[A-Z]\d?\d{4,5})\b/) ||
        fullText.match(/\b(\d{2}[A-Z]\d?[-]\d{3,5})\b/i);
      if (plateMatch?.[1]) result.vehicleNumber = plateMatch[1];
    }
    if (result.vehicleNumber) {
      result.vehicleNumber = result.vehicleNumber.replace(/\s+/g, '').toUpperCase();
    }
    result.vehicleConfidence = this.calcConfidence(result.vehicleNumber, 'vehicle');

    // --- Hàng hóa ---
    // Note: Vision API may group "Salan:" with "Hàng hoá:" — Salan can steal the product value
    result.productName = this.resolveField(labelMap, fullText, [
      { mapKeys: ['hàng hoá', 'hàng hóa', 'tên hàng', 'mặt hàng', 'sản phẩm', 'salan'] },
      { regex: /H[aà]ng\s*h[oóòỏõọôốồổỗộ][aáàảãạ][:\s]+([^\n]+)/i },
    ]);
    if (result.productName) {
      result.productName = result.productName.split(/\s{2,}|V[aậ]n\s*đ[oơ]n|Lo[aạ]i\s*h[aà]ng/i)[0].trim();
    }
    result.productConfidence = this.calcConfidence(result.productName, 'product');

    // --- Tên tàu ---
    result.vesselName = this.resolveField(labelMap, fullText, [
      { mapKeys: ['tàu', 'tên tàu'] },
      { regex: /(?:Vessel|M\/V|MV)[:\s]*([^\n,]+)/i },
    ]);
    if (result.vesselName) {
      result.vesselName = result.vesselName.split(/\s{2,}|Kho|Salan|Bãi/i)[0].trim();
      if (result.vesselName.length <= 2) result.vesselName = undefined;
    }
    result.vesselConfidence = this.calcConfidence(result.vesselName, 'vessel');

    // --- Khách hàng ---
    result.customerName = this.resolveField(labelMap, fullText, [
      { mapKeys: ['chủ hàng', 'khách hàng'] },
      { regex: /Ch[uủ]\s*h[aà]ng[:\s]+([^\n]+)/i },
      { regex: /(?:Consignee|Shipper|Customer)[:\s]*([^\n]+)/i },
    ]);
    result.customerConfidence = this.calcConfidence(result.customerName, 'customer');

    // --- Nơi giao (Đích/Nguồn) ---
    result.deliveryLocation = this.resolveField(labelMap, fullText, [
      { mapKeys: ['đích', 'nơi giao', 'nguồn'] },
      { regex: /(?:Port\s*of\s*Discharge|Destination)[:\s]*([^\n]+)/i },
    ]);
    // Filter out false positives
    if (result.deliveryLocation && (
      /^C[aâ]n\s*xe/i.test(result.deliveryLocation) ||       // weight label
      /^\d{2}\/\d{2}\/\d{4}/.test(result.deliveryLocation) || // timestamp
      /^\d[\d.,]+\s*\(?(kg|MT|ton)/i.test(result.deliveryLocation) // weight value
    )) {
      result.deliveryLocation = undefined;
    }
    result.deliveryConfidence = this.calcConfidence(result.deliveryLocation, 'delivery');

    // --- Weights: use positional extraction ---
    // Vision API outputs weight values in order: gross, tare, net
    // Pattern: "Cân xe hàng:\nCân xe rỗng:\n36.020 (kg)...\n18.580 (kg)...\nTrọng lượng hàng:\n17.440 (kg)"
    const weights = this.extractAllWeights(lines);
    if (weights.gross) {
      result.grossWeight = weights.gross.value;
      result.grossWeightUom = weights.gross.uom;
      result.grossWeightConfidence = weights.gross.confidence;
    }
    if (weights.tare) {
      result.tareWeight = weights.tare.value;
      result.tareWeightUom = weights.tare.uom;
      result.tareWeightConfidence = weights.tare.confidence;
    }
    if (weights.net) {
      result.qtyExtracted = weights.net.value;
      result.qtyUom = weights.net.uom;
      result.qtyConfidence = weights.net.confidence;
    }

    this.logger.log(
      `Parsed: BL=${result.blNumber || 'N/A'}, Vehicle=${result.vehicleNumber || 'N/A'}, ` +
      `Product=${result.productName || 'N/A'}, Vessel=${result.vesselName || 'N/A'}, ` +
      `Customer=${result.customerName || 'N/A'}, Delivery=${result.deliveryLocation || 'N/A'}, ` +
      `Gross=${result.grossWeight || 'N/A'} ${result.grossWeightUom || ''}, ` +
      `Tare=${result.tareWeight || 'N/A'} ${result.tareWeightUom || ''}, ` +
      `Net=${result.qtyExtracted || 'N/A'} ${result.qtyUom || ''}`,
    );

    return result;
  }

  /**
   * Build a map of label→value from Vision API line output.
   * Handles: "Label: Value" on same line, and "Label:" followed by value on a later line.
   * For empty labels, values are resolved by scanning forward past other empty labels.
   */
  private buildLabelValueMap(lines: string[]): Map<string, string> {
    const map = new Map<string, string>();
    const emptyLabels: { label: string; lineIndex: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // "Label: Value" on same line (but not just "Label:")
      const sameLineMatch = line.match(/^([^:]+):\s+(.+)$/);
      if (sameLineMatch) {
        const label = sameLineMatch[1].trim().toLowerCase();
        const value = sameLineMatch[2].trim();
        // Skip if value is just another label ending with ":"
        if (!value.endsWith(':') && value.length > 0) {
          map.set(label, value);
          continue;
        }
      }

      // "Label:" on its own (empty value)
      const emptyLabelMatch = line.match(/^([^:]+):\s*$/);
      if (emptyLabelMatch) {
        emptyLabels.push({ label: emptyLabelMatch[1].trim().toLowerCase(), lineIndex: i });
        continue;
      }
    }

    // Resolve empty labels: find their values by scanning forward
    // Vision API groups labels first, then values in same order
    // E.g. lines: ["Biển số:", "Tàu:", "Số phiếu: 222510080233", "72H05214", "LAN NING 15"]
    // → "Biển số" = "72H05214", "Tàu" = "LAN NING 15"
    this.resolveEmptyLabels(lines, emptyLabels, map);

    return map;
  }

  private resolveEmptyLabels(
    lines: string[],
    emptyLabels: { label: string; lineIndex: number }[],
    map: Map<string, string>,
  ): void {
    if (emptyLabels.length === 0) return;

    // Classify each line
    const lineTypes: ('empty-label' | 'same-line' | 'orphan' | 'other')[] = lines.map(() => 'other');
    const emptyLabelIndices = new Set(emptyLabels.map((el) => el.lineIndex));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (emptyLabelIndices.has(i)) {
        lineTypes[i] = 'empty-label';
      } else if (/^[^:]+:\s+.+$/.test(line)) {
        lineTypes[i] = 'same-line'; // "Label: Value" — already in map
      } else {
        lineTypes[i] = 'orphan'; // Potential value for an empty label
      }
    }

    // For each empty label, find its paired orphan value.
    // Vision API spatial grouping: consecutive empty labels share orphan values
    // that appear after the block of labels (and after any interleaved same-line pairs).
    // Strategy: group truly consecutive empty labels (gap=1), then collect orphans after.
    const consumed = new Set<number>();

    // Group consecutive empty labels (strict: adjacent lines only)
    const groups: { label: string; lineIndex: number }[][] = [];
    let curGroup: { label: string; lineIndex: number }[] = [emptyLabels[0]];

    for (let i = 1; i < emptyLabels.length; i++) {
      if (emptyLabels[i].lineIndex - emptyLabels[i - 1].lineIndex === 1) {
        curGroup.push(emptyLabels[i]);
      } else {
        groups.push(curGroup);
        curGroup = [emptyLabels[i]];
      }
    }
    groups.push(curGroup);

    // Build set of line indices in each group for fast lookup
    const groupMemberLines = new Set<number>();
    for (const g of groups) {
      for (const el of g) groupMemberLines.add(el.lineIndex);
    }

    for (const group of groups) {
      const groupLineSet = new Set(group.map((el) => el.lineIndex));
      const lastLabelIdx = group[group.length - 1].lineIndex;
      const orphans: { lineIdx: number; value: string }[] = [];

      // Scan forward from after the last label in this group
      for (let i = lastLabelIdx + 1; i < lines.length && orphans.length < group.length; i++) {
        if (consumed.has(i)) continue;
        const line = lines[i].trim();
        if (!line) continue;

        // STOP if we hit an empty-label from a DIFFERENT group
        if (lineTypes[i] === 'empty-label' && !groupLineSet.has(i)) break;
        // Skip same-line "Label: Value" pairs (already resolved)
        if (lineTypes[i] === 'same-line') continue;

        // This is an orphan value — collect it
        orphans.push({ lineIdx: i, value: line });
      }

      // Pair: labels[0]→orphans[0], labels[1]→orphans[1], etc.
      for (let i = 0; i < Math.min(group.length, orphans.length); i++) {
        if (!map.has(group[i].label)) {
          map.set(group[i].label, orphans[i].value);
          consumed.add(orphans[i].lineIdx);
        }
      }
    }
  }

  /**
   * Resolve a field value: first try label map, then fallback to regex on full text.
   */
  private resolveField(
    labelMap: Map<string, string>,
    fullText: string,
    strategies: Array<{ mapKeys?: string[]; regex?: RegExp }>,
  ): string | undefined {
    for (const strategy of strategies) {
      if (strategy.mapKeys) {
        for (const key of strategy.mapKeys) {
          const val = labelMap.get(key);
          if (val && val.length >= 1) return val;
        }
      }
      if (strategy.regex) {
        const match = fullText.match(strategy.regex);
        if (match?.[1]) {
          const val = match[1].trim();
          if (val.length >= 1) return val;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract all 3 weight values (gross, tare, net) using positional approach.
   * Vision API outputs: "Cân xe hàng:\nCân xe rỗng:\n36.020 (kg)...\n18.580 (kg)...\nTrọng lượng hàng:\n17.440 (kg)"
   * Strategy: find weight label positions, then find weight values, pair by position.
   */
  private extractAllWeights(lines: string[]): {
    gross?: { value: number; uom: string; confidence: number };
    tare?: { value: number; uom: string; confidence: number };
    net?: { value: number; uom: string; confidence: number };
  } {
    const result: any = {};

    // Find label line indices
    let grossLabelIdx = -1;
    let tareLabelIdx = -1;
    let netLabelIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (/c[aâ]n\s*xe\s*h[aà]ng/.test(line)) grossLabelIdx = i;
      else if (/c[aâ]n\s*xe\s*r[oỗ]ng/.test(line)) tareLabelIdx = i;
      else if (/tr[oọ]ng\s*l[uư][oợ]ng\s*h[aà]ng/.test(line)) netLabelIdx = i;
    }

    // Find all weight values: lines matching "XX.XXX (kg)" pattern
    const weightValues: { lineIdx: number; value: number; uom: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/([\d.,]+)\s*\(?(kg|KG|[tT][aấ]n|TON|MT)\)?/i);
      if (match?.[1] && match?.[2]) {
        const val = this.parseVietnameseNumber(match[1]);
        if (!isNaN(val) && val > 0) {
          weightValues.push({ lineIdx: i, value: val, uom: this.normalizeUom(match[2]) });
        }
      }
    }

    this.logger.log(`Weight labels: gross=${grossLabelIdx}, tare=${tareLabelIdx}, net=${netLabelIdx}`);
    this.logger.log(`Weight values found: ${JSON.stringify(weightValues)}`);

    // Pair: each label gets the closest weight value AFTER it
    const assignWeight = (labelIdx: number): { value: number; uom: string; confidence: number } | undefined => {
      if (labelIdx < 0) return undefined;
      // Find the first weight value after this label that hasn't been assigned yet
      for (const wv of weightValues) {
        if (wv.lineIdx > labelIdx && !(wv as any)._used) {
          (wv as any)._used = true;
          return { value: wv.value, uom: wv.uom, confidence: 92 };
        }
      }
      return undefined;
    };

    // Assign in order: gross first, then tare, then net
    result.gross = assignWeight(grossLabelIdx);
    result.tare = assignWeight(tareLabelIdx);
    result.net = assignWeight(netLabelIdx);

    return result;
  }

  private parseVietnameseNumber(numStr: string): number {
    const trimmed = numStr.trim();
    if (trimmed.includes('.') && trimmed.includes(',')) {
      return parseFloat(trimmed.replace(/\./g, '').replace(',', '.'));
    }
    if (trimmed.includes('.')) {
      const parts = trimmed.split('.');
      if (parts[parts.length - 1].length === 3) {
        return parseFloat(trimmed.replace(/\./g, ''));
      }
      return parseFloat(trimmed);
    }
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      if (parts[parts.length - 1].length === 3) {
        return parseFloat(trimmed.replace(/,/g, ''));
      }
      return parseFloat(trimmed.replace(',', '.'));
    }
    return parseFloat(trimmed);
  }

  private normalizeUom(uom: string): string {
    const upper = uom.toUpperCase();
    if (['TẤN', 'TON', 'TONS', 'MT'].includes(upper) || uom === 'Tấn' || uom === 'tấn') return 'MT';
    if (upper === 'KG') return 'KG';
    if (upper === 'CBM') return 'CBM';
    if (upper === 'PCS' || upper === 'PKGS') return 'PCS';
    return upper;
  }

  private calcConfidence(value: string | undefined, fieldType: string): number {
    if (!value) return 0;
    switch (fieldType) {
      case 'bl': {
        if (/^\d{8,}$/.test(value)) return 95;
        if (/^[A-Z]{2,4}[-]?\d{4,}/.test(value)) return 96;
        if (/^[A-Z0-9\-]{5,}$/.test(value)) return 92;
        return 78;
      }
      case 'vehicle': {
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
      case 'customer': {
        if (value.length > 5) return 90;
        if (value.length >= 2) return 82;
        return 75;
      }
      case 'delivery': {
        if (value.length > 3) return 88;
        if (value.length >= 1) return 80;
        return 70;
      }
      default:
        return 80;
    }
  }
}
