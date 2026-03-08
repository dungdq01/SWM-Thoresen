import { Injectable, Logger } from '@nestjs/common';
import { OcrResultRepository } from '../repositories/ocr-result.repository';
import { OcrStatus } from '../domain/integration.enums';
import { OcrError, IntegrationErrorCodes } from '../domain/integration.errors';
import { v4 as uuidv4 } from 'uuid';

export interface OcrUploadParams {
  imagePath: string;
  providerName: string;
  warehouseId?: string;
  correlationId: string;
  createdBy: string;
}

@Injectable()
export class OcrUploadService {
  private readonly logger = new Logger(OcrUploadService.name);

  constructor(private readonly ocrResultRepo: OcrResultRepository) {}

  async uploadForOcr(params: OcrUploadParams) {
    const ocrRequestId = `OCR-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const externalId = uuidv4();

    // Check file type
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf'];
    const fileExt = params.imagePath.toLowerCase().slice(params.imagePath.lastIndexOf('.'));
    if (!allowedTypes.includes(fileExt)) {
      throw new OcrError(
        IntegrationErrorCodes.OCR_INVALID_FILE_TYPE,
        `File type ${fileExt} is not allowed. Allowed: ${allowedTypes.join(', ')}`,
      );
    }

    const result = await this.ocrResultRepo.create({
      ocrRequestId,
      imagePath: params.imagePath,
      providerName: params.providerName,
      status: OcrStatus.UPLOADED,
      externalId,
      correlationId: params.correlationId,
      sourceChannel: 'OCR',
      warehouseId: params.warehouseId,
      createdBy: params.createdBy,
      operatorConfirmed: false,
    });

    this.logger.log(`OCR upload created: ${ocrRequestId}`);
    return result;
  }

  async getResults(params: {
    status?: string;
    warehouseId?: string;
    linkedReceiptId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const result = await this.ocrResultRepo.findMany({
      status: params.status,
      warehouseId: params.warehouseId,
      linkedReceiptId: params.linkedReceiptId,
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      skip: ((params.page || 1) - 1) * (params.limit || 20),
      take: params.limit || 20,
    });

    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: Math.ceil(result.total / (params.limit || 20)),
      },
    };
  }

  async getResultById(id: string) {
    const result = await this.ocrResultRepo.findById(id);
    if (!result) {
      throw new OcrError(IntegrationErrorCodes.OCR_RESULT_NOT_FOUND, `OCR result ${id} not found`);
    }
    return result;
  }
}
