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

      // Determine final status based on confidence
      const status = extractedData.overallConfidence && extractedData.overallConfidence >= 80
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
