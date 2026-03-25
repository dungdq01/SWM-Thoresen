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
import { UnloadingService } from '../services/unloading.service';

@ApiTags('Inbound - Unloading (Dỡ hàng)')
@Controller('inbound/unloading')
export class UnloadingController {
  constructor(private readonly unloadingService: UnloadingService) {}

  @Get('receipts')
  @ApiOperation({ summary: 'List receipts available for unloading (CONFIRMED + WEIGHING_1 + UNLOADING)' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async getReceiptsForUnloading(
    @Query('warehouseId') warehouseId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.unloadingService.getReceiptsForUnloading({
      warehouseId,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get unloading status for a receipt' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  async getUnloadingStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.unloadingService.getUnloadingStatus(id);
  }

  @Get(':id/locations-available')
  @ApiOperation({ summary: 'Get available storage locations in the receipt warehouse' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  async getAvailableLocations(@Param('id', ParseUUIDPipe) id: string) {
    const status = await this.unloadingService.getUnloadingStatus(id);
    return this.unloadingService.getAvailableLocations(status.warehouse.id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start unloading — transition to UNLOADING status' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  async startUnloading(@Param('id', ParseUUIDPipe) id: string) {
    return this.unloadingService.startUnloading(id);
  }

  @Post(':id/unload-item')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an item as unloaded to a location' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  async unloadItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('receiptLineId') receiptLineId: string,
    @Body('locationId') locationId?: string,
  ) {
    return this.unloadingService.unloadItem(id, receiptLineId, locationId);
  }

  @Post(':id/undo-unload-item')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Undo — mark item as not unloaded' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  async undoUnloadItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('receiptLineId') receiptLineId: string,
  ) {
    return this.unloadingService.undoUnloadItem(id, receiptLineId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete unloading — all items unloaded' })
  @ApiParam({ name: 'id', description: 'Receipt ID' })
  async completeUnloading(@Param('id', ParseUUIDPipe) id: string) {
    return this.unloadingService.completeUnloading(id);
  }
}
