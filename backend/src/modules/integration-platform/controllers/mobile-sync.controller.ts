import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MobileSyncBatchService, SubmitBatchParams } from '../services/mobile-sync-batch.service';
import { MobileSyncDispatchService } from '../services/mobile-sync-dispatch.service';

class SubmitBatchDto {
  batchId!: string;
  deviceId!: string;
  keeperUserId!: string;
  appVersion?: string;
  correlationId!: string;
  events!: Array<{
    eventExternalId: string;
    eventType: string;
    workId?: string;
    workLineId?: string;
    sourceModule: string;
    deviceEventTime: string;
    sequenceNo: number;
    payload: Record<string, unknown>;
  }>;
}

class ReplayEventDto {
  reason?: string;
}

@Controller('api/v1/integration/mobile-sync')
export class MobileSyncController {
  constructor(
    private readonly batchService: MobileSyncBatchService,
    private readonly dispatchService: MobileSyncDispatchService,
  ) {}

  @Post('batches')
  async submitBatch(@Body() dto: SubmitBatchDto) {
    return this.batchService.submitBatch(dto);
  }

  @Get('batches')
  async getBatches(
    @Query('deviceId') deviceId?: string,
    @Query('keeperUserId') keeperUserId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.batchService.getBatches({
      deviceId,
      keeperUserId,
      status,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('batches/:id')
  async getBatchById(@Param('id') id: string) {
    return this.batchService.getBatchById(id);
  }

  @Get('events/:id')
  async getEventById(@Param('id') id: string) {
    return this.batchService.getEventById(id);
  }

  @Post('events/:id/replay')
  @HttpCode(HttpStatus.OK)
  async replayEvent(@Param('id') id: string, @Body() dto: ReplayEventDto) {
    const userId = 'admin'; // In production, from auth context
    return this.dispatchService.replayEvent(id, userId);
  }
}
