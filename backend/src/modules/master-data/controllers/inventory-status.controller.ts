import { Controller, Get, Put, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { InventoryStatusService, UpdateInventoryStatusDto, ListInventoryStatusDto } from '../services/inventory-status.service';
import { RequestContext } from '../dto/common.dto';

@Controller('master-data/inventory-statuses')
export class InventoryStatusController {
  constructor(private readonly inventoryStatusService: InventoryStatusService) {}

  @Get()
  async findMany(@Query() dto: ListInventoryStatusDto) {
    return this.inventoryStatusService.findMany(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryStatusService.findById(id);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInventoryStatusDto) {
    const ctx: RequestContext = { userId: undefined };
    return this.inventoryStatusService.update(id, dto, ctx);
  }
}
