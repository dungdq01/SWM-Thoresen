import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WeighingService, RecordTareParams, RecordGrossParams } from '../services/weighing.service';
import { ShipmentQueryService } from '../services/shipment-query.service';

class RecordTareDto {
  rawWeightKg: number;
  sourceMode: 'SCALE_AGENT' | 'MANUAL';
  scaleTicketNo?: string;
  externalEventId?: string;
  reasonCode?: string;
}

class RecordGrossDto {
  lineId: string;
  rawWeightKg: number;
  sourceMode: 'SCALE_AGENT' | 'MANUAL';
  scaleTicketNo?: string;
  externalEventId?: string;
  reasonCode?: string;
}

@ApiTags('Outbound - Weighing')
@Controller('api/v1/outbound/shipments')
export class WeighingController {
  constructor(
    private readonly weighingService: WeighingService,
    private readonly queryService: ShipmentQueryService,
  ) {}

  @Post(':id/weigh/tare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record tare weight for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Tare weight recorded' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async recordTare(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordTareDto,
  ) {
    return this.weighingService.recordTare({
      shipmentId: id,
      ...dto,
    });
  }

  @Post(':id/weigh/gross')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record gross weight for shipment line' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Gross weight recorded with tolerance result' })
  @ApiResponse({ status: 400, description: 'Must record tare first' })
  async recordGross(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordGrossDto,
  ) {
    return this.weighingService.recordGross({
      shipmentId: id,
      lineId: dto.lineId,
      rawWeightKg: dto.rawWeightKg,
      sourceMode: dto.sourceMode,
      scaleTicketNo: dto.scaleTicketNo,
      externalEventId: dto.externalEventId,
      reasonCode: dto.reasonCode,
    });
  }

  @Get(':id/weighing-history')
  @ApiOperation({ summary: 'View weighing history for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'List of weighing attempts' })
  async getWeighingHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getWeighingHistory(id);
  }
}
