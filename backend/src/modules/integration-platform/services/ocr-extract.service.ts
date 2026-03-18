import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OcrResultRepository } from '../repositories/ocr-result.repository';
import { OcrProviderService, OcrExtractedFields } from './ocr-provider.service';
import { OcrFieldParserService } from './ocr-field-parser.service';
import { OcrAutoLinkService } from './ocr-auto-link.service';
import { OcrStatus } from '../domain/integration.enums';
import { OcrError, IntegrationErrorCodes } from '../domain/integration.errors';

// ═══════════════════════════════════════════════════════════════════
//  Confidence scoring constants (from BUILD_GUIDE section 5)
// ═══════════════════════════════════════════════════════════════════

const AI_LEVEL_MAP: Record<string, number> = { high: 95, medium: 70, low: 40 };
const SOURCE_ADJUST: Record<string, number> = {
  printed: +3, handwritten: -5, stamp: 0, mixed: -3, inferred: -10,
};

export interface OcrExtractedData {
  ticketNumber?: string;
  ticketConfidence?: number;
  blNumber?: string;
  blConfidence?: number;
  vehicleNumber?: string;
  vehicleConfidence?: number;
  productName?: string;
  productConfidence?: number;
  vesselName?: string;
  vesselConfidence?: number;
  customerName?: string;
  customerConfidence?: number;
  deliveryLocation?: string;
  deliveryConfidence?: number;
  grossWeight?: number;
  grossWeightUom?: string;
  grossWeightConfidence?: number;
  tareWeight?: number;
  tareWeightUom?: string;
  tareWeightConfidence?: number;
  qtyExtracted?: number;
  qtyUom?: string;
  qtyConfidence?: number;
  overallConfidence?: number;
  rawResponse?: Record<string, unknown>;
}

@Injectable()
export class OcrExtractService {
  private readonly logger = new Logger(OcrExtractService.name);

  constructor(
    private readonly ocrResultRepo: OcrResultRepository,
    private readonly ocrProviderService: OcrProviderService,
    private readonly ocrFieldParserService: OcrFieldParserService,
    @Inject(forwardRef(() => OcrAutoLinkService))
    private readonly ocrAutoLinkService: OcrAutoLinkService,
  ) {}

  async extractFromImage(ocrResultId: string): Promise<OcrExtractedData> {
    const result = await this.ocrResultRepo.findById(ocrResultId);
    if (!result) {
      throw new OcrError(IntegrationErrorCodes.OCR_RESULT_NOT_FOUND, `OCR result ${ocrResultId} not found`);
    }

    if (result.status !== OcrStatus.UPLOADED) {
      throw new OcrError(
        IntegrationErrorCodes.OCR_INVALID_STATUS_TRANSITION,
        `Cannot extract from result in status ${result.status}`,
      );
    }

    await this.ocrResultRepo.update(ocrResultId, { status: OcrStatus.EXTRACTING });

    try {
      const extractedData = await this.runExtractionPipeline(result.imagePath);

      const status = this.evaluateConfidence(extractedData)
        ? OcrStatus.EXTRACTED
        : OcrStatus.REVIEW_REQUIRED;

      const updatePayload: Record<string, any> = { status };
      if (extractedData.ticketNumber !== undefined) updatePayload.ticketNumber = extractedData.ticketNumber;
      if (extractedData.ticketConfidence !== undefined) updatePayload.ticketConfidence = extractedData.ticketConfidence;
      if (extractedData.blNumber !== undefined) updatePayload.blNumber = extractedData.blNumber;
      if (extractedData.blConfidence !== undefined) updatePayload.blConfidence = extractedData.blConfidence;
      if (extractedData.vehicleNumber !== undefined) updatePayload.vehicleNumber = extractedData.vehicleNumber;
      if (extractedData.vehicleConfidence !== undefined) updatePayload.vehicleConfidence = extractedData.vehicleConfidence;
      if (extractedData.productName !== undefined) updatePayload.productName = extractedData.productName;
      if (extractedData.productConfidence !== undefined) updatePayload.productConfidence = extractedData.productConfidence;
      if (extractedData.vesselName !== undefined) updatePayload.vesselName = extractedData.vesselName;
      if (extractedData.vesselConfidence !== undefined) updatePayload.vesselConfidence = extractedData.vesselConfidence;
      if (extractedData.customerName !== undefined) updatePayload.customerName = extractedData.customerName;
      if (extractedData.customerConfidence !== undefined) updatePayload.customerConfidence = extractedData.customerConfidence;
      if (extractedData.deliveryLocation !== undefined) updatePayload.deliveryLocation = extractedData.deliveryLocation;
      if (extractedData.deliveryConfidence !== undefined) updatePayload.deliveryConfidence = extractedData.deliveryConfidence;
      if (extractedData.grossWeight !== undefined) updatePayload.grossWeight = extractedData.grossWeight;
      if (extractedData.grossWeightUom !== undefined) updatePayload.grossWeightUom = extractedData.grossWeightUom;
      if (extractedData.grossWeightConfidence !== undefined) updatePayload.grossWeightConfidence = extractedData.grossWeightConfidence;
      if (extractedData.tareWeight !== undefined) updatePayload.tareWeight = extractedData.tareWeight;
      if (extractedData.tareWeightUom !== undefined) updatePayload.tareWeightUom = extractedData.tareWeightUom;
      if (extractedData.tareWeightConfidence !== undefined) updatePayload.tareWeightConfidence = extractedData.tareWeightConfidence;
      if (extractedData.qtyExtracted !== undefined) updatePayload.qtyExtracted = extractedData.qtyExtracted;
      if (extractedData.qtyUom !== undefined) updatePayload.qtyUom = extractedData.qtyUom;
      if (extractedData.qtyConfidence !== undefined) updatePayload.qtyConfidence = extractedData.qtyConfidence;
      if (extractedData.overallConfidence !== undefined) updatePayload.overallConfidence = extractedData.overallConfidence;
      if (extractedData.rawResponse !== undefined) updatePayload.rawResponse = JSON.parse(JSON.stringify(extractedData.rawResponse));

      this.logger.log(`OCR update payload for ${ocrResultId}: ${JSON.stringify(updatePayload, null, 2)}`);

      await this.ocrResultRepo.update(ocrResultId, updatePayload);

      this.logger.log(`OCR extraction completed for ${ocrResultId}, status: ${status}`);

      // Trigger auto-link (fire-and-forget) based on direction
      this.ocrAutoLinkService.autoLinkInbound(ocrResultId).catch(err => {
        this.logger.error(`Inbound auto-link failed for ${ocrResultId}: ${err?.message || err}`);
      });
      this.ocrAutoLinkService.autoLinkOutbound(ocrResultId).catch(err => {
        this.logger.error(`Outbound auto-link failed for ${ocrResultId}: ${err?.message || err}`);
      });

      return extractedData;

    } catch (error) {
      const err = error as any;
      this.logger.error(`OCR extraction failed for ${ocrResultId}: ${err?.message || err}`);
      this.logger.error(err?.stack || '');
      await this.ocrResultRepo.update(ocrResultId, { status: OcrStatus.REVIEW_REQUIRED });
      throw new OcrError(
        IntegrationErrorCodes.OCR_EXTRACTION_FAILED,
        `OCR extraction failed: ${error}`,
      );
    }
  }

