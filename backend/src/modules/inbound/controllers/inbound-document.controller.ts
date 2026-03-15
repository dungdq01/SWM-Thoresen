import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage, StorageEngine } from 'multer';
import type { Request } from 'express';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { InboundDocumentService } from '../services/inbound-document.service';
import {
  UploadInboundDocumentDto,
  InboundDocumentQueryDto,
  UpdateInboundDocumentDto,
} from '../dto/inbound-document.dto';

const UPLOAD_PATH = join(process.cwd(), 'uploads', 'inbound-documents');

if (!existsSync(UPLOAD_PATH)) {
  mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage: StorageEngine = diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG'), false);
  }
};

@ApiTags('Inbound Documents')
@Controller('inbound/documents')
export class InboundDocumentController {
  constructor(private readonly documentService: InboundDocumentService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an inbound document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        docType: { type: 'string', enum: ['BILL_OF_LADING', 'PACKING_LIST', 'COMMERCIAL_INVOICE', 'CERTIFICATE_OF_ORIGIN', 'QUALITY_CERTIFICATE', 'WEIGHT_CERTIFICATE', 'OTHER'] },
        receiptHeaderId: { type: 'string', format: 'uuid' },
        ownerId: { type: 'string', format: 'uuid' },
        vehicleNumber: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['file', 'docType'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadInboundDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentService.upload(dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inbound documents' })
  async findAll(@Query() query: InboundDocumentQueryDto) {
    return this.documentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inbound document by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update inbound document' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInboundDocumentDto,
  ) {
    return this.documentService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inbound document' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.delete(id);
  }
}
