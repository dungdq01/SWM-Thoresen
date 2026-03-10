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
  @Permission('master_data.lookup.view')
  async getOwners() {
    return this.lookupService.getOwners();
  }

  @Get('vendors')
  @Permission('master_data.lookup.view')
  async getVendors() {
    return this.lookupService.getVendors();
  }

  @Get('items')
  @Permission('master_data.lookup.view')
  async getItems() {
    return this.lookupService.getItems();
  }

  @Get('warehouses')
  @Permission('master_data.lookup.view')
  async getWarehouses() {
    return this.lookupService.getWarehouses();
  }

  @Get('zones')
  @Permission('master_data.lookup.view')
  async getZones(@Query('warehouseId') warehouseId?: string) {
    return this.lookupService.getZones(warehouseId);
  }

  @Get('locations')
  @Permission('master_data.lookup.view')
  async getLocations(@Query('warehouseId') warehouseId?: string, @Query('zoneId') zoneId?: string) {
    return this.lookupService.getLocations(warehouseId, zoneId);
  }

  @Get('uoms')
  @Permission('master_data.lookup.view')
  async getUoms() {
    return this.lookupService.getUoms();
  }

  @Get('vehicle-types')
  @Permission('master_data.lookup.view')
  async getVehicleTypes() {
    return this.lookupService.getVehicleTypes();
  }

  @Get('inventory-statuses')
  @Permission('master_data.lookup.view')
  async getInventoryStatuses() {
    return this.lookupService.getInventoryStatuses();
  }

  @Get('customers')
  @Permission('master_data.lookup.view')
  async getCustomers() {
    return this.lookupService.getCustomers();
  }

  @Get('dropdown-options')
  @Permission('master_data.lookup.view')
  async getDropdownOptions(@Query('entity') entity: string, @Query('fieldName') fieldName: string) {
    if (!entity || !fieldName) {
      throw new BadRequestException('entity and fieldName query params are required');
    }
    return this.lookupService.getDropdownOptions(entity, fieldName);
  }
}
