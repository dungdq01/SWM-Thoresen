import { Controller, Get, Put, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { InventoryStatusService, UpdateInventoryStatusDto, ListInventoryStatusDto } from '../services/inventory-status.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/inventory-statuses')
@UseGuards(AuthGuard, PermissionGuard)
export class InventoryStatusController {
  constructor(private readonly inventoryStatusService: InventoryStatusService) {}

  @Get()
  @Permission('MASTER_DATA.INVENTORY_STATUS.READ')
  async findMany(@Query() dto: ListInventoryStatusDto) {
    return this.inventoryStatusService.findMany(dto);
  }

  @Get(':id')
  @Permission('MASTER_DATA.INVENTORY_STATUS.READ')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryStatusService.findById(id);
  }

  @Put(':id')
  @Permission('MASTER_DATA.INVENTORY_STATUS.UPDATE')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInventoryStatusDto, @CurrentUser() user: RequestUser) {
    return this.inventoryStatusService.update(id, dto, { userId: user.id });
  }
}
