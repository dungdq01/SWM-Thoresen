import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { OwnerRepository } from '../repositories/owner.repository';
import { VendorRepository } from '../repositories/vendor.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { DropdownConfigRepository } from '../repositories/dropdown-config.repository';
import { ItemRepository } from '../repositories/item.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { ZoneRepository } from '../repositories/zone.repository';
import { LocationRepository } from '../repositories/location.repository';
import { UomRepository } from '../repositories/uom.repository';
import { VehicleTypeRepository } from '../repositories/vehicle-type.repository';
import { InventoryStatusRepository } from '../repositories/inventory-status.repository';

export interface LookupItem {
  id: string;
  code: string;
  name: string;
  extra?: Record<string, any>;
}

@Injectable()
export class LookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownerRepository: OwnerRepository,
    private readonly vendorRepository: VendorRepository,
    private readonly itemRepository: ItemRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly zoneRepository: ZoneRepository,
    private readonly locationRepository: LocationRepository,
    private readonly uomRepository: UomRepository,
    private readonly vehicleTypeRepository: VehicleTypeRepository,
    private readonly inventoryStatusRepository: InventoryStatusRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly dropdownConfigRepository: DropdownConfigRepository,
  ) {}

  async getOwners(): Promise<LookupItem[]> {
    const owners = await this.ownerRepository.findAllActive();
    return owners.map((o) => ({ id: o.id, code: o.ownerCode, name: o.ownerName, extra: { ownerGroup: o.ownerGroup, ownerType: o.ownerType } }));
  }

  async getVendors(): Promise<LookupItem[]> {
    const vendors = await this.vendorRepository.findAllActive();
    return vendors.map((v) => ({ id: v.id, code: v.vendorCode, name: v.vendorName, extra: { supplierGroup: v.supplierGroup } }));
  }

  async getItems(): Promise<LookupItem[]> {
    const items = await this.itemRepository.findAllActive();
    return items.map((i) => ({ id: i.id, code: i.itemCode, name: i.itemName, extra: { cargoForm: i.cargoForm, productGroup: i.productGroup, itemGroupId: i.itemGroupId, baseUomId: i.baseUomId, billingUomId: i.billingUomId } }));
  }

  async getWarehouses(): Promise<LookupItem[]> {
    const warehouses = await this.warehouseRepository.findAllActive();
    return warehouses.map((w) => ({ id: w.id, code: w.warehouseCode, name: w.warehouseName, extra: { warehouseType: w.warehouseType, ownerId: w.ownerId } }));
  }

  async getZones(warehouseId?: string): Promise<LookupItem[]> {
    const zones = warehouseId
      ? await this.zoneRepository.findByWarehouse(warehouseId)
      : (await this.zoneRepository.findMany({ isActive: true, pageSize: 1000 })).data;
    return zones.map((z) => ({ id: z.id, code: z.zoneCode, name: z.zoneName, extra: { warehouseId: z.warehouseId, zoneType: z.zoneType } }));
  }

  async getLocations(warehouseId?: string, zoneId?: string): Promise<LookupItem[]> {
    let locations;
    if (zoneId) {
      locations = await this.locationRepository.findByZone(zoneId);
    } else if (warehouseId) {
      locations = await this.locationRepository.findByWarehouse(warehouseId);
    } else {
      locations = (await this.locationRepository.findMany({ isActive: true, pageSize: 1000 })).data;
    }
    return locations.map((l) => ({ id: l.id, code: l.locationCode, name: l.locationCode, extra: { warehouseId: l.warehouseId, zoneId: l.zoneId, locationType: l.locationType } }));
  }

  async getUoms(): Promise<LookupItem[]> {
    const uoms = await this.uomRepository.findAllActive();
    return uoms.map((u) => ({ id: u.id, code: u.uomCode, name: u.description, extra: { uomClass: u.uomClass, isBaseUom: u.isBaseUom } }));
  }

  async getVehicleTypes(): Promise<LookupItem[]> {
    const vehicleTypes = await this.vehicleTypeRepository.findAllActive();
    return vehicleTypes.map((v) => ({ id: v.id, code: v.vehicleTypeCode, name: v.vehicleTypeName, extra: { category: v.category } }));
  }

  async getInventoryStatuses(): Promise<LookupItem[]> {
    const statuses = await this.inventoryStatusRepository.findAllActive();
    return statuses.map((s) => ({ id: s.id, code: s.statusCode, name: s.description, extra: { isAllocatable: s.isAllocatable } }));
  }

  async getCustomers(): Promise<LookupItem[]> {
    const customers = await this.customerRepository.findAllActive();
    return customers.map((c) => ({
      id: c.id,
      code: c.customerCode,
      name: c.customerName,
      extra: { customerGroup: c.customerGroup, customerType: c.customerType },
    }));
  }

  async getItemGroupIdsByWarehouses(warehouseIds: string[]): Promise<string[]> {
    const rows = await this.prisma.mdItemGroupWarehouse.findMany({
      where: { warehouseId: { in: warehouseIds } },
      select: { itemGroupId: true },
      distinct: ['itemGroupId'],
    });
    return rows.map((r) => r.itemGroupId);
  }

  async getDropdownOptions(entity: string, fieldName: string) {
    const options = await this.dropdownConfigRepository.findActiveOptions(entity, fieldName);
    return {
      data: options.map((o) => ({ value: o.value, label: o.label, isDefault: o.isDefault })),
    };
  }
}
