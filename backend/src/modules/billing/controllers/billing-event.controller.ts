import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingEventService } from '../services/billing-event.service';
import { CaptureEventDto, QueryEventDto } from '../dto';
import { AuthGuard, PermissionGuard, Permission, InternalApiGuard } from '../../foundation/auth';

@Controller('api/v1/billing/events')
@UseGuards(AuthGuard, PermissionGuard)
export class BillingEventController {
  constructor(private readonly eventService: BillingEventService) {}

  @Get()
  @Permission('BILLING.EVENT.READ')
  async findMany(@Query() query: QueryEventDto) {
    const result = await this.eventService.findMany(query);
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
  @Permission('BILLING.EVENT.READ')
  async findById(@Param('id') id: string) {
    const event = await this.eventService.findById(id);
    return {
      success: true,
      data: event,
    };
  }
}

@Controller('internal/billing/events')
@UseGuards(InternalApiGuard)
export class BillingEventInternalController {
  constructor(private readonly eventService: BillingEventService) {}

  @Post('capture')
  @HttpCode(HttpStatus.CREATED)
  async capture(@Body() dto: CaptureEventDto) {
    const result = await this.eventService.captureEvent(dto);
    return {
      success: true,
      data: result.data,
      meta: { isReplay: result.isReplay },
    };
  }
}
