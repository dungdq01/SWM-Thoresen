import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class OcrConfirmedSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOcrResultId(ocrResultId: string) {
    return this.prisma.m8OcrConfirmedSnapshot.findUnique({
      where: { ocrResultId },
    });
  }

  async create(data: any) {
    return this.prisma.m8OcrConfirmedSnapshot.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.m8OcrConfirmedSnapshot.update({ where: { id }, data });
  }

  async upsertByOcrResultId(ocrResultId: string, data: any) {
    return this.prisma.m8OcrConfirmedSnapshot.upsert({
      where: { ocrResultId },
      update: data,
      create: { ocrResultId, ...data },
    });
  }
}
