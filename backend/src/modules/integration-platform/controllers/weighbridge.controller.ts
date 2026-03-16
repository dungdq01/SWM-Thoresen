import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { WeighbridgeIngestService } from '../services/weighbridge-ingest.service';
import { WeighbridgeLogService } from '../services/weighbridge-log.service';
import { WeighbridgeDeviceService } from '../services/weighbridge-device.service';
import { CreateWeighEventDto, HeartbeatDto, ReprocessWeighEventDto, UpdateWeighLogDto, RecordWeightDto } from '../dto/weighbridge/create-weigh-event.dto';
import { WeighLogQueryDto } from '../dto/weighbridge/weigh-log-query.dto';

@Controller('integration/weighbridge')
@UseGuards(AuthGuard, PermissionGuard)
export class WeighbridgeController {
  constructor(
    private readonly ingestService: WeighbridgeIngestService,
    private readonly logService: WeighbridgeLogService,
    private readonly deviceService: WeighbridgeDeviceService,
  ) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.WEIGHBRIDGE.INGEST')
  async ingestWeighEvent(@Body() dto: CreateWeighEventDto, @CurrentUser() user: RequestUser) {
    return this.ingestService.ingestWeighEvent(dto, user.id);
  }

  @Post('events/manual')
  @HttpCode(HttpStatus.CREATED)
  @Permission('INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE')
  async createManualWeighEvent(@Body() dto: CreateWeighEventDto, @CurrentUser() user: RequestUser) {
    return this.ingestService.createManualWeighEvent(dto, user.id);
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.WEIGHBRIDGE_DEVICE.HEARTBEAT')
  async heartbeat(@Body() dto: HeartbeatDto) {
    return this.deviceService.processHeartbeat({
      deviceCode: dto.deviceCode,
      agentVersion: dto.agentVersion,
      portName: dto.portName,
      lastWeightReadAt: dto.lastWeightReadAt ? new Date(dto.lastWeightReadAt) : undefined,
      bufferPendingCount: dto.bufferPendingCount,
      healthStatus: dto.healthStatus,
    });
  }

  @Get('logs')
  @Permission('INTEGRATION.WEIGHBRIDGE.READ')
  async getLogs(@Query() query: WeighLogQueryDto) {
    return this.logService.getLogs({
      scaleDeviceId: query.scaleDeviceId,
      vehicleNumber: query.vehicleNumber,
      referenceType: query.referenceType,
      referenceId: query.referenceId,
      weighingType: query.weighingType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isManualEntry: query.isManualEntry,
      sourceChannel: query.sourceChannel,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('logs/:id')
  @Permission('INTEGRATION.WEIGHBRIDGE.READ')
  async getLogById(@Param('id') id: string) {
    return this.logService.getLogById(id);
  }

  @Post('events/:id/reprocess')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.WEIGHBRIDGE.REPROCESS')
  async reprocessCallback(
    @Param('id') id: string,
    @Body() dto: ReprocessWeighEventDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ingestService.reprocessCallback(id, user.id, dto.reasonCode);
  }

  @Patch('logs/:id')
  @Permission('INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE')
  async updateLog(@Param('id') id: string, @Body() dto: UpdateWeighLogDto) {
    return this.logService.updateLog(id, { notes: dto.notes });
  }

  @Post('logs/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE')
  async confirmLog(@Param('id') id: string) {
    return this.logService.confirmLog(id);
  }

  @Post('logs/:id/reject')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE')
  async rejectLog(@Param('id') id: string, @Body() dto: ReprocessWeighEventDto) {
    return this.logService.rejectLog(id, dto.reasonCode);
  }

  @Post('logs/:id/record-weight')
  @HttpCode(HttpStatus.OK)
  @Permission('INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE')
  async recordWeight(@Param('id') id: string, @Body() dto: RecordWeightDto) {
    return this.logService.recordWeight(id, dto);
  }

  @Get('devices')
  @Permission('INTEGRATION.WEIGHBRIDGE_DEVICE.READ')
  async getDevices(
    @Query('warehouseId') warehouseId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deviceService.getDevices({
      warehouseId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
