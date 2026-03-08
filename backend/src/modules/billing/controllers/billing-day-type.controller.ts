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
import { AuthGuard } from '../../foundation/auth/auth.guard';

@Controller('api/v1/billing/day-types')
@UseGuards(AuthGuard)
export class BillingDayTypeController {
  constructor(private readonly dayTypeService: BillingDayTypeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async upsert(@Body() dto: UpsertDayTypeDto) {
    const result = await this.dayTypeService.upsert(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkUpsert(@Body() entries: UpsertDayTypeDto[]) {
    const results = await this.dayTypeService.bulkUpsert(entries);
    return {
      success: true,
      data: results,
      meta: { count: results.length },
    };
  }

  @Get()
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
