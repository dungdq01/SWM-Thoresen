import { Injectable, Logger } from '@nestjs/common';
import { OcrResultRepository } from '../repositories/ocr-result.repository';
import { OcrConfirmedSnapshotRepository } from '../repositories/ocr-confirmed-snapshot.repository';
import { OcrStatus, OcrLinkMethod } from '../domain/integration.enums';
import { OcrError, IntegrationErrorCodes } from '../domain/integration.errors';

export interface ConfirmOcrParams {
  confirmedBlNumber?: string;
  confirmedVehicleNumber?: string;
  confirmedProductName?: string;
  confirmedVesselName?: string;
  confirmedQty?: number;
  confirmedQtyUom?: string;
  corrections?: Record<string, unknown>;
  remarks?: string;
}

export interface LinkOcrParams {
  receiptId: string;
  linkMethod: string;
  correlationId: string;
}

@Injectable()
export class OcrConfirmationService {
  private readonly logger = new Logger(OcrConfirmationService.name);

  constructor(
    private readonly ocrResultRepo: OcrResultRepository,
    private readonly snapshotRepo: OcrConfirmedSnapshotRepository,
  ) {}

  async confirmOcrResult(ocrResultId: string, params: ConfirmOcrParams, confirmedBy: string) {
    const result = await this.ocrResultRepo.findById(ocrResultId);
    if (!result) {
      throw new OcrError(IntegrationErrorCodes.OCR_RESULT_NOT_FOUND, `OCR result ${ocrResultId} not found`);
    }

    const allowedStatuses = [OcrStatus.EXTRACTED, OcrStatus.REVIEW_REQUIRED];
    if (!allowedStatuses.includes(result.status as OcrStatus)) {
      throw new OcrError(
        IntegrationErrorCodes.OCR_INVALID_STATUS_TRANSITION,
        `Cannot confirm result in status ${result.status}`,
      );
    }

    if (result.operatorConfirmed) {
      throw new OcrError(IntegrationErrorCodes.OCR_ALREADY_CONFIRMED, 'OCR result is already confirmed');
    }

    // Create confirmed snapshot
    await this.snapshotRepo.upsertByOcrResultId(ocrResultId, {
      confirmedBlNumber: params.confirmedBlNumber,
      confirmedVehicleNumber: params.confirmedVehicleNumber,
      confirmedProductName: params.confirmedProductName,
      confirmedVesselName: params.confirmedVesselName,
      confirmedQty: params.confirmedQty,
      confirmedQtyUom: params.confirmedQtyUom,
      correctionsJson: params.corrections,
      confirmedBy,
      confirmedAt: new Date(),
      remarks: params.remarks,
    });

    // Update result status
    await this.ocrResultRepo.update(ocrResultId, {
      status: OcrStatus.CONFIRMED,
      operatorConfirmed: true,
    });

    this.logger.log(`OCR result ${ocrResultId} confirmed by ${confirmedBy}`);
    return this.ocrResultRepo.findById(ocrResultId);
  }

  async linkToReceipt(ocrResultId: string, params: LinkOcrParams) {
    const result = await this.ocrResultRepo.findById(ocrResultId);
    if (!result) {
      throw new OcrError(IntegrationErrorCodes.OCR_RESULT_NOT_FOUND, `OCR result ${ocrResultId} not found`);
    }

    if (result.status === OcrStatus.REJECTED) {
      throw new OcrError(
        IntegrationErrorCodes.OCR_INVALID_STATUS_TRANSITION,
        'Cannot link rejected OCR result',
      );
    }

    await this.ocrResultRepo.update(ocrResultId, {
      linkedReceiptId: params.receiptId,
      linkMethod: params.linkMethod as OcrLinkMethod,
      status: OcrStatus.LINKED,
    });

    this.logger.log(`OCR result ${ocrResultId} linked to receipt ${params.receiptId}`);
    return this.ocrResultRepo.findById(ocrResultId);
  }

  async rejectOcrResult(ocrResultId: string, reason: string, rejectedBy: string) {
    const result = await this.ocrResultRepo.findById(ocrResultId);
    if (!result) {
      throw new OcrError(IntegrationErrorCodes.OCR_RESULT_NOT_FOUND, `OCR result ${ocrResultId} not found`);
    }

    if (result.status === OcrStatus.LINKED) {
      throw new OcrError(
        IntegrationErrorCodes.OCR_INVALID_STATUS_TRANSITION,
        'Cannot reject linked OCR result',
      );
    }

    await this.ocrResultRepo.update(ocrResultId, { status: OcrStatus.REJECTED });

    this.logger.log(`OCR result ${ocrResultId} rejected by ${rejectedBy}: ${reason}`);
    return this.ocrResultRepo.findById(ocrResultId);
  }
}
