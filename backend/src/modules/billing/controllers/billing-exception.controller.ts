import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BillingExceptionService } from '../services/billing-exception.service';
import { ResolveExceptionDto, QueryExceptionDto } from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';

@Controller('api/v1/billing/exceptions')
@UseGuards(AuthGuard, PermissionGuard)
export class BillingExceptionController {
  constructor(private readonly exceptionService: BillingExceptionService) {}

  @Get()
  @Permission('BILLING.EXCEPTION.READ')
  async findMany(@Query() query: QueryExceptionDto) {
    const result = await this.exceptionService.findMany(query);
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

  @Get(':id')
  @Permission('BILLING.EXCEPTION.READ')
  async findById(@Param('id') id: string) {
    const exception = await this.exceptionService.findById(id);
    return {
      success: true,
      data: exception,
    };
  }

  @Put(':id/resolve')
  @Permission('BILLING.EXCEPTION.RESOLVE')
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveExceptionDto,
    @CurrentUser('id') userId: string,
  ) {
    const exception = await this.exceptionService.resolve(id, dto, userId);
    return {
      success: true,
      data: exception,
    };
  }
}
