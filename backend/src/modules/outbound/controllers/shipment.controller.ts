import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ShipmentService } from '../services/shipment.service';
import { ShipmentCommandService } from '../services/shipment-command.service';
import { ShipmentQueryService } from '../services/shipment-query.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { ShipmentHeaderResponseDto, PaginatedShipmentListDto } from '../dto/shipment-response.dto';

@ApiTags('Outbound - Shipments')
@Controller('api/v1/outbound/shipments')
export class ShipmentController {
  constructor(
    private readonly shipmentService: ShipmentService,
    private readonly commandService: ShipmentCommandService,
    private readonly queryService: ShipmentQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipment' })
  @ApiResponse({ status: 201, description: 'Shipment created', type: ShipmentHeaderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Duplicate external ID' })
  async create(@Body() dto: CreateShipmentDto) {
    return this.commandService.createShipment(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List shipments with pagination and filters' })
  @ApiResponse({ status: 200, type: PaginatedShipmentListDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'shipmentNumber', required: false, type: String })
  @ApiQuery({ name: 'soId', required: false, type: String })
  @ApiQuery({ name: 'vehicleNumber', required: false, type: String })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async list(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('shipmentNumber') shipmentNumber?: string,
    @Query('soId') soId?: string,
    @Query('vehicleNumber') vehicleNumber?: string,
    @Query('ownerId') ownerId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
  ) {
    return this.queryService.list({
      page: page || 1,
      pageSize: pageSize || 20,
      shipmentNumber,
      soId,
      vehicleNumber,
      ownerId,
      warehouseId,
      status: status as any,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ShipmentHeaderResponseDto })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shipment (DRAFT status only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ShipmentHeaderResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot update non-DRAFT shipment' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateShipmentDto>,
  ) {
    return { message: 'Update not implemented in Phase 1' };
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ShipmentHeaderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  async confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.commandService.confirmShipment(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel shipment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ShipmentHeaderResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot cancel shipment in current status' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reasonCode') reasonCode: string,
  ) {
    return this.commandService.cancelShipment(id, reasonCode);
  }
}
