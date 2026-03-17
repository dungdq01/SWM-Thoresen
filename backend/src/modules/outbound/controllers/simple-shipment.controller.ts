import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import { SimpleShipmentService, CreateShipmentFromSoDto, ShipmentQueryParams } from '../services/simple-shipment.service';

@Controller('outbound/shipments')
export class SimpleShipmentController {
  constructor(private readonly shipmentService: SimpleShipmentService) {}

  @Post()
  async create(
    @Body() dto: CreateShipmentFromSoDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.shipmentService.create(dto, userId);
  }

  @Get()
  async findAll(@Query() query: ShipmentQueryParams) {
    return this.shipmentService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.shipmentService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateShipmentFromSoDto>,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.shipmentService.update(id, dto, userId);
  }

  @Post(':id/confirm')
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.shipmentService.confirm(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.shipmentService.delete(id);
  }

  @Post(':id/report-error')
  async reportError(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reasonCode') reasonCode: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.shipmentService.reportError(id, reasonCode || 'ERROR', userId);
  }
}
