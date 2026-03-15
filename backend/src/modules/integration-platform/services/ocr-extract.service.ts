import { Injectable, Logger } from '@nestjs/common';
import { OcrResultRepository } from '../repositories/ocr-result.repository';
import { OcrProviderService } from './ocr-provider.service';
import { OcrFieldParserService } from './ocr-field-parser.service';
import { OcrStatus } from '../domain/integration.enums';
import { OcrError, IntegrationErrorCodes } from '../domain/integration.errors';

export interface OcrExtractedData {
  blNumber?: string;
  blConfidence?: number;
  vehicleNumber?: string;
  vehicleConfidence?: number;
  productName?: string;
  productConfidence?: number;
  vesselName?: string;
  vesselConfidence?: number;
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

    // Update status to EXTRACTING
    await this.ocrResultRepo.update(ocrResultId, { status: OcrStatus.EXTRACTING });

    try {
      // Call OCR provider (Google Vision or mock fallback)
      const extractedData = await this.realOcrExtraction(result.imagePath);

      // Determine final status based on per-field confidence thresholds (spec: 90% for BL/vehicle, 85% for others)
      const status = this.evaluateConfidence(extractedData)
        ? OcrStatus.EXTRACTED
        : OcrStatus.REVIEW_REQUIRED;

      // Build update payload with only valid Prisma fields (no spread to avoid unknown fields)
      const updatePayload: Record<string, any> = { status };
      if (extractedData.blNumber !== undefined) updatePayload.blNumber = extractedData.blNumber;
      if (extractedData.blConfidence !== undefined) updatePayload.blConfidence = extractedData.blConfidence;
      if (extractedData.vehicleNumber !== undefined) updatePayload.vehicleNumber = extractedData.vehicleNumber;
      if (extractedData.vehicleConfidence !== undefined) updatePayload.vehicleConfidence = extractedData.vehicleConfidence;
      if (extractedData.productName !== undefined) updatePayload.productName = extractedData.productName;
      if (extractedData.productConfidence !== undefined) updatePayload.productConfidence = extractedData.productConfidence;
      if (extractedData.vesselName !== undefined) updatePayload.vesselName = extractedData.vesselName;
      if (extractedData.vesselConfidence !== undefined) updatePayload.vesselConfidence = extractedData.vesselConfidence;
      if (extractedData.qtyExtracted !== undefined) updatePayload.qtyExtracted = extractedData.qtyExtracted;
      if (extractedData.qtyUom !== undefined) updatePayload.qtyUom = extractedData.qtyUom;
      if (extractedData.qtyConfidence !== undefined) updatePayload.qtyConfidence = extractedData.qtyConfidence;
      if (extractedData.overallConfidence !== undefined) updatePayload.overallConfidence = extractedData.overallConfidence;
      if (extractedData.rawResponse !== undefined) updatePayload.rawResponse = JSON.parse(JSON.stringify(extractedData.rawResponse));

      this.logger.log(`OCR update payload for ${ocrResultId}: ${JSON.stringify(updatePayload, null, 2)}`);

      await this.ocrResultRepo.update(ocrResultId, updatePayload);

      this.logger.log(`OCR extraction completed for ${ocrResultId}, status: ${status}`);
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

  /**
   * Evaluate OCR confidence per field based on spec thresholds:
   * - BL Number: ≥90%
   * - Vehicle Number: ≥90%
   * - Product Name: ≥85%
   * - Vessel Name: ≥85%
   * - Quantity: ≥85%
   */
  private evaluateConfidence(data: OcrExtractedData): boolean {
    const thresholds = {
      blConfidence: 90,
      vehicleConfidence: 90,
      productConfidence: 85,
      vesselConfidence: 85,
      qtyConfidence: 85,
    };

    // Check each field that was extracted
    if (data.blNumber && (data.blConfidence ?? 0) < thresholds.blConfidence) return false;
    if (data.vehicleNumber && (data.vehicleConfidence ?? 0) < thresholds.vehicleConfidence) return false;
    if (data.productName && (data.productConfidence ?? 0) < thresholds.productConfidence) return false;
    if (data.vesselName && (data.vesselConfidence ?? 0) < thresholds.vesselConfidence) return false;
    if (data.qtyExtracted && (data.qtyConfidence ?? 0) < thresholds.qtyConfidence) return false;

    // At least BL or vehicle must be extracted with confidence
    const hasPrimaryField = 
      (!!data.blNumber && (data.blConfidence ?? 0) >= thresholds.blConfidence) ||
      (!!data.vehicleNumber && (data.vehicleConfidence ?? 0) >= thresholds.vehicleConfidence);

    return !!hasPrimaryField;
  }

  private async realOcrExtraction(filePath: string): Promise<OcrExtractedData> {
    // 1. Call Google Vision (or mock fallback)
    const rawResult = await this.ocrProviderService.extractText(filePath);

    // 2. Parse structured fields from raw text
    const fields = this.ocrFieldParserService.parseFields(rawResult.fullText);

    // 3. Calculate overall confidence
    const confidences = [
      fields.blConfidence,
      fields.vehicleConfidence,
      fields.productConfidence,
      fields.vesselConfidence,
      fields.qtyConfidence,
    ].filter((c) => c > 0);

    const overallConfidence = confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 10) / 10
      : 0;

    return {
      blNumber: fields.blNumber,
      blConfidence: fields.blConfidence,
      vehicleNumber: fields.vehicleNumber,
      vehicleConfidence: fields.vehicleConfidence,
      productName: fields.productName,
      productConfidence: fields.productConfidence,
      vesselName: fields.vesselName,
      vesselConfidence: fields.vesselConfidence,
      qtyExtracted: fields.qtyExtracted,
      qtyUom: fields.qtyUom,
      qtyConfidence: fields.qtyConfidence,
      overallConfidence,
      rawResponse: rawResult.rawResponse,
    };
  }
}