  // ─── 2-Stage Gemini Pipeline + Custom Parser Gap-Fill ──────────
  private async runExtractionPipeline(filePath: string): Promise<OcrExtractedData> {
    // Stage 1: Gemini Vision → Structured Markdown
    const ocrResult = await this.ocrProviderService.extractText(filePath);
    const ocrText = ocrResult.fullText;

    this.logger.log(`Stage 1 done (${ocrResult.provider}/${ocrResult.model}): ${ocrText.length} chars`);
    this.logger.debug(`Stage 1 OCR text (first 500 chars): ${ocrText.substring(0, 500)}`);

    // Stage 2: Gemini Extract → Structured JSON (only if Gemini available)
    let geminiFields: OcrExtractedFields = {};
    if (ocrResult.provider === 'gemini') {
      geminiFields = await this.ocrProviderService.extractFields(ocrText);
      const geminiFieldNames = Object.keys(geminiFields).filter(k => !k.startsWith('_'));
      this.logger.log(`Stage 2 Gemini extraction: ${geminiFieldNames.length} fields → [${geminiFieldNames.join(', ')}]`);
      this.logger.log(`Stage 2 Gemini values: ${JSON.stringify(geminiFields, null, 2)}`);
    }

    // Stage 3: ALWAYS run custom parser (3-layer synonym + fuzzy + regex) to fill gaps
    const parserFields = this.ocrFieldParserService.parseFields(ocrText);
    const pf = parserFields as Record<string, any>;
    const parserFieldNames = Object.keys(pf).filter(k => pf[k] != null && pf[k] !== 0 && pf[k] !== '');
    this.logger.log(`Stage 3 Parser extraction: ${parserFieldNames.length} non-empty fields → [${parserFieldNames.join(', ')}]`);

    // Build final result — prefer Gemini, fill gaps from parser
    return this.mergeResults(geminiFields, parserFields, ocrResult.rawResponse);
  }

