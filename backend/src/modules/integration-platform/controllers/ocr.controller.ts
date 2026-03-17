import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { OcrUploadService } from '../services/ocr-upload.service';
import { OcrExtractService } from '../services/ocr-extract.service';
import { OcrConfirmationService, ConfirmOcrParams, LinkOcrParams } from '../services/ocr-confirmation.service';
import { OcrAutoLinkService } from '../services/ocr-auto-link.service';
import { OcrFileUploadInterceptor } from '../interceptors/ocr-file-upload.interceptor';
import { v4 as uuidv4 } from 'uuid';

class UploadOcrDto {
  @IsString()
  imagePath!: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

class ConfirmOcrDto {
  @IsOptional()
  @IsString()
  confirmedBlNumber?: string;

  @IsOptional()
  @IsString()
  confirmedVehicleNumber?: string;

  @IsOptional()
  @IsString()
  confirmedProductName?: string;

  @IsOptional()
  @IsString()
  confirmedVesselName?: string;

  @IsOptional()
  @IsNumber()
  confirmedQty?: number;

  @IsOptional()
  @IsString()
  confirmedQtyUom?: string;

  @IsOptional()
  corrections?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  remarks?: string;
}

class LinkOcrDto {
  @IsUUID()
  receiptId!: string;

  @IsString()
  linkMethod!: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;
}

class RejectOcrDto {
  @IsString()
  reason!: string;
}

@Controller('integration/ocr')
@UseGuards(AuthGuard, PermissionGuard)
export class OcrController {
  constructor(
    private readonly uploadService: OcrUploadService,
    private readonly extractService: OcrExtractService,
    private readonly confirmationService: OcrConfirmationService,
    private readonly autoLinkService: OcrAutoLinkService,
  ) {}

  @Post('uploads')
  @Permission('INTEGRATION.OCR.UPLOAD')
  @UseInterceptors(OcrFileUploadInterceptor)
  async uploadForOcr(
    @UploadedFile() file: any,
    @Body('warehouseId') warehouseId: string,
    @Body('direction') direction: string,
    @CurrentUser() user: RequestUser,
  ) {
    const correlationId = uuidv4();
    const createdBy = user.id;

    const result = await this.uploadService.uploadForOcr({
      filePath: file.path,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      providerName: 'google-vision',
      warehouseId,
      direction: direction || 'INBOUND',
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
  @Permission('INTEGRATION.OCR.READ')
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
  @Permission('INTEGRATION.OCR.READ')
  async getResultById(@Param('id') id: string) {
    return this.uploadService.getResultById(id);
  }

  @Post('results/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.OCR.CONFIRM')
  async confirmResult(@Param('id') id: string, @Body() dto: ConfirmOcrDto, @CurrentUser() user: RequestUser) {
    return this.confirmationService.confirmOcrResult(id, dto, user.id);
  }

  @Post('results/:id/link')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.OCR.LINK')
  async linkToReceipt(@Param('id') id: string, @Body() dto: LinkOcrDto) {
    return this.confirmationService.linkToReceipt(id, {
      receiptId: dto.receiptId,
      linkMethod: dto.linkMethod,
      correlationId: dto.correlationId || uuidv4(),
    });
  }

  @Post('results/:id/reject')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.OCR.REJECT')
  async rejectResult(@Param('id') id: string, @Body() dto: RejectOcrDto, @CurrentUser() user: RequestUser) {
    return this.confirmationService.rejectOcrResult(id, dto.reason, user.id);
  }

  @Post('backfill-documents')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.OCR.UPLOAD')
  async backfillDocuments() {
    return this.autoLinkService.backfillDocumentsForLinkedOcr();
  }
}
