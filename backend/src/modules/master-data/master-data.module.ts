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
import { CarrierController } from './controllers/carrier.controller';
import { VesselController } from './controllers/vessel.controller';
import { LocationTypeController } from './controllers/location-type.controller';
import { OwnerSkuMappingController } from './controllers/owner-sku-mapping.controller';
import { ItemGroupController } from './controllers/item-group.controller';
import { LotController } from './controllers/lot.controller';
import { OwnerWarehouseAccessController } from './controllers/owner-warehouse-access.controller';
import { ItemIncompatibilityController } from './controllers/item-incompatibility.controller';

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
import { CarrierRepository } from './repositories/carrier.repository';
import { VesselRepository } from './repositories/vessel.repository';
import { LocationTypeRepository } from './repositories/location-type.repository';
import { OwnerSkuMappingRepository } from './repositories/owner-sku-mapping.repository';
import { ItemGroupRepository } from './repositories/item-group.repository';
import { LotRepository } from './repositories/lot.repository';
import { OwnerWarehouseAccessRepository } from './repositories/owner-warehouse-access.repository';
import { ItemIncompatibilityRepository } from './repositories/item-incompatibility.repository';

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
import { CarrierService } from './services/carrier.service';
import { VesselService } from './services/vessel.service';
import { LocationTypeService } from './services/location-type.service';
import { OwnerSkuMappingService } from './services/owner-sku-mapping.service';
import { ItemGroupService } from './services/item-group.service';
import { LotService } from './services/lot.service';
import { OwnerWarehouseAccessService } from './services/owner-warehouse-access.service';
import { ItemIncompatibilityService } from './services/item-incompatibility.service';

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
    CarrierController,
    VesselController,
    LocationTypeController,
    OwnerSkuMappingController,
    ItemGroupController,
    LotController,
    OwnerWarehouseAccessController,
    ItemIncompatibilityController,
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
    CarrierRepository,
    VesselRepository,
    LocationTypeRepository,
    OwnerSkuMappingRepository,
    ItemGroupRepository,
    LotRepository,
    OwnerWarehouseAccessRepository,
    ItemIncompatibilityRepository,
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
    CarrierService,
    VesselService,
    LocationTypeService,
    OwnerSkuMappingService,
    ItemGroupService,
    LotService,
    OwnerWarehouseAccessService,
    ItemIncompatibilityService,
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
    CarrierService,
    VesselService,
    LocationTypeService,
    OwnerSkuMappingService,
    ItemGroupService,
    LotService,
    OwnerWarehouseAccessService,
    ItemIncompatibilityService,
  ],
})
export class MasterDataModule {}
