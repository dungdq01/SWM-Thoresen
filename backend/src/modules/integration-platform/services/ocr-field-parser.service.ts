import { Injectable, Logger } from '@nestjs/common';

export interface ParsedOcrFields {
  ticketNumber?: string;
  ticketConfidence: number;
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

type OcrFieldCode =
  | 'ticket_number'
  | 'bl'
  | 'vehicle'
  | 'product'
  | 'vessel'
  | 'customer'
  | 'delivery'
  | 'gross_weight'
  | 'tare_weight'
  | 'net_weight';

interface SynonymEntry {
  label: string;
  normalized: string;
  field: OcrFieldCode;
  confidence: number;
}

interface FieldMatch {
  field: OcrFieldCode;
  value: string;
  confidence: number;
  source: 'synonym' | 'fuzzy' | 'regex';
}

// ─── Synonym Dictionary ────────────────────────────────────────────
// Built from 4 real weighbridge ticket samples:
//   PTSC Phú Mỹ (2 variants), Cảng Tổng Hợp Thị Vải, SP-PSA International Port
const SYNONYM_SEED: { label: string; field: OcrFieldCode; confidence: number }[] = [
  // ── Số phiếu cân (ticket_number) ──
  { label: 'số phiếu', field: 'ticket_number', confidence: 95 },
  { label: 'phiếu số', field: 'ticket_number', confidence: 95 },
  { label: 'sheet no', field: 'ticket_number', confidence: 90 },
  { label: 'stt', field: 'ticket_number', confidence: 80 },
  { label: 'lgh số', field: 'ticket_number', confidence: 85 },
  { label: 'mã phiếu', field: 'ticket_number', confidence: 90 },
  { label: 'no', field: 'ticket_number', confidence: 70 },
  { label: 'ticket no', field: 'ticket_number', confidence: 90 },

  // ── Số vận đơn / Bill of Lading (bl) ──
  { label: 'số vận đơn', field: 'bl', confidence: 95 },
  { label: 'vận đơn', field: 'bl', confidence: 95 },
  { label: 'bill of lading', field: 'bl', confidence: 95 },
  { label: 'b/l', field: 'bl', confidence: 90 },
  { label: 'b/l no', field: 'bl', confidence: 95 },
  { label: 'bl no', field: 'bl', confidence: 90 },
  { label: 'bl number', field: 'bl', confidence: 90 },
  { label: 'lading no', field: 'bl', confidence: 85 },

  // ── Biển số xe (vehicle) ──
  { label: 'biển số', field: 'vehicle', confidence: 95 },
  { label: 'biển số xe', field: 'vehicle', confidence: 95 },
  { label: 'số xe', field: 'vehicle', confidence: 95 },
  { label: 'số xe rơ moóc', field: 'vehicle', confidence: 90 },
  { label: 'truck no', field: 'vehicle', confidence: 90 },
  { label: 'bsx', field: 'vehicle', confidence: 90 },
  { label: 'bks', field: 'vehicle', confidence: 90 },
  { label: 'plate no', field: 'vehicle', confidence: 90 },
  { label: 'vehicle no', field: 'vehicle', confidence: 90 },
  { label: 'xe', field: 'vehicle', confidence: 75 },

  // ── Tên tàu (vessel) ──
  { label: 'tàu', field: 'vessel', confidence: 95 },
  { label: 'tên tàu', field: 'vessel', confidence: 95 },
  { label: 'tàu giao', field: 'vessel', confidence: 95 },
  { label: 'tàu/ chuyến', field: 'vessel', confidence: 90 },
  { label: 'tàu/chuyến', field: 'vessel', confidence: 90 },
  { label: 'vessel', field: 'vessel', confidence: 90 },
  { label: 'vessel name', field: 'vessel', confidence: 90 },
  { label: 'mv', field: 'vessel', confidence: 85 },
  { label: 'm/v', field: 'vessel', confidence: 85 },
  { label: 'ship', field: 'vessel', confidence: 85 },

  // ── Hàng hóa (product) ──
  { label: 'hàng hoá', field: 'product', confidence: 95 },
  { label: 'hàng hóa', field: 'product', confidence: 95 },
  { label: 'nhóm hàng', field: 'product', confidence: 90 },
  { label: 'tên hàng', field: 'product', confidence: 95 },
  { label: 'mặt hàng', field: 'product', confidence: 95 },
  { label: 'cargo', field: 'product', confidence: 90 },
  { label: 'commodity', field: 'product', confidence: 90 },
  { label: 'goods', field: 'product', confidence: 85 },
  { label: 'salan', field: 'product', confidence: 80 },
  { label: 'sản phẩm', field: 'product', confidence: 90 },

  // ── Khách hàng (customer) ──
  { label: 'khách hàng', field: 'customer', confidence: 95 },
  { label: 'chủ hàng', field: 'customer', confidence: 95 },
  { label: 'customer', field: 'customer', confidence: 90 },
  { label: 'consignee', field: 'customer', confidence: 90 },
  { label: 'shipper', field: 'customer', confidence: 85 },
  { label: 'nơi nhận', field: 'customer', confidence: 80 },
  { label: 'uỷ thác', field: 'customer', confidence: 80 },
  { label: 'ủy thác', field: 'customer', confidence: 80 },

  // ── Nơi giao (delivery) ──
  { label: 'nơi giao', field: 'delivery', confidence: 95 },
  { label: 'đích', field: 'delivery', confidence: 90 },
  { label: 'nguồn', field: 'delivery', confidence: 85 },
  { label: 'delivery place', field: 'delivery', confidence: 90 },
  { label: 'destination', field: 'delivery', confidence: 90 },
  { label: 'port of discharge', field: 'delivery', confidence: 90 },

  // ── Trọng lượng xe hàng (gross_weight) ──
  { label: 'cân xe hàng', field: 'gross_weight', confidence: 95 },
  { label: 'trọng lượng xe có hàng', field: 'gross_weight', confidence: 95 },
  { label: 'trọng lượng xe & hàng', field: 'gross_weight', confidence: 95 },
  { label: 't.lượng khi ra', field: 'gross_weight', confidence: 85 },
  { label: 'weigh in', field: 'gross_weight', confidence: 85 },
  { label: 'gross weight', field: 'gross_weight', confidence: 90 },
  { label: 'tl xe hàng', field: 'gross_weight', confidence: 90 },
  { label: 'trọng lượng xe và hàng', field: 'gross_weight', confidence: 95 },

  // ── Trọng lượng xe rỗng (tare_weight) ──
  { label: 'cân xe rỗng', field: 'tare_weight', confidence: 95 },
  { label: 'cân xe không', field: 'tare_weight', confidence: 95 },
  { label: 'trọng lượng xe không', field: 'tare_weight', confidence: 95 },
  { label: 'trọng lượng xe', field: 'tare_weight', confidence: 90 },
  { label: 't.lượng khi vào', field: 'tare_weight', confidence: 85 },
  { label: 'weigh out', field: 'tare_weight', confidence: 85 },
  { label: 'tare weight', field: 'tare_weight', confidence: 90 },
  { label: 'tl xe rỗng', field: 'tare_weight', confidence: 90 },

  // ── Trọng lượng hàng (net_weight) ──
  { label: 'trọng lượng hàng', field: 'net_weight', confidence: 95 },
  { label: 't.lượng hàng tịnh', field: 'net_weight', confidence: 95 },
  { label: 't.lượng hàng cả bì', field: 'net_weight', confidence: 85 },
  { label: 'cargo weight', field: 'net_weight', confidence: 90 },
  { label: 'net weight', field: 'net_weight', confidence: 90 },
  { label: 'tl hàng', field: 'net_weight', confidence: 90 },
];

@Injectable()
export class OcrFieldParserService {
  private readonly logger = new Logger(OcrFieldParserService.name);
  private readonly synonyms: SynonymEntry[];

