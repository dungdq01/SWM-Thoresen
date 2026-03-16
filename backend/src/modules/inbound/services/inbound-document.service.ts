import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  UploadInboundDocumentDto,
  InboundDocumentQueryDto,
  UpdateInboundDocumentDto,
} from '../dto/inbound-document.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InboundDocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDocumentCode(): Promise<string> {
    const today = new Date();
    const datePrefix = `DOC${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    const lastDoc = await this.prisma.inboundDocument.findFirst({
      where: {
        documentCode: {
          startsWith: datePrefix,
        },
      },
      orderBy: {
        documentCode: 'desc',
      },
    });

    let sequence = 1;
    if (lastDoc) {
      const lastSequence = parseInt(lastDoc.documentCode.slice(-4), 10);
      sequence = lastSequence + 1;
    }

    return `${datePrefix}${String(sequence).padStart(4, '0')}`;
  }

  async upload(
    dto: UploadInboundDocumentDto,
    file: { originalname: string; path: string; size: number; mimetype: string },
    userId?: string,
  ) {
    const documentCode = await this.generateDocumentCode();

    const document = await this.prisma.inboundDocument.create({
      data: {
        id: uuidv4(),
        documentCode,
        receiptHeaderId: dto.receiptHeaderId || null,
        docType: dto.docType,
        ownerId: dto.ownerId || null,
        vehicleNumber: dto.vehicleNumber || null,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        notes: dto.notes || null,
        status: 'DRAFT',
        uploadedBy: userId || null,
      },
      include: {
        receiptHeader: {
          select: {
            id: true,
            receiptNumber: true,
            vehicleNumber: true,
          },
        },
        owner: {
          select: {
            id: true,
            ownerCode: true,
            ownerName: true,
          },
        },
      },
    });

    return document;
  }

  async findAll(query: InboundDocumentQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.receiptHeaderId) {
      where.receiptHeaderId = query.receiptHeaderId;
    }
    if (query.ownerId) {
      where.ownerId = query.ownerId;
    }
    if (query.docType) {
      where.docType = query.docType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.keyword) {
      where.OR = [
        { documentCode: { contains: query.keyword, mode: 'insensitive' } },
        { fileName: { contains: query.keyword, mode: 'insensitive' } },
        { vehicleNumber: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.inboundDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { uploadedAt: 'desc' },
        include: {
          receiptHeader: {
            select: {
              id: true,
              receiptNumber: true,
              asnId: true,
              vehicleNumber: true,
            },
          },
          owner: {
            select: {
              id: true,
              ownerCode: true,
              ownerName: true,
            },
          },
        },
      }),
      this.prisma.inboundDocument.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.inboundDocument.findUnique({
      where: { id },
      include: {
        receiptHeader: {
          select: {
            id: true,
            receiptNumber: true,
            asnId: true,
            vehicleNumber: true,
            ownerId: true,
            owner: {
              select: {
                ownerCode: true,
                ownerName: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            ownerCode: true,
            ownerName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async update(id: string, dto: UpdateInboundDocumentDto) {
    const existing = await this.prisma.inboundDocument.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return this.prisma.inboundDocument.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
      },
      include: {
        receiptHeader: {
          select: {
            id: true,
            receiptNumber: true,
            asnId: true,
          },
        },
        owner: {
          select: {
            id: true,
            ownerCode: true,
            ownerName: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.inboundDocument.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT documents can be deleted');
    }

    await this.prisma.inboundDocument.delete({
      where: { id },
    });

    return { success: true, message: 'Document deleted successfully' };
  }
}
