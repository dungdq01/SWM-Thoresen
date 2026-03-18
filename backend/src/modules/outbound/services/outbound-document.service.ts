import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface OutboundDocumentQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  docType?: string;
  ownerId?: string;
}

@Injectable()
export class OutboundDocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: OutboundDocumentQueryParams) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.keyword) {
      where.OR = [
        { documentCode: { contains: query.keyword, mode: 'insensitive' } },
        { fileName: { contains: query.keyword, mode: 'insensitive' } },
        { vehicleNumber: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.docType) where.docType = query.docType;
    if (query.ownerId) where.ownerId = query.ownerId;

    const [items, total] = await Promise.all([
      this.prisma.outboundDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          shipmentHeader: {
            select: {
              id: true,
              shipmentNumber: true,
              soId: true,
              vehicleNumber: true,
              status: true,
            },
          },
          owner: {
            select: { id: true, ownerCode: true, ownerName: true },
          },
        },
      }),
      this.prisma.outboundDocument.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