  constructor() {
    this.synonyms = SYNONYM_SEED.map((s) => ({
      ...s,
      normalized: OcrFieldParserService.removeDiacritics(s.label),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC: Main entry point
  // ═══════════════════════════════════════════════════════════════════

  parseFields(fullText: string): ParsedOcrFields {
    const result: ParsedOcrFields = {
      ticketConfidence: 0,
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

    // Step 1: Build raw label→value map from Vision API output
    const rawLabelMap = this.buildLabelValueMap(lines);
    this.logger.log(`Raw label map: ${JSON.stringify(Object.fromEntries(rawLabelMap))}`);

    // Step 2: 3-layer pipeline — map raw labels → field codes
    const fieldMatches = this.resolveAllFields(rawLabelMap, fullText);
    this.logger.log(`Field matches: ${JSON.stringify(fieldMatches.map((m) => `${m.field}=${m.value}(${m.confidence},${m.source})`))}`);

    // Step 3: Assign text fields from best matches
    const pick = (field: OcrFieldCode): FieldMatch | undefined =>
      fieldMatches.filter((m) => m.field === field).sort((a, b) => b.confidence - a.confidence)[0];

    const ticketMatch = pick('ticket_number');
    if (ticketMatch) {
      result.ticketNumber = ticketMatch.value;
      result.ticketConfidence = ticketMatch.confidence;
    }

    const blMatch = pick('bl');
    if (blMatch) {
      result.blNumber = blMatch.value;
      result.blConfidence = blMatch.confidence;
    }

    const vehicleMatch = pick('vehicle');
    if (vehicleMatch) {
      // Extract first valid Vietnamese plate from value (handles "72H05242 72R02793")
      const platePattern = vehicleMatch.value.match(/\b(\d{2}[A-Z]\d?[-\s]?\d{3,5})\b/i);
      result.vehicleNumber = platePattern
        ? platePattern[1].replace(/\s+/g, '').toUpperCase()
        : vehicleMatch.value.replace(/\s+/g, '').toUpperCase();
      result.vehicleConfidence = vehicleMatch.confidence;
    }

    const productMatch = pick('product');
    if (productMatch) {
      result.productName = productMatch.value.split(/\s{2,}|V[aậ]n\s*đ[oơ]n|Lo[aạ]i\s*h[aà]ng/i)[0].trim();
      result.productConfidence = productMatch.confidence;
    }

    const vesselMatch = pick('vessel');
    if (vesselMatch) {
      let v = vesselMatch.value.split(/\s{2,}|Kho|Salan|Bãi/i)[0].trim();
      if (v.length > 2) {
        result.vesselName = v;
        result.vesselConfidence = vesselMatch.confidence;
      }
    }

    const customerMatch = pick('customer');
    if (customerMatch) {
      result.customerName = customerMatch.value;
      result.customerConfidence = customerMatch.confidence;
    }

    const deliveryMatch = pick('delivery');
    if (deliveryMatch) {
      const dv = deliveryMatch.value;
      const isFalsePositive =
        /^C[aâ]n\s*xe/i.test(dv) ||
        /^\d{2}\/\d{2}\/\d{4}/.test(dv) ||
        /^\d[\d.,\s]+\s*\(?(kg|MT|ton)/i.test(dv);
      if (!isFalsePositive && dv.length > 0) {
        result.deliveryLocation = dv;
        result.deliveryConfidence = deliveryMatch.confidence;
      }
    }

    // Step 4: Smart weight assignment using synonym-matched weight labels + positional fallback
    this.assignWeights(result, fieldMatches, rawLabelMap, lines);

    this.logger.log(
      `Parsed: Ticket=${result.ticketNumber || 'N/A'}, BL=${result.blNumber || 'N/A'}, Vehicle=${result.vehicleNumber || 'N/A'}, ` +
      `Product=${result.productName || 'N/A'}, Vessel=${result.vesselName || 'N/A'}, ` +
      `Customer=${result.customerName || 'N/A'}, Delivery=${result.deliveryLocation || 'N/A'}, ` +
      `Gross=${result.grossWeight ?? 'N/A'} ${result.grossWeightUom || ''}, ` +
      `Tare=${result.tareWeight ?? 'N/A'} ${result.tareWeightUom || ''}, ` +
      `Net=${result.qtyExtracted ?? 'N/A'} ${result.qtyUom || ''}`,
    );

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  3-LAYER PIPELINE
  // ═══════════════════════════════════════════════════════════════════

  private resolveAllFields(rawLabelMap: Map<string, string>, fullText: string): FieldMatch[] {
    const matches: FieldMatch[] = [];

    // Layer 1 + 2: Iterate raw labels, match against synonym dictionary
    for (const [rawLabel, value] of rawLabelMap) {
      if (!value || value.length === 0) continue;

      // Layer 1: Exact / contains match
      const exactMatch = this.matchSynonymExact(rawLabel);
      if (exactMatch) {
        matches.push({ field: exactMatch.field, value, confidence: exactMatch.confidence, source: 'synonym' });
        continue;
      }

      // Layer 2: Fuzzy match (Levenshtein on diacritics-stripped text)
      const fuzzyMatch = this.matchSynonymFuzzy(rawLabel);
      if (fuzzyMatch) {
        matches.push({ field: fuzzyMatch.field, value, confidence: fuzzyMatch.confidence, source: 'fuzzy' });
        continue;
      }
    }

    // Layer 3: Regex fallback for fields not yet found
    const foundFields = new Set(matches.map((m) => m.field));
    this.regexFallback(fullText, foundFields, matches);

    return matches;
  }

  // ─── Layer 1: Exact / Contains synonym match ─────────────────────
  private matchSynonymExact(rawLabel: string): { field: OcrFieldCode; confidence: number } | null {
    const lower = rawLabel.toLowerCase().trim();

    // 1a. Direct exact match
    for (const syn of this.synonyms) {
      if (lower === syn.label) {
        return { field: syn.field, confidence: syn.confidence };
      }
    }

    // 1b. Contains match — for bilingual labels like "Khách hàng / Customer"
    //     Check if rawLabel CONTAINS a synonym (prefer longest match)
    let bestMatch: SynonymEntry | null = null;
    for (const syn of this.synonyms) {
      if (syn.label.length < 2) continue; // skip very short synonyms for contains
      if (lower.includes(syn.label)) {
        if (!bestMatch || syn.label.length > bestMatch.label.length) {
          bestMatch = syn;
        }
      }
    }
    if (bestMatch) {
      return { field: bestMatch.field, confidence: bestMatch.confidence };
    }

    return null;
  }

  // ─── Layer 2: Fuzzy match (Levenshtein) ──────────────────────────
  private matchSynonymFuzzy(rawLabel: string): { field: OcrFieldCode; confidence: number } | null {
    const normalized = OcrFieldParserService.removeDiacritics(rawLabel.toLowerCase().trim());
    if (normalized.length < 2) return null;

    const maxDist = normalized.length <= 10 ? 2 : 3;
    let bestSyn: SynonymEntry | null = null;
    let bestDist = maxDist + 1;

    for (const syn of this.synonyms) {
      if (syn.normalized.length < 2) continue;

      // Try matching against the full normalized label
      const dist = OcrFieldParserService.levenshtein(normalized, syn.normalized);
      if (dist <= maxDist && dist < bestDist) {
        bestDist = dist;
        bestSyn = syn;
      }

      // Also check if the normalized raw label CONTAINS the synonym (fuzzy contains)
      if (normalized.length > syn.normalized.length + 3) {
        // Extract substring windows and check
        for (let i = 0; i <= normalized.length - syn.normalized.length; i++) {
          const sub = normalized.substring(i, i + syn.normalized.length);
          const subDist = OcrFieldParserService.levenshtein(sub, syn.normalized);
          if (subDist <= 1 && subDist < bestDist) {
            bestDist = subDist;
            bestSyn = syn;
          }
        }
      }
    }

    if (bestSyn && bestDist <= maxDist) {
      const penalty = bestDist * 10;
      return { field: bestSyn.field, confidence: Math.max(bestSyn.confidence - penalty, 50) };
    }

    return null;
  }

  // ─── Layer 3: Regex fallback ─────────────────────────────────────
  private regexFallback(fullText: string, foundFields: Set<OcrFieldCode>, matches: FieldMatch[]): void {
    if (!foundFields.has('ticket_number')) {
      const m =
        fullText.match(/S[oố]\s*phi[eế]u[:\s]+(\d{6,})/i) ||
        fullText.match(/Phi[eế]u\s*s[oố][:\s]+(\d{5,})/i) ||
        fullText.match(/Sheet\s*No[:\s]+(\d{5,})/i);
      if (m?.[1]) matches.push({ field: 'ticket_number', value: m[1].trim(), confidence: 78, source: 'regex' });
    }

    if (!foundFields.has('bl')) {
      const m =
        fullText.match(/B\/L\s*No[.:\s]*([A-Z0-9\-]+)/i) ||
        fullText.match(/V[aậ]n\s*[đd][oơ]n[:\s]*([A-Z0-9\-]+)/i) ||
        fullText.match(/Bill\s*of\s*Lading[:\s]*([A-Z0-9\-]+)/i);
      if (m?.[1]) matches.push({ field: 'bl', value: m[1].trim(), confidence: 78, source: 'regex' });
    }

    if (!foundFields.has('vehicle')) {
      const m =
        fullText.match(/\b(\d{2}[A-Z]\d?\s?\d{4,5})\b/) ||
        fullText.match(/\b(\d{2}[A-Z]\d?[-]\d{3,5})\b/i);
      if (m?.[1]) matches.push({ field: 'vehicle', value: m[1].trim(), confidence: 78, source: 'regex' });
    }

    if (!foundFields.has('vessel')) {
      const m = fullText.match(/(?:Vessel|M\/V|MV)[,:\s]+([A-Z][A-Z0-9\s]{2,30})/i);
      if (m?.[1]) matches.push({ field: 'vessel', value: m[1].trim(), confidence: 78, source: 'regex' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SMART WEIGHT ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════════

  private assignWeights(
    result: ParsedOcrFields,
    fieldMatches: FieldMatch[],
    rawLabelMap: Map<string, string>,
    lines: string[],
  ): void {
    // Strategy A: Use synonym-matched weight fields from pipeline
    const grossMatches = fieldMatches.filter((m) => m.field === 'gross_weight');
    const tareMatches = fieldMatches.filter((m) => m.field === 'tare_weight');
    const netMatches = fieldMatches.filter((m) => m.field === 'net_weight');

    let grossVal: number | undefined;
    let tareVal: number | undefined;
    let netVal: number | undefined;
    let grossConf = 0;
    let tareConf = 0;
    let netConf = 0;
    let uom = 'KG';

    const extractWeightFromValue = (raw: string): { value: number; uom: string } | null => {
      const m = raw.match(/([\d.,\s]+)\s*\(?(kg|KG|Kg|[tT][aấ]n|TON|MT)\)?/i);
      if (m?.[1]) {
        const v = this.parseVietnameseNumber(m[1]);
        if (!isNaN(v) && v > 0) return { value: v, uom: this.normalizeUom(m[2] || 'KG') };
      }
      // Try plain number (no unit) — common in SP-PSA format
      const plain = this.parseVietnameseNumber(raw.replace(/[^0-9.,\s]/g, ''));
      if (!isNaN(plain) && plain > 100) return { value: plain, uom: 'KG' };
      return null;
    };

    // Pick best match for each weight type
    for (const gm of grossMatches) {
      const w = extractWeightFromValue(gm.value);
      if (w && (!grossVal || gm.confidence > grossConf)) {
        grossVal = w.value; uom = w.uom; grossConf = gm.confidence;
      }
    }
    for (const tm of tareMatches) {
      const w = extractWeightFromValue(tm.value);
      if (w && (!tareVal || tm.confidence > tareConf)) {
        tareVal = w.value; uom = w.uom; tareConf = tm.confidence;
      }
    }
    for (const nm of netMatches) {
      const w = extractWeightFromValue(nm.value);
      if (w && (!netVal || nm.confidence > netConf)) {
        netVal = w.value; uom = w.uom; netConf = nm.confidence;
      }
    }

    // Strategy B: Positional fallback — scan lines for weight labels then pair with values
    if (grossVal === undefined || tareVal === undefined || netVal === undefined) {
      const positional = this.extractWeightsPositional(lines);
      if (grossVal === undefined && positional.gross) {
        grossVal = positional.gross.value; uom = positional.gross.uom; grossConf = 88;
      }
      if (tareVal === undefined && positional.tare) {
        tareVal = positional.tare.value; uom = positional.tare.uom; tareConf = 88;
      }
      if (netVal === undefined && positional.net) {
        netVal = positional.net.value; uom = positional.net.uom; netConf = 88;
      }
    }

    // Strategy C: Smart validation — if gross and tare exist but ambiguous direction,
    // ensure gross > tare (larger value = loaded truck)
    if (grossVal !== undefined && tareVal !== undefined && grossVal < tareVal) {
      [grossVal, tareVal] = [tareVal, grossVal];
      [grossConf, tareConf] = [tareConf, grossConf];
      grossConf = Math.max(grossConf - 5, 50);
      tareConf = Math.max(tareConf - 5, 50);
      this.logger.warn('Swapped gross/tare values: gross should be larger than tare');
    }

    // Strategy D: Calculate missing net from gross - tare
    if (netVal === undefined && grossVal !== undefined && tareVal !== undefined) {
      netVal = grossVal - tareVal;
      netConf = Math.min(grossConf, tareConf) - 5;
      this.logger.log(`Calculated net weight: ${grossVal} - ${tareVal} = ${netVal}`);
    }

    // Strategy E: Validate gross - tare ≈ net
    if (grossVal !== undefined && tareVal !== undefined && netVal !== undefined) {
      const expected = grossVal - tareVal;
      const diff = Math.abs(expected - netVal);
      const tolerance = expected * 0.01; // 1% tolerance
      if (diff > tolerance && expected > 0) {
        this.logger.warn(`Weight validation warning: gross(${grossVal}) - tare(${tareVal}) = ${expected}, but net = ${netVal} (diff=${diff})`);
      }
    }

    // Assign to result
    if (grossVal !== undefined) {
      result.grossWeight = grossVal;
      result.grossWeightUom = uom;
      result.grossWeightConfidence = grossConf;
    }
    if (tareVal !== undefined) {
      result.tareWeight = tareVal;
      result.tareWeightUom = uom;
      result.tareWeightConfidence = tareConf;
    }
    if (netVal !== undefined) {
      result.qtyExtracted = netVal;
      result.qtyUom = uom;
      result.qtyConfidence = netConf;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LINE PARSING (Vision API output handling)
  // ═══════════════════════════════════════════════════════════════════

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

    this.resolveEmptyLabels(lines, emptyLabels, map);
    return map;
  }

  private resolveEmptyLabels(
    lines: string[],
    emptyLabels: { label: string; lineIndex: number }[],
    map: Map<string, string>,
  ): void {
    if (emptyLabels.length === 0) return;

    const lineTypes: ('empty-label' | 'same-line' | 'orphan' | 'other')[] = lines.map(() => 'other');
    const emptyLabelIndices = new Set(emptyLabels.map((el) => el.lineIndex));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (emptyLabelIndices.has(i)) {
        lineTypes[i] = 'empty-label';
      } else if (/^[^:]+:\s+.+$/.test(line)) {
        lineTypes[i] = 'same-line';
      } else {
        lineTypes[i] = 'orphan';
      }
    }

    const consumed = new Set<number>();
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

    for (const group of groups) {
      const groupLineSet = new Set(group.map((el) => el.lineIndex));
      const lastLabelIdx = group[group.length - 1].lineIndex;
      const orphans: { lineIdx: number; value: string }[] = [];

      for (let i = lastLabelIdx + 1; i < lines.length && orphans.length < group.length; i++) {
        if (consumed.has(i)) continue;
        const line = lines[i].trim();
        if (!line) continue;
        if (lineTypes[i] === 'empty-label' && !groupLineSet.has(i)) break;
        if (lineTypes[i] === 'same-line') continue;
        orphans.push({ lineIdx: i, value: line });
      }

      for (let i = 0; i < Math.min(group.length, orphans.length); i++) {
        if (!map.has(group[i].label)) {
          map.set(group[i].label, orphans[i].value);
          consumed.add(orphans[i].lineIdx);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POSITIONAL WEIGHT EXTRACTION (fallback)
  // ═══════════════════════════════════════════════════════════════════

  private extractWeightsPositional(lines: string[]): {
    gross?: { value: number; uom: string };
    tare?: { value: number; uom: string };
    net?: { value: number; uom: string };
  } {
    const result: any = {};

    // Use synonym dictionary to find weight label positions
    let grossLabelIdx = -1;
    let tareLabelIdx = -1;
    let netLabelIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase().trim();
      const match = this.matchSynonymExact(lower) || this.matchSynonymFuzzy(lower);
      if (!match) continue;
      if (match.field === 'gross_weight' && grossLabelIdx < 0) grossLabelIdx = i;
      else if (match.field === 'tare_weight' && tareLabelIdx < 0) tareLabelIdx = i;
      else if (match.field === 'net_weight' && netLabelIdx < 0) netLabelIdx = i;
    }

    // Find all weight numeric values
    const weightValues: { lineIdx: number; value: number; uom: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/([\d.,\s]+)\s*\(?(kg|KG|Kg|[tT][aấ]n|TON|MT)\)?/i);
      if (m?.[1]) {
        const val = this.parseVietnameseNumber(m[1]);
        if (!isNaN(val) && val > 0) {
          weightValues.push({ lineIdx: i, value: val, uom: this.normalizeUom(m[2] || 'KG') });
        }
      }
    }

    this.logger.log(`Positional weight labels: gross=${grossLabelIdx}, tare=${tareLabelIdx}, net=${netLabelIdx}`);
    this.logger.log(`Positional weight values: ${JSON.stringify(weightValues)}`);

    const used = new Set<number>();
    const assign = (labelIdx: number) => {
      if (labelIdx < 0) return undefined;
      // Also check same line (for "Label: 36.020 (kg)" format)
      for (const wv of weightValues) {
        if (wv.lineIdx >= labelIdx && !used.has(wv.lineIdx)) {
          used.add(wv.lineIdx);
          return { value: wv.value, uom: wv.uom };
        }
      }
      return undefined;
    };

    result.gross = assign(grossLabelIdx);
    result.tare = assign(tareLabelIdx);
    result.net = assign(netLabelIdx);

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════════════

  private parseVietnameseNumber(numStr: string): number {
    // Remove parentheses, unit text, and extra whitespace first
    let trimmed = numStr.replace(/[()]/g, '').trim();

    // Handle space as thousands separator: "42 980" → "42980"
    if (/^\d{1,3}(\s\d{3})+$/.test(trimmed)) {
      return parseFloat(trimmed.replace(/\s/g, ''));
    }
    // Remove spaces that might be stray
    trimmed = trimmed.replace(/\s/g, '');

    // "36.020,5" — dot=thousands, comma=decimal
    if (trimmed.includes('.') && trimmed.includes(',')) {
      return parseFloat(trimmed.replace(/\./g, '').replace(',', '.'));
    }
    // "36.020" — dot could be thousands (if 3 digits after last dot)
    if (trimmed.includes('.')) {
      const parts = trimmed.split('.');
      if (parts[parts.length - 1].length === 3) {
        return parseFloat(trimmed.replace(/\./g, ''));
      }
      return parseFloat(trimmed);
    }
    // "46,880" — comma could be thousands (if 3 digits after last comma)
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

  // ─── Levenshtein distance ────────────────────────────────────────
  static levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b[i - 1] === a[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[b.length][a.length];
  }

  // ─── Vietnamese diacritics removal ───────────────────────────────
  static removeDiacritics(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }
}
