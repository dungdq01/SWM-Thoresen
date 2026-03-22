import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { OwnerWarehouseAccessService } from '../services/owner-warehouse-access.service';
import { AssignWarehouseDto } from '../dto/owner-warehouse-access.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data/owners/:ownerId/warehouses')
@UseGuards(AuthGuard, PermissionGuard)
export class OwnerWarehouseAccessController {
  constructor(private readonly accessService: OwnerWarehouseAccessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission('master_data.owner_warehouse_access.create')
  async assignWarehouse(
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @Body() dto: AssignWarehouseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accessService.assignWarehouse(ownerId, dto, { userId: user.id });
  }

  @Get()
  @Permission('master_data.owner_warehouse_access.view')
  async getOwnerWarehouses(@Param('ownerId', ParseUUIDPipe) ownerId: string) {
    return this.accessService.getOwnerWarehouses(ownerId);
  }

  @Delete(':warehouseId')
  @HttpCode(HttpStatus.OK)
  @Permission('master_data.owner_warehouse_access.delete')
  async removeWarehouseAccess(
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accessService.removeWarehouseAccess(ownerId, warehouseId, { userId: user.id });
  }

  @Get(':warehouseId/check')
  @Permission('master_data.owner_warehouse_access.view')
  async checkAccess(
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
  ) {
    const hasAccess = await this.accessService.hasAccess(ownerId, warehouseId);
    return { hasAccess };
  }
}
