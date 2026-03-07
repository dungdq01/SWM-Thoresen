import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { OwnerController } from './controllers/owner.controller';
import { VendorController } from './controllers/vendor.controller';
import { ItemController } from './controllers/item.controller';
import { WarehouseController } from './controllers/warehouse.controller';
import { ZoneController } from './controllers/zone.controller';
import { LocationController } from './controllers/location.controller';
import { UomController } from './controllers/uom.controller';
import { VehicleTypeController } from './controllers/vehicle-type.controller';
import { InventoryStatusController } from './controllers/inventory-status.controller';
import { LookupController } from './controllers/lookup.controller';

import { OwnerRepository } from './repositories/owner.repository';
import { VendorRepository } from './repositories/vendor.repository';
import { ItemRepository } from './repositories/item.repository';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { ZoneRepository } from './repositories/zone.repository';
import { LocationRepository } from './repositories/location.repository';
import { UomRepository } from './repositories/uom.repository';
import { VehicleTypeRepository } from './repositories/vehicle-type.repository';
import { InventoryStatusRepository } from './repositories/inventory-status.repository';

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

@Module({
  imports: [PrismaModule],
  controllers: [
    OwnerController,
    VendorController,
    ItemController,
    WarehouseController,
    ZoneController,
    LocationController,
    UomController,
    VehicleTypeController,
    InventoryStatusController,
    LookupController,
  ],
  providers: [
    OwnerRepository,
    VendorRepository,
    ItemRepository,
    WarehouseRepository,
    ZoneRepository,
    LocationRepository,
    UomRepository,
    VehicleTypeRepository,
    InventoryStatusRepository,
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
  ],
})
export class MasterDataModule {}
