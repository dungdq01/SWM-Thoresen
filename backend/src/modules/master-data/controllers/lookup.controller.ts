import { Controller, Get, Query } from '@nestjs/common';
import { LookupService } from '../services/lookup.service';

@Controller('master-data/lookups')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('owners')
  async getOwners() {
    return this.lookupService.getOwners();
  }

  @Get('vendors')
  async getVendors() {
    return this.lookupService.getVendors();
  }

  @Get('items')
  async getItems() {
    return this.lookupService.getItems();
  }

  @Get('warehouses')
  async getWarehouses() {
    return this.lookupService.getWarehouses();
  }

  @Get('zones')
  async getZones(@Query('warehouseId') warehouseId?: string) {
    return this.lookupService.getZones(warehouseId);
  }

  @Get('locations')
  async getLocations(@Query('warehouseId') warehouseId?: string, @Query('zoneId') zoneId?: string) {
    return this.lookupService.getLocations(warehouseId, zoneId);
  }

  @Get('uoms')
  async getUoms() {
    return this.lookupService.getUoms();
  }

  @Get('vehicle-types')
  async getVehicleTypes() {
    return this.lookupService.getVehicleTypes();
  }

  @Get('inventory-statuses')
  async getInventoryStatuses() {
    return this.lookupService.getInventoryStatuses();
  }
}
