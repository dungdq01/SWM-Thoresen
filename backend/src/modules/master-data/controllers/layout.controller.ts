import { Controller, Get, Put, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { LayoutService } from '../services/layout.service';
import { SaveWarehouseLayoutDto, SaveSiteLayoutDto } from '../dto/layout.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

@Controller('master-data')
@UseGuards(AuthGuard, PermissionGuard)
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  // ─── Warehouse Layout ──────────────────────────────────────────────────────

  @Get('warehouses/:id/layout')
  @Permission('master_data.warehouse.view')
  async getWarehouseLayout(@Param('id', ParseUUIDPipe) id: string) {
    return this.layoutService.getWarehouseLayout(id);
  }

  @Put('warehouses/:id/layout')
  @Permission('master_data.warehouse.update')
  async saveWarehouseLayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveWarehouseLayoutDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.layoutService.saveWarehouseLayout(id, dto, { userId: user.id });
  }

  // ─── Site Map Layout ───────────────────────────────────────────────────────

  @Get('sites/:siteId/layout')
  @Permission('master_data.warehouse.view')
  async getSiteLayout(@Param('siteId') siteId: string) {
    return this.layoutService.getSiteLayout(siteId);
  }

  @Put('sites/:siteId/layout')
  @Permission('master_data.warehouse.update')
  async saveSiteLayout(
    @Param('siteId') siteId: string,
    @Body() dto: SaveSiteLayoutDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.layoutService.saveSiteLayout(siteId, dto, { userId: user.id });
  }
}
