import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingDayTypeService } from '../services/billing-day-type.service';
import { UpsertDayTypeDto, QueryDayTypeDto } from '../dto';
import { AuthGuard, PermissionGuard, Permission } from '../../foundation/auth';

@Controller('billing/day-types')
@UseGuards(AuthGuard, PermissionGuard)
export class BillingDayTypeController {
  constructor(private readonly dayTypeService: BillingDayTypeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Permission('BILLING.DAY_TYPE.MANAGE')
  async upsert(@Body() dto: UpsertDayTypeDto) {
    const result = await this.dayTypeService.upsert(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @Permission('BILLING.DAY_TYPE.MANAGE')
  async bulkUpsert(@Body() entries: UpsertDayTypeDto[]) {
    const results = await this.dayTypeService.bulkUpsert(entries);
    return {
      success: true,
      data: results,
      meta: { count: results.length },
    };
  }

  @Get()
  @Permission('BILLING.DAY_TYPE.MANAGE')
  async findMany(@Query() query: QueryDayTypeDto) {
    const result = await this.dayTypeService.findMany(query);
    return {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  }
}
