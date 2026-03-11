import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { MobileSyncBatchService, SubmitBatchParams } from '../services/mobile-sync-batch.service';
import { MobileSyncDispatchService } from '../services/mobile-sync-dispatch.service';

class SyncEventDto {
  @IsString()
  eventExternalId!: string;

  @IsString()
  eventType!: string;

  @IsOptional()
  @IsUUID()
  workId?: string;

  @IsOptional()
  @IsUUID()
  workLineId?: string;

  @IsString()
  sourceModule!: string;

  @IsString()
  deviceEventTime!: string;

  @IsNumber()
  sequenceNo!: number;

  payload!: Record<string, unknown>;
}

class SubmitBatchDto {
  @IsString()
  batchId!: string;

  @IsString()
  deviceId!: string;

  @IsUUID()
  keeperUserId!: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsUUID()
  correlationId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
  events!: SyncEventDto[];
}

class ReplayEventDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('integration/mobile-sync')
@UseGuards(AuthGuard, PermissionGuard)
export class MobileSyncController {
  constructor(
    private readonly batchService: MobileSyncBatchService,
    private readonly dispatchService: MobileSyncDispatchService,
  ) {}

  @Post('batches')
  @Permission('INTEGRATION.MOBILE_SYNC.SUBMIT')
  async submitBatch(@Body() dto: SubmitBatchDto) {
    return this.batchService.submitBatch(dto);
  }

  @Get('batches')
  @Permission('INTEGRATION.MOBILE_SYNC.READ')
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
  @Permission('INTEGRATION.MOBILE_SYNC.READ')
  async getBatchById(@Param('id') id: string) {
    return this.batchService.getBatchById(id);
  }

  @Get('events/:id')
  @Permission('INTEGRATION.MOBILE_SYNC.READ')
  async getEventById(@Param('id') id: string) {
    return this.batchService.getEventById(id);
  }

  @Post('events/:id/replay')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.MOBILE_SYNC.REPLAY')
  async replayEvent(@Param('id') id: string, @Body() dto: ReplayEventDto, @CurrentUser() user: RequestUser) {
    return this.dispatchService.replayEvent(id, user.id);
  }
}
