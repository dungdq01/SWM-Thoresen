import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class WorkExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const { status, workType, warehouseId, assignedTo } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (status) where.status = status;
    if (workType) where.workType = workType;
    if (warehouseId) where.warehouseId = warehouseId;
    if (assignedTo) where.assignedTo = assignedTo;

    const [data, total] = await Promise.all([
      this.prisma.weWorkHeader.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { lines: true },
      }),
      this.prisma.weWorkHeader.count({ where }),
    ]);

    return {
      data: data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.weWorkHeader.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!record) throw new NotFoundException('Work not found');
    return { data: record };
  }

  async claimWork(id: string, userId: string) {
    const record = await this.prisma.weWorkHeader.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Work not found');

    if (record.status !== 'OPEN') {
      throw new Error(`Cannot claim work with status ${record.status}`);
    }

    const updated = await this.prisma.weWorkHeader.update({
      where: { id },
      data: {
        assignedTo: userId,
        assignedAt: new Date(),
        updatedBy: userId,
      },
      include: { lines: true },
    });

    return updated;
  }

  async releaseWork(id: string, userId: string) {
    const record = await this.prisma.weWorkHeader.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Work not found');

    if (record.assignedTo !== userId) {
      throw new Error('You can only release work assigned to you');
    }

    const updated = await this.prisma.weWorkHeader.update({
      where: { id },
      data: {
        assignedTo: null,
        assignedAt: null,
        updatedBy: userId,
      },
      include: { lines: true },
    });

    return updated;
  }

  async startWork(id: string, userId: string) {
    const record = await this.prisma.weWorkHeader.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Work not found');

    if (record.status !== 'OPEN' || record.assignedTo !== userId) {
      throw new Error('Cannot start this work');
    }

    const updated = await this.prisma.weWorkHeader.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        updatedBy: userId,
      },
      include: { lines: true },
    });

    return updated;
  }

  async cancelWork(id: string, userId: string, reasonCode?: string) {
    const record = await this.prisma.weWorkHeader.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Work not found');

    if (!['OPEN', 'IN_PROGRESS'].includes(record.status)) {
      throw new Error(`Cannot cancel work with status ${record.status}`);
    }

    const updated = await this.prisma.weWorkHeader.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReasonCode: reasonCode,
        updatedBy: userId,
      },
      include: { lines: true },
    });

    return updated;
  }

  async completeLine(workId: string, lineNum: number, userId: string, data: { actualQty: number; scannedLocation?: string }) {
    const header = await this.prisma.weWorkHeader.findUnique({
      where: { id: workId },
      include: { lines: true },
    });
    if (!header) throw new NotFoundException('Work not found');

    const line = header.lines.find(l => l.lineNum === lineNum);
    if (!line) throw new NotFoundException('Work line not found');

    if (!['OPEN', 'IN_PROGRESS'].includes(line.status)) {
      throw new Error(`Cannot complete line with status ${line.status}`);
    }

    const updatedLine = await this.prisma.weWorkLine.update({
      where: { id: line.id },
      data: {
        status: 'COMPLETED',
        actualQty: data.actualQty,
        scannedLocationCode: data.scannedLocation,
        completedAt: new Date(),
        completedBy: userId,
      },
    });

    // Check if all lines are completed
    const allLinesCompleted = header.lines.every(l => 
      l.id === line.id ? true : l.status === 'COMPLETED' || l.status === 'SKIPPED'
    );

    if (allLinesCompleted) {
      await this.prisma.weWorkHeader.update({
        where: { id: workId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedBy: userId,
        },
      });
    }

    return updatedLine;
  }

  async skipLine(workId: string, lineNum: number, userId: string, data: { reasonCode?: string }) {
    const header = await this.prisma.weWorkHeader.findUnique({
      where: { id: workId },
      include: { lines: true },
    });
    if (!header) throw new NotFoundException('Work not found');

    const line = header.lines.find(l => l.lineNum === lineNum);
    if (!line) throw new NotFoundException('Work line not found');

    if (!['OPEN', 'IN_PROGRESS'].includes(line.status)) {
      throw new Error(`Cannot skip line with status ${line.status}`);
    }

    const updatedLine = await this.prisma.weWorkLine.update({
      where: { id: line.id },
      data: {
        status: 'SKIPPED',
        reasonCode: data.reasonCode,
        completedAt: new Date(),
        completedBy: userId,
      },
    });

    // Check if all lines are completed/skipped
    const allLinesDone = header.lines.every(l => 
      l.id === line.id ? true : l.status === 'COMPLETED' || l.status === 'SKIPPED'
    );

    if (allLinesDone) {
      await this.prisma.weWorkHeader.update({
        where: { id: workId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedBy: userId,
        },
      });
    }

    return updatedLine;
  }

  async getWorkHistory(id: string) {
    const record = await this.prisma.weWorkHeader.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Work not found');

    const events = await this.prisma.weWorkEventLog.findMany({
      where: { workHeaderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { data: events };
  }

  async getWorkExceptions(id: string) {
    const record = await this.prisma.weWorkHeader.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Work not found');

    const exceptions = await this.prisma.weWorkException.findMany({
      where: { workHeaderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { data: exceptions };
  }

  async getMyWorks(userId: string, query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    // Include COMPLETED tasks so user can review their work
    const where: any = {
      assignedTo: userId,
      status: { in: ['OPEN', 'IN_PROGRESS', 'COMPLETED'] },
    };

    const [data, total] = await Promise.all([
      this.prisma.weWorkHeader.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { lines: true },
      }),
      this.prisma.weWorkHeader.count({ where }),
    ]);

    return {
      data: data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getDashboardSummary(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const [openCount, inProgressCount, completedTodayCount, exceptionCount] = await Promise.all([
      this.prisma.weWorkHeader.count({ where: { ...where, status: 'OPEN' } }),
      this.prisma.weWorkHeader.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.weWorkHeader.count({
        where: {
          ...where,
          status: 'COMPLETED',
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.weWorkException.count({
        where: {
          resolvedAt: null,
          ...(warehouseId ? { header: { warehouseId } } : {}),
        },
      }),
    ]);

    const byType = await this.prisma.weWorkHeader.groupBy({
      by: ['workType'],
      where: { ...where, status: 'OPEN' },
      _count: true,
    });

    const openByType = byType.reduce((acc: any, item: any) => {
      acc[item.workType] = item._count;
      return acc;
    }, {});

    return {
      data: {
        totalOpen: openCount,
        totalInProgress: inProgressCount,
        totalCompleted: completedTodayCount,
        exceptionsOpen: exceptionCount,
        pickOpen: openByType['PICK'] || 0,
        putawayOpen: openByType['PUTAWAY'] || 0,
        moveOpen: openByType['MOVE'] || 0,
        transferPickOpen: openByType['TRANSFER_PICK'] || 0,
        transferPutOpen: openByType['TRANSFER_PUT'] || 0,
      },
    };
  }

  async getMonitorData(query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const { warehouseId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    };
    if (warehouseId) where.warehouseId = warehouseId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [data, total, openCount, inProgressCount, completedTodayCount, exceptionCount, byType] = await Promise.all([
      this.prisma.weWorkHeader.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { lines: true },
      }),
      this.prisma.weWorkHeader.count({ where }),
      this.prisma.weWorkHeader.count({ where: { ...where, status: 'OPEN' } }),
      this.prisma.weWorkHeader.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.weWorkHeader.count({
        where: {
          ...(warehouseId ? { warehouseId } : {}),
          status: 'COMPLETED',
          completedAt: { gte: today },
        },
      }),
      this.prisma.weWorkException.count({
        where: {
          resolvedAt: null,
          ...(warehouseId ? { header: { warehouseId } } : {}),
        },
      }),
      this.prisma.weWorkHeader.groupBy({
        by: ['workType'],
        where: { ...(warehouseId ? { warehouseId } : {}), status: 'OPEN' },
        _count: true,
      }),
    ]);

    return {
      data: data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      summary: {
        open: openCount,
        inProgress: inProgressCount,
        completedToday: completedTodayCount,
        exceptions: exceptionCount,
      },
      openByType: byType.reduce((acc: any, item: any) => {
        acc[item.workType] = item._count;
        return acc;
      }, {}),
    };
  }
}
