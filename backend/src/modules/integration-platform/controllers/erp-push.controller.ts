import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ErpPushService, EnqueuePushJobParams } from '../services/erp-push.service';

class EnqueuePushJobDto {
  pushType!: string;
  referenceId!: string;
  payload!: Record<string, unknown>;
  correlationId!: string;
  endpointName?: string;
}

class RetryJobDto {
  reason?: string;
}

class CancelJobDto {
  reason!: string;
}

@Controller('api/v1/integration/erp-push')
export class ErpPushController {
  constructor(private readonly pushService: ErpPushService) {}

  @Post('jobs')
  async enqueueJob(@Body() dto: EnqueuePushJobDto) {
    return this.pushService.enqueuePushJob(dto);
  }

  @Get('jobs')
  async getJobs(
    @Query('pushType') pushType?: string,
    @Query('status') status?: string,
    @Query('referenceId') referenceId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pushService.getJobs({
      pushType,
      status,
      referenceId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('jobs/:id')
  async getJobById(@Param('id') id: string) {
    return this.pushService.getJobById(id);
  }

  @Post('jobs/:id/retry')
  @HttpCode(HttpStatus.OK)
  async retryJob(@Param('id') id: string, @Body() dto: RetryJobDto) {
    const userId = 'admin'; // In production, from auth context
    return this.pushService.retryJob(id, userId);
  }

  @Post('jobs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Param('id') id: string, @Body() dto: CancelJobDto) {
    const userId = 'admin'; // In production, from auth context
    return this.pushService.cancelJob(id, userId, dto.reason);
  }
}