  // ─── Merge Gemini + Parser results ─────────────────────────────
  private mergeResults(
    gemini: OcrExtractedFields,
    parser: any | null,
    rawResponse: Record<string, unknown>,
  ): OcrExtractedData {
    const fc = gemini._fieldConfidence || {};

    // Helper: get confidence from Gemini _field_confidence
    const aiConf = (fieldName: string, fallbackParserConf?: number): number => {
      const fc_entry = fc[fieldName];
      if (fc_entry) {
        const base = AI_LEVEL_MAP[fc_entry.level] ?? 70;
        const adjust = SOURCE_ADJUST[fc_entry.source] ?? 0;
        return Math.max(10, Math.min(100, base + adjust));
      }
      return fallbackParserConf ?? 0;
    };

    const result: OcrExtractedData = { rawResponse };

    // Ticket Number (số phiếu cân)
    result.ticketNumber = gemini.documentNumber ?? parser?.ticketNumber;
    result.ticketConfidence = gemini.documentNumber
      ? aiConf('document_number')
      : (parser?.ticketConfidence ?? 0);

    // BL / Bill of Lading (số vận đơn)
    result.blNumber = gemini.blNumber ?? parser?.blNumber;
    result.blConfidence = gemini.blNumber
      ? aiConf('bl_number')
      : (parser?.blConfidence ?? 0);

    // Vehicle
    result.vehicleNumber = gemini.vehicleNumber ?? parser?.vehicleNumber;
    result.vehicleConfidence = gemini.vehicleNumber
      ? aiConf('vehicle_number')
      : (parser?.vehicleConfidence ?? 0);

    // Vessel
    result.vesselName = gemini.vesselName ?? parser?.vesselName;
    result.vesselConfidence = gemini.vesselName
      ? aiConf('vessel_name')
      : (parser?.vesselConfidence ?? 0);

    // Product
    result.productName = gemini.productName ?? parser?.productName;
    result.productConfidence = gemini.productName
      ? aiConf('product_name')
      : (parser?.productConfidence ?? 0);

    // Customer
    result.customerName = gemini.customerName ?? parser?.customerName;
    result.customerConfidence = gemini.customerName
      ? aiConf('customer_name')
      : (parser?.customerConfidence ?? 0);

    // Delivery
    result.deliveryLocation = gemini.deliveryLocation ?? parser?.deliveryLocation;
    result.deliveryConfidence = gemini.deliveryLocation
      ? aiConf('delivery_location')
      : (parser?.deliveryConfidence ?? 0);

    // Weights
    result.grossWeight = gemini.grossWeightKg ?? parser?.grossWeight;
    result.grossWeightUom = gemini.weightUnit || parser?.grossWeightUom || 'KG';
    result.grossWeightConfidence = gemini.grossWeightKg != null
      ? aiConf('gross_weight_kg')
      : (parser?.grossWeightConfidence ?? 0);

    result.tareWeight = gemini.tareWeightKg ?? parser?.tareWeight;
    result.tareWeightUom = gemini.weightUnit || parser?.tareWeightUom || 'KG';
    result.tareWeightConfidence = gemini.tareWeightKg != null
      ? aiConf('tare_weight_kg')
      : (parser?.tareWeightConfidence ?? 0);

    result.qtyExtracted = gemini.netWeightKg ?? parser?.qtyExtracted;
    result.qtyUom = gemini.weightUnit || parser?.qtyUom || 'KG';
    result.qtyConfidence = gemini.netWeightKg != null
      ? aiConf('net_weight_kg')
      : (parser?.qtyConfidence ?? 0);

    // Overall confidence
    const confidences = [
      result.ticketConfidence, result.blConfidence, result.vehicleConfidence,
      result.productConfidence, result.vesselConfidence,
      result.customerConfidence, result.deliveryConfidence,
      result.grossWeightConfidence, result.tareWeightConfidence,
      result.qtyConfidence,
    ].filter((c) => c != null && c > 0) as number[];

    result.overallConfidence = confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 10) / 10
      : 0;

    // Debug: log merged result summary
    this.logger.log(`Merge result: ticket=${result.ticketNumber || '(none)'}, bl=${result.blNumber || '(none)'}, vehicle=${result.vehicleNumber || '(none)'}, vessel=${result.vesselName || '(none)'}, product=${result.productName || '(none)'}, customer=${result.customerName || '(none)'}, gross=${result.grossWeight ?? '(none)'}, tare=${result.tareWeight ?? '(none)'}, net=${result.qtyExtracted ?? '(none)'}, overall=${result.overallConfidence}%`);

    return result;
  }

  // ─── Confidence evaluation ─────────────────────────────────────
  private evaluateConfidence(data: OcrExtractedData): boolean {
    const thresholds = {
      blConfidence: 90,
      vehicleConfidence: 90,
      productConfidence: 85,
      vesselConfidence: 85,
      qtyConfidence: 85,
    };

    if (data.blNumber && (data.blConfidence ?? 0) < thresholds.blConfidence) return false;
    if (data.vehicleNumber && (data.vehicleConfidence ?? 0) < thresholds.vehicleConfidence) return false;
    if (data.productName && (data.productConfidence ?? 0) < thresholds.productConfidence) return false;
    if (data.vesselName && (data.vesselConfidence ?? 0) < thresholds.vesselConfidence) return false;
    if (data.qtyExtracted && (data.qtyConfidence ?? 0) < thresholds.qtyConfidence) return false;

    const hasPrimaryField =
      (!!data.blNumber && (data.blConfidence ?? 0) >= thresholds.blConfidence) ||
      (!!data.vehicleNumber && (data.vehicleConfidence ?? 0) >= thresholds.vehicleConfidence);

    return !!hasPrimaryField;
  }
}
