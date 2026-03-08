import { Injectable, Logger } from '@nestjs/common';
import { BillingDayTypeRepository } from '../repositories/billing-day-type.repository';
import { UpsertDayTypeDto, QueryDayTypeDto } from '../dto';
import { BilDayType } from '../domain/billing.enums';

@Injectable()
export class BillingDayTypeService {
  private readonly logger = new Logger(BillingDayTypeService.name);

  constructor(private readonly dayTypeRepo: BillingDayTypeRepository) {}

  async upsert(dto: UpsertDayTypeDto) {
    const calendarDate = new Date(dto.calendarDate);
    
    return this.dayTypeRepo.upsert(calendarDate, {
      calendarDate,
      dayType: dto.dayType,
      defaultOtMultiplier: dto.defaultOtMultiplier,
      noOtMultiplier: dto.noOtMultiplier,
      withOtMultiplier: dto.withOtMultiplier,
      notes: dto.notes,
    });
  }

  async findMany(query: QueryDayTypeDto) {
    return this.dayTypeRepo.findMany({
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      dayType: query.dayType,
      page: query.page,
      limit: query.limit,
    });
  }

  async getMultiplier(date: Date, isOvertime: boolean): Promise<number> {
    return this.dayTypeRepo.getMultiplier(date, isOvertime);
  }

  async getDayType(date: Date): Promise<BilDayType> {
    return this.dayTypeRepo.getDayType(date);
  }

  async bulkUpsert(entries: UpsertDayTypeDto[]) {
    const results = [];
    for (const entry of entries) {
      const result = await this.upsert(entry);
      results.push(result);
    }
    return results;
  }
}
