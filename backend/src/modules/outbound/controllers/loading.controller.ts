import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LoadingService } from '../services/loading.service';

@ApiTags('Outbound - Loading (Xếp hàng)')
@Controller('outbound/loading')
export class LoadingController {
  constructor(private readonly loadingService: LoadingService) {}

  @Get('shipments')
  @ApiOperation({ summary: 'List shipments available for loading (CONFIRMED + LOADING)' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async getShipmentsForLoading(
    @Query('warehouseId') warehouseId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.loadingService.getShipmentsForLoading({
      warehouseId,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get loading status for a shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  async getLoadingStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.loadingService.getLoadingStatus(id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start loading — transition to LOADING status' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  async startLoading(@Param('id', ParseUUIDPipe) id: string) {
    return this.loadingService.startLoading(id);
  }

  @Get(':id/locations-with-stock')
  @ApiOperation({ summary: 'Get locations with available stock for an item in the shipment warehouse' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiQuery({ name: 'itemId', required: true })
  async getLocationsWithStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('itemId') itemId: string,
  ) {
    // Get warehouse from shipment
    const status = await this.loadingService.getLoadingStatus(id);
    return this.loadingService.getLocationsWithStock(status.warehouse.id, itemId);
  }

  @Post(':id/load-item')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an item as loaded onto vehicle' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  async loadItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('shipmentLineId') shipmentLineId: string,
    @Body('locationId') locationId?: string,
  ) {
    return this.loadingService.loadItem(id, shipmentLineId, locationId);
  }

  @Post(':id/unload-item')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Undo — mark item as not loaded' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  async unloadItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('shipmentLineId') shipmentLineId: string,
  ) {
    return this.loadingService.unloadItem(id, shipmentLineId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete loading — all items loaded' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  async completeLoading(@Param('id', ParseUUIDPipe) id: string) {
    return this.loadingService.completeLoading(id);
  }
}
