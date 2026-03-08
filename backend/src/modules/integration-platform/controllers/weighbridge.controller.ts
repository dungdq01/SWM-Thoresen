import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WeighbridgeIngestService } from '../services/weighbridge-ingest.service';
import { WeighbridgeLogService } from '../services/weighbridge-log.service';
import { WeighbridgeDeviceService } from '../services/weighbridge-device.service';
import { CreateWeighEventDto, HeartbeatDto, ReprocessWeighEventDto } from '../dto/weighbridge/create-weigh-event.dto';
import { WeighLogQueryDto } from '../dto/weighbridge/weigh-log-query.dto';

@Controller('api/v1/integration/weighbridge')
export class WeighbridgeController {
  constructor(
    private readonly ingestService: WeighbridgeIngestService,
    private readonly logService: WeighbridgeLogService,
    private readonly deviceService: WeighbridgeDeviceService,
  ) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  async ingestWeighEvent(@Body() dto: CreateWeighEventDto) {
    // In production, get createdBy from auth context
    const createdBy = 'system-agent';
    return this.ingestService.ingestWeighEvent(dto, createdBy);
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
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
  async getLogById(@Param('id') id: string) {
    return this.logService.getLogById(id);
  }

  @Post('events/:id/reprocess')
  @HttpCode(HttpStatus.OK)
  async reprocessCallback(
    @Param('id') id: string,
    @Body() dto: ReprocessWeighEventDto,
  ) {
    // In production, get userId from auth context
    const userId = 'admin-user';
    return this.ingestService.reprocessCallback(id, userId, dto.reasonCode);
  }

  @Get('devices')
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
