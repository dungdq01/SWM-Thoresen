import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { OcrUploadService } from '../services/ocr-upload.service';
import { OcrExtractService } from '../services/ocr-extract.service';
import { OcrConfirmationService, ConfirmOcrParams, LinkOcrParams } from '../services/ocr-confirmation.service';
import { v4 as uuidv4 } from 'uuid';

class UploadOcrDto {
  imagePath!: string;
  providerName?: string;
  warehouseId?: string;
}

class ConfirmOcrDto {
  confirmedBlNumber?: string;
  confirmedVehicleNumber?: string;
  confirmedProductName?: string;
  confirmedVesselName?: string;
  confirmedQty?: number;
  confirmedQtyUom?: string;
  corrections?: Record<string, unknown>;
  remarks?: string;
}

class LinkOcrDto {
  receiptId!: string;
  linkMethod!: string;
  correlationId?: string;
}

class RejectOcrDto {
  reason!: string;
}

@Controller('api/v1/integration/ocr')
export class OcrController {
  constructor(
    private readonly uploadService: OcrUploadService,
    private readonly extractService: OcrExtractService,
    private readonly confirmationService: OcrConfirmationService,
  ) {}

  @Post('uploads')
  async uploadForOcr(@Body() dto: UploadOcrDto) {
    const correlationId = uuidv4();
    const createdBy = 'operator'; // In production, from auth context

    const result = await this.uploadService.uploadForOcr({
      imagePath: dto.imagePath,
      providerName: dto.providerName || 'default',
      warehouseId: dto.warehouseId,
      correlationId,
      createdBy,
    });

    // Trigger extraction asynchronously
    this.extractService.extractFromImage(result.id).catch(err => {
      console.error('OCR extraction error:', err);
    });

    return result;
  }

  @Get('results')
  async getResults(
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('linkedReceiptId') linkedReceiptId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.uploadService.getResults({
      status,
      warehouseId,
      linkedReceiptId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('results/:id')
  async getResultById(@Param('id') id: string) {
    return this.uploadService.getResultById(id);
  }

  @Post('results/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmResult(@Param('id') id: string, @Body() dto: ConfirmOcrDto) {
    const confirmedBy = 'operator'; // In production, from auth context
    return this.confirmationService.confirmOcrResult(id, dto, confirmedBy);
  }

  @Post('results/:id/link')
  @HttpCode(HttpStatus.OK)
  async linkToReceipt(@Param('id') id: string, @Body() dto: LinkOcrDto) {
    return this.confirmationService.linkToReceipt(id, {
      receiptId: dto.receiptId,
      linkMethod: dto.linkMethod,
      correlationId: dto.correlationId || uuidv4(),
    });
  }

  @Post('results/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectResult(@Param('id') id: string, @Body() dto: RejectOcrDto) {
    const rejectedBy = 'operator'; // In production, from auth context
    return this.confirmationService.rejectOcrResult(id, dto.reason, rejectedBy);
  }
}
