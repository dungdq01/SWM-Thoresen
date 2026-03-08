import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BilDayType } from '../domain/billing.enums';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingDayTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(calendarDate: Date, data: Prisma.BilDayTypeCalendarCreateInput) {
    return this.prisma.bilDayTypeCalendar.upsert({
      where: { calendarDate },
      create: data,
      update: {
        dayType: data.dayType,
        defaultOtMultiplier: data.defaultOtMultiplier,
        noOtMultiplier: data.noOtMultiplier,
        withOtMultiplier: data.withOtMultiplier,
        notes: data.notes,
      },
    });
  }

  async findByDate(calendarDate: Date) {
    return this.prisma.bilDayTypeCalendar.findUnique({
      where: { calendarDate },
    });
  }

  async findMany(params: {
    fromDate?: Date;
    toDate?: Date;
    dayType?: BilDayType;
    page?: number;
    limit?: number;
  }) {
    const { fromDate, toDate, dayType, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BilDayTypeCalendarWhereInput = {};
    if (fromDate || toDate) {
      where.calendarDate = {};
      if (fromDate) where.calendarDate.gte = fromDate;
      if (toDate) where.calendarDate.lte = toDate;
    }
    if (dayType) where.dayType = dayType;

    const [data, total] = await Promise.all([
      this.prisma.bilDayTypeCalendar.findMany({
        where,
        skip,
        take: limit,
        orderBy: { calendarDate: 'asc' },
      }),
      this.prisma.bilDayTypeCalendar.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getMultiplier(calendarDate: Date, isOvertime: boolean): Promise<number> {
    const dayType = await this.findByDate(calendarDate);
    if (!dayType) {
      return 1.0;
    }
    return isOvertime
      ? Number(dayType.withOtMultiplier)
      : Number(dayType.noOtMultiplier);
  }

  async getDayType(calendarDate: Date): Promise<BilDayType> {
    const entry = await this.findByDate(calendarDate);
    return entry?.dayType as BilDayType || BilDayType.WORKING_DAY;
  }
}
