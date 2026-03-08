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
import { AuthGuard } from '../../foundation/auth/auth.guard';

@Controller('api/v1/billing/events')
@UseGuards(AuthGuard)
export class BillingEventController {
  constructor(private readonly eventService: BillingEventService) {}

  @Get()
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
  async findById(@Param('id') id: string) {
    const event = await this.eventService.findById(id);
    return {
      success: true,
      data: event,
    };
  }
}

@Controller('internal/billing/events')
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
