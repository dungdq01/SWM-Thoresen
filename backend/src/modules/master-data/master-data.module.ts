import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { FoundationModule } from '../foundation/foundation.module';

import { OwnerController } from './controllers/owner.controller';
import { VendorController } from './controllers/vendor.controller';
import { ItemController } from './controllers/item.controller';
import { WarehouseController } from './controllers/warehouse.controller';
import { ZoneController } from './controllers/zone.controller';
import { LocationController } from './controllers/location.controller';
import { UomController } from './controllers/uom.controller';
import { UomConversionController } from './controllers/uom-conversion.controller';
import { VehicleTypeController } from './controllers/vehicle-type.controller';
import { InventoryStatusController } from './controllers/inventory-status.controller';
import { LookupController } from './controllers/lookup.controller';
import { CustomerController } from './controllers/customer.controller';
import { DropdownConfigController } from './controllers/dropdown-config.controller';

import { OwnerRepository } from './repositories/owner.repository';
import { VendorRepository } from './repositories/vendor.repository';
import { ItemRepository } from './repositories/item.repository';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { ZoneRepository } from './repositories/zone.repository';
import { LocationRepository } from './repositories/location.repository';
import { UomRepository } from './repositories/uom.repository';
import { UomConversionRepository } from './repositories/uom-conversion.repository';
import { VehicleTypeRepository } from './repositories/vehicle-type.repository';
import { InventoryStatusRepository } from './repositories/inventory-status.repository';
import { CustomerRepository } from './repositories/customer.repository';
import { DropdownConfigRepository } from './repositories/dropdown-config.repository';

import { OwnerService } from './services/owner.service';
import { VendorService } from './services/vendor.service';
import { ItemService } from './services/item.service';
import { WarehouseService } from './services/warehouse.service';
import { ZoneService } from './services/zone.service';
import { LocationService } from './services/location.service';
import { UomService } from './services/uom.service';
import { VehicleTypeService } from './services/vehicle-type.service';
import { InventoryStatusService } from './services/inventory-status.service';
import { LookupService } from './services/lookup.service';
import { CustomerService } from './services/customer.service';
import { DropdownConfigService } from './services/dropdown-config.service';

@Module({
  imports: [PrismaModule, FoundationModule],
  controllers: [
    OwnerController,
    VendorController,
    ItemController,
    WarehouseController,
    ZoneController,
    LocationController,
    UomController,
    UomConversionController,
    VehicleTypeController,
    InventoryStatusController,
    LookupController,
    CustomerController,
    DropdownConfigController,
  ],
  providers: [
    OwnerRepository,
    VendorRepository,
    ItemRepository,
    WarehouseRepository,
    ZoneRepository,
    LocationRepository,
    UomRepository,
    UomConversionRepository,
    VehicleTypeRepository,
    InventoryStatusRepository,
    CustomerRepository,
    DropdownConfigRepository,
    OwnerService,
    VendorService,
    ItemService,
    WarehouseService,
    ZoneService,
    LocationService,
    UomService,
    VehicleTypeService,
    InventoryStatusService,
    LookupService,
    CustomerService,
    DropdownConfigService,
  ],
  exports: [
    OwnerService,
    VendorService,
    ItemService,
    WarehouseService,
    ZoneService,
    LocationService,
    UomService,
    VehicleTypeService,
    InventoryStatusService,
    LookupService,
    CustomerService,
    DropdownConfigService,
  ],
})
export class MasterDataModule {}
