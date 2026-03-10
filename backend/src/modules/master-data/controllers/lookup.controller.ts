import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { LookupService } from '../services/lookup.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/decorators/permission.decorator';

@Controller('master-data/lookups')
@UseGuards(AuthGuard, PermissionGuard)
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('owners')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getOwners() {
    return this.lookupService.getOwners();
  }

  @Get('vendors')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getVendors() {
    return this.lookupService.getVendors();
  }

  @Get('items')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getItems() {
    return this.lookupService.getItems();
  }

  @Get('warehouses')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getWarehouses() {
    return this.lookupService.getWarehouses();
  }

  @Get('zones')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getZones(@Query('warehouseId') warehouseId?: string) {
    return this.lookupService.getZones(warehouseId);
  }

  @Get('locations')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getLocations(@Query('warehouseId') warehouseId?: string, @Query('zoneId') zoneId?: string) {
    return this.lookupService.getLocations(warehouseId, zoneId);
  }

  @Get('uoms')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getUoms() {
    return this.lookupService.getUoms();
  }

  @Get('vehicle-types')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getVehicleTypes() {
    return this.lookupService.getVehicleTypes();
  }

  @Get('inventory-statuses')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getInventoryStatuses() {
    return this.lookupService.getInventoryStatuses();
  }

  @Get('customers')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getCustomers() {
    return this.lookupService.getCustomers();
  }

  @Get('dropdown-options')
  @Permission('MASTER_DATA.LOOKUP.READ')
  async getDropdownOptions(@Query('entity') entity: string, @Query('fieldName') fieldName: string) {
    if (!entity || !fieldName) {
      throw new BadRequestException('entity and fieldName query params are required');
    }
    return this.lookupService.getDropdownOptions(entity, fieldName);
  }
}
