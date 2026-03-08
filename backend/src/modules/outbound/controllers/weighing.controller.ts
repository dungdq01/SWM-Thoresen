import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WeighingService, RecordTareParams, RecordGrossParams } from '../services/weighing.service';
import { ShipmentQueryService } from '../services/shipment-query.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

class RecordTareDto {
  rawWeightKg!: number;
  sourceMode!: 'SCALE_AGENT' | 'MANUAL';
  scaleTicketNo?: string;
  externalEventId?: string;
  reasonCode?: string;
}

class RecordGrossDto {
  lineId!: string;
  rawWeightKg!: number;
  sourceMode!: 'SCALE_AGENT' | 'MANUAL';
  scaleTicketNo?: string;
  externalEventId?: string;
  reasonCode?: string;
}

@ApiTags('Outbound - Weighing')
@Controller('api/v1/outbound/shipments')
@UseGuards(AuthGuard, PermissionGuard)
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
  @Permission('OUTBOUND.WEIGH.RECEIVE')
  async recordTare(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordTareDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.weighingService.recordTare({
      shipmentId: id,
      ...dto,
      capturedBy: user.id,
    });
  }

  @Post(':id/weigh/gross')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record gross weight for shipment line' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Gross weight recorded with tolerance result' })
  @ApiResponse({ status: 400, description: 'Must record tare first' })
  @Permission('OUTBOUND.WEIGH.RECEIVE')
  async recordGross(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordGrossDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.weighingService.recordGross({
      shipmentId: id,
      lineId: dto.lineId,
      rawWeightKg: dto.rawWeightKg,
      sourceMode: dto.sourceMode,
      scaleTicketNo: dto.scaleTicketNo,
      externalEventId: dto.externalEventId,
      reasonCode: dto.reasonCode,
      capturedBy: user.id,
    });
  }

  @Get(':id/weighing-history')
  @ApiOperation({ summary: 'View weighing history for shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'List of weighing attempts' })
  @Permission('OUTBOUND.SHIPMENT.READ')
  async getWeighingHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getWeighingHistory(id);
  }
}
