import { Injectable, Logger } from '@nestjs/common';
import { OcrResultRepository } from '../repositories/ocr-result.repository';
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

  constructor(private readonly ocrResultRepo: OcrResultRepository) {}

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
      // Mock OCR extraction - in production, this would call actual OCR provider
      const extractedData = await this.mockOcrExtraction(result.imagePath);

      // Determine final status based on per-field confidence thresholds (spec: 90% for BL/vehicle, 85% for others)
      const status = this.evaluateConfidence(extractedData)
        ? OcrStatus.EXTRACTED
        : OcrStatus.REVIEW_REQUIRED;

      await this.ocrResultRepo.update(ocrResultId, {
        ...extractedData,
        status,
      });

      this.logger.log(`OCR extraction completed for ${ocrResultId}, status: ${status}`);
      return extractedData;

    } catch (error) {
      this.logger.error(`OCR extraction failed for ${ocrResultId}: ${error}`);
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

  private async mockOcrExtraction(imagePath: string): Promise<OcrExtractedData> {
    // Mock implementation - returns sample data
    return {
      blNumber: `BL-${Date.now().toString().slice(-8)}`,
      blConfidence: 95.5,
      vehicleNumber: '51A-12345',
      vehicleConfidence: 92.3,
      productName: 'Steel Coil Grade A',
      productConfidence: 88.0,
      vesselName: 'MV Ocean Star',
      vesselConfidence: 90.0,
      qtyExtracted: 25000,
      qtyUom: 'KG',
      qtyConfidence: 85.0,
      overallConfidence: 90.2,
      rawResponse: {
        provider: 'mock',
        processedAt: new Date().toISOString(),
        imagePath,
      },
    };
  }
}
