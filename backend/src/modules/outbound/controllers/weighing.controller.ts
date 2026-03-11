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
import { IsNumber, IsString, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';
import { ReceiveOutboundWeightUseCase } from '../application/receiveOutboundWeight.usecase';
import { ShipmentQueryService } from '../services/shipment-query.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

class RecordTareDto {
  @IsNumber()
  @Min(0)
  rawWeightKg!: number;

  @IsEnum(['SCALE_AGENT', 'MANUAL'])
  sourceMode!: 'SCALE_AGENT' | 'MANUAL';

  @IsOptional()
  @IsString()
  scaleTicketNo?: string;

  @IsOptional()
  @IsString()
  externalEventId?: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;
}

class RecordGrossDto {
  @IsUUID()
  lineId!: string;

  @IsNumber()
  @Min(0)
  rawWeightKg!: number;

  @IsEnum(['SCALE_AGENT', 'MANUAL'])
  sourceMode!: 'SCALE_AGENT' | 'MANUAL';

  @IsOptional()
  @IsString()
  scaleTicketNo?: string;

  @IsOptional()
  @IsString()
  externalEventId?: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;
}

@ApiTags('Outbound - Weighing')
@Controller('outbound/shipments')
@UseGuards(AuthGuard, PermissionGuard)
export class WeighingController {
  constructor(
    private readonly receiveWeightUseCase: ReceiveOutboundWeightUseCase,
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
    return this.receiveWeightUseCase.recordTare({
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
    return this.receiveWeightUseCase.recordGross({
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
