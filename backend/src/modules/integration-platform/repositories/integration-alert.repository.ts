import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class IntegrationAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.m8IntegrationAlert.findUnique({ where: { id } });
  }

  async findMany(params: {
    alertSource?: string;
    severity?: string;
    status?: string;
    warehouseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    skip?: number;
    take?: number;
  }) {
    const { alertSource, severity, status, warehouseId, dateFrom, dateTo, skip = 0, take = 20 } = params;
    const where: any = {};

    if (alertSource) where.alertSource = alertSource;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    if (dateFrom || dateTo) {
      where.firstRaisedAt = {};
      if (dateFrom) where.firstRaisedAt.gte = dateFrom;
      if (dateTo) where.firstRaisedAt.lte = dateTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.m8IntegrationAlert.findMany({
        where,
        skip,
        take,
        orderBy: [{ severity: 'desc' }, { lastSeenAt: 'desc' }],
      }),
      this.prisma.m8IntegrationAlert.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async create(data: any) {
    return this.prisma.m8IntegrationAlert.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.m8IntegrationAlert.update({ where: { id }, data });
  }

  async acknowledge(id: string, acknowledgedBy: string) {
    return this.prisma.m8IntegrationAlert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolve(id: string, resolvedBy: string, resolutionNote: string) {
    return this.prisma.m8IntegrationAlert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNote,
      },
    });
  }

  async findOpenAlerts() {
    return this.prisma.m8IntegrationAlert.findMany({
      where: { status: 'OPEN' },
      orderBy: [{ severity: 'desc' }, { lastSeenAt: 'desc' }],
    });
  }

  async findCriticalAlerts() {
    return this.prisma.m8IntegrationAlert.findMany({
      where: { status: 'OPEN', severity: 'CRITICAL' },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async countByStatusAndSeverity() {
    const result = await this.prisma.m8IntegrationAlert.groupBy({
      by: ['status', 'severity'],
      _count: { id: true },
    });
    return result;
  }

  async countOpenBySource() {
    const result = await this.prisma.m8IntegrationAlert.groupBy({
      by: ['alertSource'],
      where: { status: 'OPEN' },
      _count: { id: true },
    });
    return result;
  }

  async upsertAlert(alertCode: string, alertSource: string, sourceRefId: string, data: any) {
    return this.prisma.m8IntegrationAlert.upsert({
      where: {
        // Using a composite approach - find by source ref
        id: data.id || 'new',
      },
      update: {
        lastSeenAt: new Date(),
        ...data,
      },
      create: {
        alertCode,
        alertSource,
        sourceRefId,
        ...data,
      },
    });
  }
}
