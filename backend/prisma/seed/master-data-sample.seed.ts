import {
  PrismaClient,
  UomClass,
  WarehouseType,
  ZoneType,
  LocationType,
  LocationStatus,
  CargoForm,
  OwnerType,
  SupplierGroup,
  CustomerGroup,
  CustomerType,
  VehicleCategory,
} from '@prisma/client';
import crypto from 'crypto';

function generateDimHash(siteId: string, warehouseCode: string, locationCode: string, ownerCode: string, statusCode: string): string {
  const normalized = [
    siteId.trim().toUpperCase(),
    warehouseCode.trim().toUpperCase(),
    locationCode.trim().toUpperCase(),
    ownerCode.trim().toUpperCase(),
    statusCode.trim().toUpperCase(),
  ].join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Seed dữ liệu mẫu Master Data đầy đủ theo docs/master-data-sample-sheet.md
 * Chạy SAU seed chính (seed.ts) vì cần admin user đã tồn tại.
 */
export async function seedMasterDataSample(prisma: PrismaClient) {
  // Get admin user for createdBy/updatedBy
  const admin = await prisma.appUser.findUnique({ where: { userCode: 'admin' } });
  if (!admin) throw new Error('Admin user not found. Run main seed first.');
  const by = admin.id;

  console.log('🌱 Seeding Master Data Sample...');

  // ============================================================
  // 1. UOMs — Mở rộng thêm các đơn vị chưa có
  // ============================================================
  const uomSeeds = [
    { uomCode: 'KG',    description: 'Kilogram',                  uomClass: UomClass.WEIGHT,   isBaseUom: true,  decimalPrecision: 3 },
    { uomCode: 'MT',    description: 'Metric Ton',                uomClass: UomClass.WEIGHT,   isBaseUom: false, decimalPrecision: 3 },
    { uomCode: 'BAG25', description: 'Bao 25kg',                  uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'BAG40', description: 'Bao 40kg',                  uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'BAG50', description: 'Bao 50kg',                  uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'JUMBO', description: 'Bao Jumbo (1 tấn)',         uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'PCS',   description: 'Cái / Chiếc',               uomClass: UomClass.QUANTITY, isBaseUom: true,  decimalPrecision: 0 },
    { uomCode: 'L',     description: 'Lít',                       uomClass: UomClass.VOLUME,   isBaseUom: true,  decimalPrecision: 2 },
    { uomCode: 'M3',    description: 'Mét khối',                  uomClass: UomClass.VOLUME,   isBaseUom: false, decimalPrecision: 3 },
    { uomCode: 'M2',    description: 'Mét vuông',                 uomClass: UomClass.AREA,     isBaseUom: true,  decimalPrecision: 2 },
    { uomCode: 'M',     description: 'Mét',                       uomClass: UomClass.LENGTH,   isBaseUom: true,  decimalPrecision: 2 },
    { uomCode: 'DRUM',  description: 'Thùng phuy',                uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'PLT',   description: 'Pallet',                    uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'TEU',   description: 'Twenty-foot Equivalent Unit', uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
  ];

  const uomMap: Record<string, string> = {};
  for (const uom of uomSeeds) {
    const created = await prisma.mdUom.upsert({
      where: { uomCode: uom.uomCode },
      update: { description: uom.description, uomClass: uom.uomClass, isBaseUom: uom.isBaseUom, decimalPrecision: uom.decimalPrecision, updatedBy: by },
      create: { ...uom, createdBy: by, updatedBy: by },
    });
    uomMap[uom.uomCode] = created.id;
  }
  console.log(`  ✅ UOMs: ${Object.keys(uomMap).length} records`);

  // ============================================================
  // 2. UOM Conversions
  // ============================================================
  const conversionSeeds = [
    { from: 'MT',    to: 'KG', factor: 1000,  desc: '1 MT = 1,000 KG' },
    { from: 'BAG25', to: 'KG', factor: 25,    desc: '1 Bao 25kg = 25 KG' },
    { from: 'BAG40', to: 'KG', factor: 40,    desc: '1 Bao 40kg = 40 KG' },
    { from: 'BAG50', to: 'KG', factor: 50,    desc: '1 Bao 50kg = 50 KG' },
    { from: 'JUMBO', to: 'KG', factor: 1000,  desc: '1 Jumbo = 1,000 KG' },
    { from: 'M3',    to: 'L',  factor: 1000,  desc: '1 M3 = 1,000 L' },
    { from: 'DRUM',  to: 'L',  factor: 200,   desc: '1 Drum = 200 L' },
  ];

  let convCount = 0;
  for (const c of conversionSeeds) {
    const existing = await prisma.mdUomConversion.findFirst({
      where: { fromUomId: uomMap[c.from], toUomId: uomMap[c.to], itemId: null },
    });
    if (!existing) {
      await prisma.mdUomConversion.create({
        data: { fromUomId: uomMap[c.from], toUomId: uomMap[c.to], conversionFactor: c.factor, createdBy: by, updatedBy: by },
      });
      convCount++;
    }
  }
  console.log(`  ✅ UOM Conversions: ${convCount} new records`);

  // ============================================================
  // 3. Warehouses
  // ============================================================
  const warehouseSeeds = [
    { warehouseCode: 'WH-01', warehouseName: 'Kho 1 — Hàng rời',       warehouseType: WarehouseType.COVERED,   totalAreaM2: 12000, usableAreaM2: 10500, maxHeightM: 15, maxCapacityMt: 50000, address: 'Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu', hasWeighbridge: true,  weighbridgeCount: 2, isBonded: false, capacityWarningPct: 85 },
    { warehouseCode: 'WH-02', warehouseName: 'Kho 2 — Hàng bao',       warehouseType: WarehouseType.COVERED,   totalAreaM2: 8000,  usableAreaM2: 7200,  maxHeightM: 12, maxCapacityMt: 30000, address: 'Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu', hasWeighbridge: true,  weighbridgeCount: 1, isBonded: false, capacityWarningPct: 85 },
    { warehouseCode: 'WH-03', warehouseName: 'Kho 3 — Phân bón',       warehouseType: WarehouseType.COVERED,   totalAreaM2: 6000,  usableAreaM2: 5400,  maxHeightM: 10, maxCapacityMt: 25000, address: 'Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu', hasWeighbridge: false, weighbridgeCount: null, isBonded: false, capacityWarningPct: 80 },
    { warehouseCode: 'WH-04', warehouseName: 'Kho 4 — Kho ngoại quan', warehouseType: WarehouseType.COVERED,   totalAreaM2: 5000,  usableAreaM2: 4500,  maxHeightM: 10, maxCapacityMt: 20000, address: 'Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu', hasWeighbridge: true,  weighbridgeCount: 1, isBonded: true,  capacityWarningPct: 90 },
    { warehouseCode: 'OY-01', warehouseName: 'Bãi hở A — Thép & Sắt', warehouseType: WarehouseType.OPEN_YARD, totalAreaM2: 15000, usableAreaM2: 13000, maxHeightM: 0,  maxCapacityMt: 40000, address: 'Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu', hasWeighbridge: true,  weighbridgeCount: 1, isBonded: false, capacityWarningPct: 80 },
    { warehouseCode: 'OY-02', warehouseName: 'Bãi hở B — Container',   warehouseType: WarehouseType.OPEN_YARD, totalAreaM2: 20000, usableAreaM2: 18000, maxHeightM: 0,  maxCapacityMt: 35000, address: 'Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu', hasWeighbridge: false, weighbridgeCount: null, isBonded: false, capacityWarningPct: 80 },
    { warehouseCode: 'MX-01', warehouseName: 'Kho tổng hợp',           warehouseType: WarehouseType.MIXED,     totalAreaM2: 10000, usableAreaM2: 8500,  maxHeightM: 12, maxCapacityMt: 35000, address: 'Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu', hasWeighbridge: true,  weighbridgeCount: 1, isBonded: false, capacityWarningPct: 85 },
  ];

  const whMap: Record<string, string> = {};
  for (const wh of warehouseSeeds) {
    const created = await prisma.mdWarehouse.upsert({
      where: { warehouseCode: wh.warehouseCode },
      update: { warehouseName: wh.warehouseName, warehouseType: wh.warehouseType, totalAreaM2: wh.totalAreaM2, usableAreaM2: wh.usableAreaM2, maxHeightM: wh.maxHeightM, maxCapacityMt: wh.maxCapacityMt, address: wh.address, hasWeighbridge: wh.hasWeighbridge, weighbridgeCount: wh.weighbridgeCount, isBonded: wh.isBonded, capacityWarningPct: wh.capacityWarningPct, updatedBy: by },
      create: { ...wh, siteId: 'TVL-SITE', createdBy: by, updatedBy: by },
    });
    whMap[wh.warehouseCode] = created.id;
  }
  console.log(`  ✅ Warehouses: ${Object.keys(whMap).length} records`);

  // ============================================================
  // 4. Zones
  // ============================================================
  const zoneSeeds = [
    { zoneCode: 'WH01-RCV',   zoneName: 'Nhận hàng — Kho 1',    wh: 'WH-01', zoneType: ZoneType.RECEIVING, isBillingZone: false, billingRateZone: null,        maxCapacityMt: 5000 },
    { zoneCode: 'WH01-STG-A', zoneName: 'Lưu kho A — Kho 1',    wh: 'WH-01', zoneType: ZoneType.STORAGE,   isBillingZone: true,  billingRateZone: 'BULK-A',    maxCapacityMt: 20000 },
    { zoneCode: 'WH01-STG-B', zoneName: 'Lưu kho B — Kho 1',    wh: 'WH-01', zoneType: ZoneType.STORAGE,   isBillingZone: true,  billingRateZone: 'BULK-B',    maxCapacityMt: 20000 },
    { zoneCode: 'WH01-STAG',  zoneName: 'Tập kết — Kho 1',      wh: 'WH-01', zoneType: ZoneType.STAGING,   isBillingZone: false, billingRateZone: null,        maxCapacityMt: 3000 },
    { zoneCode: 'WH01-SHIP',  zoneName: 'Xuất hàng — Kho 1',    wh: 'WH-01', zoneType: ZoneType.SHIPPING,  isBillingZone: false, billingRateZone: null,        maxCapacityMt: 5000 },
    { zoneCode: 'WH01-QC',    zoneName: 'Kiểm tra CL — Kho 1',  wh: 'WH-01', zoneType: ZoneType.QC,        isBillingZone: false, billingRateZone: null,        maxCapacityMt: 500 },
    { zoneCode: 'WH01-DMG',   zoneName: 'Hàng hư — Kho 1',      wh: 'WH-01', zoneType: ZoneType.DAMAGED,   isBillingZone: false, billingRateZone: null,        maxCapacityMt: 1000 },
    { zoneCode: 'WH02-RCV',   zoneName: 'Nhận hàng — Kho 2',    wh: 'WH-02', zoneType: ZoneType.RECEIVING, isBillingZone: false, billingRateZone: null,        maxCapacityMt: 3000 },
    { zoneCode: 'WH02-STG-A', zoneName: 'Lưu kho A — Kho 2',    wh: 'WH-02', zoneType: ZoneType.STORAGE,   isBillingZone: true,  billingRateZone: 'BAGGED-A',  maxCapacityMt: 15000 },
    { zoneCode: 'WH02-STG-B', zoneName: 'Lưu kho B — Kho 2',    wh: 'WH-02', zoneType: ZoneType.STORAGE,   isBillingZone: true,  billingRateZone: 'BAGGED-B',  maxCapacityMt: 10000 },
    { zoneCode: 'WH02-SHIP',  zoneName: 'Xuất hàng — Kho 2',    wh: 'WH-02', zoneType: ZoneType.SHIPPING,  isBillingZone: false, billingRateZone: null,        maxCapacityMt: 3000 },
    { zoneCode: 'WH03-STG',   zoneName: 'Lưu kho — Kho 3',      wh: 'WH-03', zoneType: ZoneType.STORAGE,   isBillingZone: true,  billingRateZone: 'FERT-MAIN', maxCapacityMt: 20000 },
    { zoneCode: 'WH03-RCV',   zoneName: 'Nhận hàng — Kho 3',    wh: 'WH-03', zoneType: ZoneType.RECEIVING, isBillingZone: false, billingRateZone: null,        maxCapacityMt: 2000 },
    { zoneCode: 'WH04-STG',   zoneName: 'Lưu kho — Ngoại quan', wh: 'WH-04', zoneType: ZoneType.STORAGE,   isBillingZone: true,  billingRateZone: 'BONDED-MAIN', maxCapacityMt: 15000 },
    { zoneCode: 'OY01-STG',   zoneName: 'Bãi chứa — Bãi hở A', wh: 'OY-01', zoneType: ZoneType.STORAGE,   isBillingZone: true,  billingRateZone: 'OPEN-STEEL', maxCapacityMt: 30000 },
    { zoneCode: 'OY02-STG',   zoneName: 'Bãi container',         wh: 'OY-02', zoneType: ZoneType.STORAGE,   isBillingZone: true,  billingRateZone: 'OPEN-CONT',  maxCapacityMt: 25000 },
  ];

  const zoneMap: Record<string, string> = {};
  for (const z of zoneSeeds) {
    const warehouseId = whMap[z.wh];
    const created = await prisma.mdZone.upsert({
      where: { warehouseId_zoneCode: { warehouseId, zoneCode: z.zoneCode } },
      update: { zoneName: z.zoneName, zoneType: z.zoneType, isBillingZone: z.isBillingZone, billingRateZone: z.billingRateZone, maxCapacityMt: z.maxCapacityMt, updatedBy: by },
      create: { warehouseId, zoneCode: z.zoneCode, zoneName: z.zoneName, zoneType: z.zoneType, isBillingZone: z.isBillingZone, billingRateZone: z.billingRateZone, maxCapacityMt: z.maxCapacityMt, createdBy: by, updatedBy: by },
    });
    zoneMap[z.zoneCode] = created.id;
  }
  console.log(`  ✅ Zones: ${Object.keys(zoneMap).length} records`);

  // ============================================================
  // 5. Locations
  // ============================================================
  const locationSeeds: Array<{
    locationCode: string; wh: string; zone: string; locationType: LocationType;
    locationProfile: string; status: LocationStatus; areaM2?: number; maxHeightM?: number;
    stackLimitKg?: number; isMixedOwner: boolean; isMixedProduct: boolean;
    isBillingLocation: boolean; stackingRule?: string;
  }> = [
    // WH-01
    { locationCode: 'WH01-RCV-01',  wh: 'WH-01', zone: 'WH01-RCV',   locationType: LocationType.RECEIVING, locationProfile: 'RCV-BULK',    status: LocationStatus.OK,      areaM2: 200,  maxHeightM: 15, stackLimitKg: 100000, isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    { locationCode: 'WH01-RCV-02',  wh: 'WH-01', zone: 'WH01-RCV',   locationType: LocationType.RECEIVING, locationProfile: 'RCV-BULK',    status: LocationStatus.OK,      areaM2: 200,  maxHeightM: 15, stackLimitKg: 100000, isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    { locationCode: 'WH01-A-01',    wh: 'WH-01', zone: 'WH01-STG-A', locationType: LocationType.STORAGE,   locationProfile: 'STG-BULK',    status: LocationStatus.OK,      areaM2: 500,  maxHeightM: 15, stackLimitKg: 200000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH01-A-02',    wh: 'WH-01', zone: 'WH01-STG-A', locationType: LocationType.STORAGE,   locationProfile: 'STG-BULK',    status: LocationStatus.OK,      areaM2: 500,  maxHeightM: 15, stackLimitKg: 200000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH01-A-03',    wh: 'WH-01', zone: 'WH01-STG-A', locationType: LocationType.STORAGE,   locationProfile: 'STG-BULK',    status: LocationStatus.OK,      areaM2: 400,  maxHeightM: 15, stackLimitKg: 150000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH01-B-01',    wh: 'WH-01', zone: 'WH01-STG-B', locationType: LocationType.STORAGE,   locationProfile: 'STG-BULK',    status: LocationStatus.OK,      areaM2: 500,  maxHeightM: 15, stackLimitKg: 200000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH01-B-02',    wh: 'WH-01', zone: 'WH01-STG-B', locationType: LocationType.STORAGE,   locationProfile: 'STG-BULK',    status: LocationStatus.HOLD,    areaM2: 500,  maxHeightM: 15, stackLimitKg: 200000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH01-STAG-01', wh: 'WH-01', zone: 'WH01-STAG',  locationType: LocationType.STAGING,   locationProfile: 'STG-TEMP',    status: LocationStatus.OK,      areaM2: 300,  maxHeightM: 15, stackLimitKg: 80000,  isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    { locationCode: 'WH01-SHIP-01', wh: 'WH-01', zone: 'WH01-SHIP',  locationType: LocationType.SHIPPING,  locationProfile: 'SHIP-BULK',   status: LocationStatus.OK,      areaM2: 300,  maxHeightM: 15, stackLimitKg: 100000, isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    { locationCode: 'WH01-SHIP-02', wh: 'WH-01', zone: 'WH01-SHIP',  locationType: LocationType.SHIPPING,  locationProfile: 'SHIP-BULK',   status: LocationStatus.OK,      areaM2: 300,  maxHeightM: 15, stackLimitKg: 100000, isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    { locationCode: 'WH01-QC-01',   wh: 'WH-01', zone: 'WH01-QC',    locationType: LocationType.QC,        locationProfile: 'QC-DEFAULT',  status: LocationStatus.OK,      areaM2: 100,  maxHeightM: 5,  stackLimitKg: 20000,  isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    { locationCode: 'WH01-DMG-01',  wh: 'WH-01', zone: 'WH01-DMG',   locationType: LocationType.DAMAGED,   locationProfile: 'DMG-DEFAULT', status: LocationStatus.BLOCKED, areaM2: 200,  maxHeightM: 10, stackLimitKg: 50000,  isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    // WH-02
    { locationCode: 'WH02-RCV-01',  wh: 'WH-02', zone: 'WH02-RCV',   locationType: LocationType.RECEIVING, locationProfile: 'RCV-BAGGED',  status: LocationStatus.OK,      areaM2: 150,  maxHeightM: 12, stackLimitKg: 60000,  isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    { locationCode: 'WH02-A-01',    wh: 'WH-02', zone: 'WH02-STG-A', locationType: LocationType.STORAGE,   locationProfile: 'STG-BAGGED',  status: LocationStatus.OK,      areaM2: 400,  maxHeightM: 12, stackLimitKg: 120000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH02-A-02',    wh: 'WH-02', zone: 'WH02-STG-A', locationType: LocationType.STORAGE,   locationProfile: 'STG-BAGGED',  status: LocationStatus.OK,      areaM2: 400,  maxHeightM: 12, stackLimitKg: 120000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH02-A-03',    wh: 'WH-02', zone: 'WH02-STG-A', locationType: LocationType.STORAGE,   locationProfile: 'STG-BAGGED',  status: LocationStatus.OK,      areaM2: 350,  maxHeightM: 12, stackLimitKg: 100000, isMixedOwner: false, isMixedProduct: true,  isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH02-B-01',    wh: 'WH-02', zone: 'WH02-STG-B', locationType: LocationType.STORAGE,   locationProfile: 'STG-BAGGED',  status: LocationStatus.OK,      areaM2: 400,  maxHeightM: 12, stackLimitKg: 100000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'LIFO' },
    { locationCode: 'WH02-SHIP-01', wh: 'WH-02', zone: 'WH02-SHIP',  locationType: LocationType.SHIPPING,  locationProfile: 'SHIP-BAGGED', status: LocationStatus.OK,      areaM2: 200,  maxHeightM: 12, stackLimitKg: 60000,  isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    // WH-03
    { locationCode: 'WH03-RCV-01',  wh: 'WH-03', zone: 'WH03-RCV',   locationType: LocationType.RECEIVING, locationProfile: 'RCV-FERT',    status: LocationStatus.OK,      areaM2: 120,  maxHeightM: 10, stackLimitKg: 50000,  isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
    { locationCode: 'WH03-STG-01',  wh: 'WH-03', zone: 'WH03-STG',   locationType: LocationType.STORAGE,   locationProfile: 'STG-FERT',    status: LocationStatus.OK,      areaM2: 600,  maxHeightM: 10, stackLimitKg: 180000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH03-STG-02',  wh: 'WH-03', zone: 'WH03-STG',   locationType: LocationType.STORAGE,   locationProfile: 'STG-FERT',    status: LocationStatus.OK,      areaM2: 500,  maxHeightM: 10, stackLimitKg: 150000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    // WH-04
    { locationCode: 'WH04-STG-01',  wh: 'WH-04', zone: 'WH04-STG',   locationType: LocationType.STORAGE,   locationProfile: 'STG-BONDED',  status: LocationStatus.OK,      areaM2: 500,  maxHeightM: 10, stackLimitKg: 100000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    { locationCode: 'WH04-STG-02',  wh: 'WH-04', zone: 'WH04-STG',   locationType: LocationType.STORAGE,   locationProfile: 'STG-BONDED',  status: LocationStatus.OK,      areaM2: 400,  maxHeightM: 10, stackLimitKg: 80000,  isMixedOwner: false, isMixedProduct: false, isBillingLocation: true,  stackingRule: 'FIFO' },
    // OY-01
    { locationCode: 'OY01-STG-01',  wh: 'OY-01', zone: 'OY01-STG',   locationType: LocationType.STORAGE,   locationProfile: 'STG-OPEN',    status: LocationStatus.OK,      areaM2: 2000,                 stackLimitKg: 500000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true },
    { locationCode: 'OY01-STG-02',  wh: 'OY-01', zone: 'OY01-STG',   locationType: LocationType.STORAGE,   locationProfile: 'STG-OPEN',    status: LocationStatus.OK,      areaM2: 2000,                 stackLimitKg: 500000, isMixedOwner: false, isMixedProduct: false, isBillingLocation: true },
    // OY-02
    { locationCode: 'OY02-STG-01',  wh: 'OY-02', zone: 'OY02-STG',   locationType: LocationType.STORAGE,   locationProfile: 'STG-CONT',    status: LocationStatus.OK,      areaM2: 3000,                 stackLimitKg: 400000, isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: true,  stackingRule: 'STACK-3' },
    // Virtual
    { locationCode: 'VIRTUAL-ADJ',  wh: 'WH-01', zone: 'WH01-STG-A', locationType: LocationType.VIRTUAL,   locationProfile: 'VIRTUAL',     status: LocationStatus.OK,                                                            isMixedOwner: true,  isMixedProduct: true,  isBillingLocation: false },
  ];

  let locCount = 0;
  for (const loc of locationSeeds) {
    const warehouseId = whMap[loc.wh];
    const zoneId = zoneMap[loc.zone];
    await prisma.mdLocation.upsert({
      where: { warehouseId_locationCode: { warehouseId, locationCode: loc.locationCode } },
      update: { locationType: loc.locationType, locationProfile: loc.locationProfile, status: loc.status, areaM2: loc.areaM2, maxHeightM: loc.maxHeightM, stackLimitKg: loc.stackLimitKg, isMixedOwner: loc.isMixedOwner, isMixedProduct: loc.isMixedProduct, isBillingLocation: loc.isBillingLocation, stackingRule: loc.stackingRule, updatedBy: by },
      create: { warehouseId, zoneId, locationCode: loc.locationCode, locationType: loc.locationType, locationProfile: loc.locationProfile, status: loc.status, areaM2: loc.areaM2, maxHeightM: loc.maxHeightM, stackLimitKg: loc.stackLimitKg, isMixedOwner: loc.isMixedOwner, isMixedProduct: loc.isMixedProduct, isBillingLocation: loc.isBillingLocation, stackingRule: loc.stackingRule, createdBy: by, updatedBy: by },
    });
    locCount++;
  }
  console.log(`  ✅ Locations: ${locCount} records`);

  // ============================================================
  // 6. Owners
  // ============================================================
  const ownerSeeds = [
    { ownerCode: 'OWN-001', ownerName: 'Thoresen Vietnamese Logistics',   shortName: 'TVL',    ownerGroup: 'LOCAL',   ownerType: OwnerType.DIRECT,    taxCode: '3602352688', address: 'KCN Phú Mỹ 1, Tân Thành, BRVT',            billingEmail: 'billing@tvl.com.vn',      billingContact: 'Nguyễn Thanh Hà',  paymentTerms: 'NET30', defaultTolerancePct: 2.0,   defaultWarehouse: 'WH-01' },
    { ownerCode: 'OWN-002', ownerName: 'Công ty CP Nông sản Miền Nam',    shortName: 'NSMT',   ownerGroup: 'LOCAL',   ownerType: OwnerType.DIRECT,    taxCode: '0301234567', address: '45 Nguyễn Huệ, Q1, TP.HCM',                billingEmail: 'ketoan@nsmt.com.vn',      billingContact: 'Trần Văn Bình',    paymentTerms: 'NET45', defaultTolerancePct: 1.5,   defaultWarehouse: 'WH-02' },
    { ownerCode: 'OWN-003', ownerName: 'Toyota Tsusho (Vietnam)',          shortName: 'TTCV',   ownerGroup: 'FOREIGN', ownerType: OwnerType.DIRECT,    taxCode: '0309876543', address: 'Lầu 12, Saigon Centre, Q1, TP.HCM',        billingEmail: 'finance@ttcv.com.vn',     billingContact: 'Yamada Kenji',     paymentTerms: 'NET60', defaultTolerancePct: 1.0,   defaultWarehouse: 'WH-04' },
    { ownerCode: 'OWN-004', ownerName: 'PVFCCo — Đạm Phú Mỹ',            shortName: 'PVFCCO', ownerGroup: 'LOCAL',   ownerType: OwnerType.DIRECT,    taxCode: '3500100200', address: 'KCN Phú Mỹ, TX Phú Mỹ, BRVT',             billingEmail: 'ap@pvfcco.com.vn',        billingContact: 'Lê Minh Tuấn',    paymentTerms: 'NET30', defaultTolerancePct: 2.5,   defaultWarehouse: 'WH-03' },
    { ownerCode: 'OWN-005', ownerName: 'COFCO International Vietnam',     shortName: 'COFCO',  ownerGroup: 'FOREIGN', ownerType: OwnerType.CONSIGNED, taxCode: '0312345678', address: '15 Lê Duẩn, Q1, TP.HCM',                  billingEmail: 'billing-vn@cofco.com',    billingContact: 'Wang Lei',         paymentTerms: 'NET45', defaultTolerancePct: 1.0,   defaultWarehouse: 'WH-01' },
    { ownerCode: 'OWN-006', ownerName: 'Tổng công ty Thép Việt Nam',      shortName: 'VNSteel', ownerGroup: 'LOCAL',  ownerType: OwnerType.DIRECT,    taxCode: '0100101010', address: '91 Láng Hạ, Đống Đa, Hà Nội',             billingEmail: 'payment@vnsteel.vn',      billingContact: 'Phạm Quốc Dũng',  paymentTerms: 'NET30', defaultTolerancePct: 0.5,   defaultWarehouse: 'OY-01' },
    { ownerCode: 'OWN-007', ownerName: 'Công ty TNHH Hóa chất Đông Á',   shortName: 'HCDA',   ownerGroup: 'LOCAL',   ownerType: OwnerType.OTHER,     taxCode: '3601112233', address: '78 Trần Hưng Đạo, Tp Vũng Tàu, BRVT',     billingEmail: 'hcda.finance@gmail.com',  billingContact: 'Võ Thị Lan',       paymentTerms: 'NET30', defaultTolerancePct: 2.0,   defaultWarehouse: 'MX-01' },
  ];

  for (const o of ownerSeeds) {
    const defaultWarehouseId = o.defaultWarehouse ? whMap[o.defaultWarehouse] : undefined;
    await prisma.mdOwner.upsert({
      where: { ownerCode: o.ownerCode },
      update: { ownerName: o.ownerName, shortName: o.shortName, ownerGroup: o.ownerGroup, ownerType: o.ownerType, taxCode: o.taxCode, address: o.address, billingEmail: o.billingEmail, billingContact: o.billingContact, paymentTerms: o.paymentTerms, defaultTolerancePct: o.defaultTolerancePct, defaultWarehouseId, updatedBy: by },
      create: { ownerCode: o.ownerCode, ownerName: o.ownerName, shortName: o.shortName, ownerGroup: o.ownerGroup, ownerType: o.ownerType, taxCode: o.taxCode, address: o.address, billingEmail: o.billingEmail, billingContact: o.billingContact, paymentTerms: o.paymentTerms, defaultTolerancePct: o.defaultTolerancePct, defaultWarehouseId, createdBy: by, updatedBy: by },
    });
  }
  console.log(`  ✅ Owners: ${ownerSeeds.length} records`);

  // ============================================================
  // 7. Vendors
  // ============================================================
  const vendorSeeds = [
    { vendorCode: 'VND-001', vendorName: 'MV Pacific Fortune',            supplierGroup: SupplierGroup.VESSEL_AGENT, countryRegion: 'Singapore',  vesselName: 'Pacific Fortune', contactName: 'Captain Tan',     phone: '+65-91234567',  email: 'ops@pacificfortune.sg',     taxCode: null },
    { vendorCode: 'VND-002', vendorName: 'MV Bulk Asia',                  supplierGroup: SupplierGroup.VESSEL_AGENT, countryRegion: 'Vietnam',    vesselName: 'Bulk Asia',       contactName: 'Nguyễn Hải Long', phone: '0254-3850001',  email: 'vessel@bulkasia.vn',        taxCode: null },
    { vendorCode: 'VND-003', vendorName: 'MV Green Star',                 supplierGroup: SupplierGroup.OVERSEAS,     countryRegion: 'China',      vesselName: 'Green Star',      contactName: 'Li Wei',          phone: '+86-13800001',  email: 'greenstar@shipping.cn',     taxCode: null },
    { vendorCode: 'VND-004', vendorName: 'Vận tải Phú Mỹ',               supplierGroup: SupplierGroup.DOMESTIC,     countryRegion: 'Vietnam',    vesselName: null,              contactName: 'Trần Văn Huy',    phone: '0901234001',    email: 'vantai@phumy.com.vn',       taxCode: '3601001001' },
    { vendorCode: 'VND-005', vendorName: 'Công ty Sà lan Mekong',         supplierGroup: SupplierGroup.DOMESTIC,     countryRegion: 'Vietnam',    vesselName: null,              contactName: 'Lê Thanh Sơn',    phone: '0907654001',    email: 'dispatch@mekongbarge.vn',   taxCode: '3602002002' },
    { vendorCode: 'VND-006', vendorName: 'Saigon Shipping Lines',         supplierGroup: SupplierGroup.DOMESTIC,     countryRegion: 'Vietnam',    vesselName: null,              contactName: 'Phạm Minh Đức',   phone: '0281234567',    email: 'ops@saigonshipping.com.vn', taxCode: '0308765432' },
    { vendorCode: 'VND-007', vendorName: 'Louis Dreyfus Company',         supplierGroup: SupplierGroup.TRADER,       countryRegion: 'Switzerland', vesselName: null,             contactName: 'Pierre Dupont',   phone: '+41-223456789', email: 'trade-vn@ldc.com',          taxCode: null },
    { vendorCode: 'VND-008', vendorName: 'Olam International',            supplierGroup: SupplierGroup.TRADER,       countryRegion: 'Singapore',  vesselName: null,              contactName: 'Ravi Kumar',      phone: '+65-64567890',  email: 'vietnam@olam.com',          taxCode: null },
  ];

  for (const v of vendorSeeds) {
    await prisma.mdVendor.upsert({
      where: { vendorCode: v.vendorCode },
      update: { vendorName: v.vendorName, supplierGroup: v.supplierGroup, countryRegion: v.countryRegion, vesselName: v.vesselName, contactName: v.contactName, phone: v.phone, email: v.email, taxCode: v.taxCode, updatedBy: by },
      create: { vendorCode: v.vendorCode, vendorName: v.vendorName, supplierGroup: v.supplierGroup, countryRegion: v.countryRegion, vesselName: v.vesselName, contactName: v.contactName, phone: v.phone, email: v.email, taxCode: v.taxCode, createdBy: by, updatedBy: by },
    });
  }
  console.log(`  ✅ Vendors: ${vendorSeeds.length} records`);

  // ============================================================
  // 8. Customers
  // ============================================================
  const customerSeeds = [
    { customerCode: 'CUS-001', customerName: 'Công ty TNHH Thức ăn chăn nuôi ABC', shortName: 'TACN-ABC', customerGroup: CustomerGroup.CORPORATE,  customerType: CustomerType.BUYER,     taxCode: '0301112233', contactName: 'Nguyễn Văn An',    phone: '0901234567',    email: 'mua@tacnabc.com.vn',         address: '123 Quốc lộ 51, Long Thành, Đồng Nai' },
    { customerCode: 'CUS-002', customerName: 'Công ty CP Gạo Việt',                 shortName: 'GaoViet',  customerGroup: CustomerGroup.CORPORATE,  customerType: CustomerType.BUYER,     taxCode: '0304455667', contactName: 'Trần Thị Bích',    phone: '0907654321',    email: 'order@gaoviet.com.vn',       address: '456 Lê Lợi, Q1, TP.HCM' },
    { customerCode: 'CUS-003', customerName: 'Tập đoàn Hòa Phát',                   shortName: 'HPG',      customerGroup: CustomerGroup.CORPORATE,  customerType: CustomerType.BUYER,     taxCode: '0100200300', contactName: 'Lê Quốc Cường',    phone: '0241234567',    email: 'procurement@hoaphat.com.vn', address: '39 Nguyễn Đình Chiểu, Hai Bà Trưng, HN' },
    { customerCode: 'CUS-004', customerName: 'Công ty XNK Đông Phương',              shortName: 'DP-XNK',   customerGroup: CustomerGroup.CORPORATE,  customerType: CustomerType.CONSIGNEE, taxCode: '3601234500', contactName: 'Phạm Thị Dung',    phone: '0254-3810001',  email: 'shipping@dongphuong.vn',     address: 'KCN Phú Mỹ 2, TX Phú Mỹ, BRVT' },
    { customerCode: 'CUS-005', customerName: 'Nhà máy Đạm Cà Mau',                  shortName: 'PVCFC',    customerGroup: CustomerGroup.CORPORATE,  customerType: CustomerType.SHIPPER,   taxCode: '2000100200', contactName: 'Trương Minh Hiếu', phone: '0780123456',    email: 'logistics@pvcfc.com.vn',     address: 'KCN Khí - Điện - Đạm, Cà Mau' },
    { customerCode: 'CUS-006', customerName: 'Hộ kinh doanh Nguyễn Văn Phát',        shortName: 'NV-Phat',  customerGroup: CustomerGroup.INDIVIDUAL, customerType: CustomerType.BUYER,     taxCode: null,         contactName: 'Nguyễn Văn Phát',  phone: '0912345678',    email: 'phat.nguyen@gmail.com',      address: '789 CMT8, Q3, TP.HCM' },
    { customerCode: 'CUS-007', customerName: 'Mediterranean Shipping Company',        shortName: 'MSC',      customerGroup: CustomerGroup.CORPORATE,  customerType: CustomerType.CONSIGNEE, taxCode: null,         contactName: 'Marco Rossi',      phone: '+41-227038888', email: 'vietnam@msc.com',            address: 'Tầng 10, Bitexco, Q1, TP.HCM' },
  ];

  for (const c of customerSeeds) {
    await prisma.mdCustomer.upsert({
      where: { customerCode: c.customerCode },
      update: { customerName: c.customerName, shortName: c.shortName, customerGroup: c.customerGroup, customerType: c.customerType, taxCode: c.taxCode, contactName: c.contactName, phone: c.phone, email: c.email, address: c.address, updatedBy: by },
      create: { customerCode: c.customerCode, customerName: c.customerName, shortName: c.shortName, customerGroup: c.customerGroup, customerType: c.customerType, taxCode: c.taxCode, contactName: c.contactName, phone: c.phone, email: c.email, address: c.address, createdBy: by, updatedBy: by },
    });
  }
  console.log(`  ✅ Customers: ${customerSeeds.length} records`);

  // ============================================================
  // 9. Items
  // ============================================================
  const itemSeeds = [
    { itemCode: 'RICE-5T',   itemName: 'Gạo 5% tấm',              itemNameEn: 'Rice 5% Broken',          productGroup: 'AGRICULTURAL', cargoForm: CargoForm.BAGGED_50KG, category: 'Lương thực',  baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: 50.5, stdNetWeight: 50.0, densityMtPerM3: 0.75, tolerancePctInbound: 2.0, tolerancePctOutbound: 1.5, shrinkageRatePct: 0.5, rotateBy: 'FEFO', shelfLifeDays: 365, isCatchWeight: true,  isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: 50, hsCode: '1006.30', countryOfOrigin: 'Vietnam' },
    { itemCode: 'RICE-15T',  itemName: 'Gạo 15% tấm',             itemNameEn: 'Rice 15% Broken',         productGroup: 'AGRICULTURAL', cargoForm: CargoForm.BAGGED_50KG, category: 'Lương thực',  baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: 50.5, stdNetWeight: 50.0, densityMtPerM3: 0.73, tolerancePctInbound: 2.0, tolerancePctOutbound: 1.5, shrinkageRatePct: 0.5, rotateBy: 'FEFO', shelfLifeDays: 365, isCatchWeight: true,  isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: 50, hsCode: '1006.30', countryOfOrigin: 'Vietnam' },
    { itemCode: 'RICE-JB',   itemName: 'Gạo xuất khẩu (Jumbo)',    itemNameEn: 'Rice Export Jumbo',       productGroup: 'AGRICULTURAL', cargoForm: CargoForm.JUMBO,       category: 'Lương thực',  baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: 1005, stdNetWeight: 1000, densityMtPerM3: 0.75, tolerancePctInbound: 1.5, tolerancePctOutbound: 1.0, shrinkageRatePct: 0.3, rotateBy: 'FEFO', shelfLifeDays: 365, isCatchWeight: true,  isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: null, hsCode: '1006.30', countryOfOrigin: 'Vietnam' },
    { itemCode: 'RICE-BLK',  itemName: 'Gạo rời',                  itemNameEn: 'Bulk Rice',               productGroup: 'AGRICULTURAL', cargoForm: CargoForm.BULK,        category: 'Lương thực',  baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: null, stdNetWeight: null,  densityMtPerM3: 0.78, tolerancePctInbound: 2.5, tolerancePctOutbound: 2.0, shrinkageRatePct: 0.8, rotateBy: 'FEFO', shelfLifeDays: 300, isCatchWeight: true,  isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: null, hsCode: '1006.30', countryOfOrigin: 'Vietnam' },
    { itemCode: 'UREA-BLK',  itemName: 'Phân Urea hạt — rời',      itemNameEn: 'Urea Prilled Bulk',      productGroup: 'FERTILIZER',   cargoForm: CargoForm.BULK,        category: 'Phân bón',    baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: null, stdNetWeight: null,  densityMtPerM3: 0.77, tolerancePctInbound: 2.0, tolerancePctOutbound: 1.5, shrinkageRatePct: 0.2, rotateBy: 'FEFO', shelfLifeDays: 730, isCatchWeight: true,  isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: null, hsCode: '3102.10', countryOfOrigin: 'Vietnam' },
    { itemCode: 'UREA-50',   itemName: 'Phân Urea hạt — bao 50kg', itemNameEn: 'Urea Prilled 50kg Bag',  productGroup: 'FERTILIZER',   cargoForm: CargoForm.BAGGED_50KG, category: 'Phân bón',    baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: 50.3, stdNetWeight: 50.0, densityMtPerM3: 0.77, tolerancePctInbound: 1.5, tolerancePctOutbound: 1.0, shrinkageRatePct: 0.2, rotateBy: 'FEFO', shelfLifeDays: 730, isCatchWeight: true,  isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: 50,   hsCode: '3102.10', countryOfOrigin: 'Vietnam' },
    { itemCode: 'DAP-50',    itemName: 'Phân DAP — bao 50kg',      itemNameEn: 'DAP Fertilizer 50kg Bag', productGroup: 'FERTILIZER',   cargoForm: CargoForm.BAGGED_50KG, category: 'Phân bón',    baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: 50.3, stdNetWeight: 50.0, densityMtPerM3: 0.95, tolerancePctInbound: 1.5, tolerancePctOutbound: 1.0, shrinkageRatePct: 0.1, rotateBy: 'FEFO', shelfLifeDays: 730, isCatchWeight: false, isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: 50,   hsCode: '3105.10', countryOfOrigin: 'China' },
    { itemCode: 'STEEL-HR',  itemName: 'Thép cuộn cán nóng',       itemNameEn: 'Hot Rolled Steel Coil',   productGroup: 'STEEL',        cargoForm: CargoForm.OTHER,       category: 'Kim loại',    baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: null, stdNetWeight: null,  densityMtPerM3: 7.85, tolerancePctInbound: 0.5, tolerancePctOutbound: 0.5, shrinkageRatePct: 0.0, rotateBy: null,   shelfLifeDays: null, isCatchWeight: true, isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: null, hsCode: '7208.10', countryOfOrigin: 'Vietnam' },
    { itemCode: 'STEEL-RB',  itemName: 'Thép thanh vằn',            itemNameEn: 'Deformed Steel Bar',     productGroup: 'STEEL',        cargoForm: CargoForm.OTHER,       category: 'Kim loại',    baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: null, stdNetWeight: null,  densityMtPerM3: 7.85, tolerancePctInbound: 0.5, tolerancePctOutbound: 0.5, shrinkageRatePct: 0.0, rotateBy: null,   shelfLifeDays: null, isCatchWeight: true, isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: null, hsCode: '7214.20', countryOfOrigin: 'Vietnam' },
    { itemCode: 'CHEM-NaOH', itemName: 'Xút (NaOH) lỏng',          itemNameEn: 'Caustic Soda Liquid',    productGroup: 'CHEMICAL',     cargoForm: CargoForm.DRUM,        category: 'Hóa chất',    baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: null, stdNetWeight: null,  densityMtPerM3: 1.52, tolerancePctInbound: 1.0, tolerancePctOutbound: 1.0, shrinkageRatePct: 0.0, rotateBy: 'FEFO', shelfLifeDays: 365, isCatchWeight: true,  isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: null, hsCode: '2815.11', countryOfOrigin: 'Vietnam' },
    { itemCode: 'CLINKER',   itemName: 'Clinker xi măng',           itemNameEn: 'Cement Clinker',          productGroup: 'GENERAL',      cargoForm: CargoForm.BULK,        category: 'VLXD',        baseUom: 'KG',  billingUom: 'MT',  stdGrossWeight: null, stdNetWeight: null,  densityMtPerM3: 1.40, tolerancePctInbound: 3.0, tolerancePctOutbound: 2.0, shrinkageRatePct: 0.5, rotateBy: null,   shelfLifeDays: null, isCatchWeight: true, isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: null, hsCode: '2523.10', countryOfOrigin: 'Vietnam' },
    { itemCode: 'PKG-PP50',  itemName: 'Bao PP 50kg (vật liệu đóng gói)', itemNameEn: 'PP Bag 50kg',     productGroup: 'PACKAGING',    cargoForm: CargoForm.PACKAGING,   category: 'Bao bì',      baseUom: 'PCS', billingUom: 'PCS', stdGrossWeight: 0.12, stdNetWeight: null,  densityMtPerM3: null, tolerancePctInbound: null, tolerancePctOutbound: null, shrinkageRatePct: null, rotateBy: null,  shelfLifeDays: null, isCatchWeight: false, isStorageBillable: false, isPackaging: true,  defaultBagWeightKg: null, hsCode: '6305.33', countryOfOrigin: 'Vietnam' },
    { itemCode: 'CONT-20FT', itemName: 'Container 20ft',            itemNameEn: 'Container 20FT',          productGroup: 'GENERAL',      cargoForm: CargoForm.CONTAINER,   category: 'Container',   baseUom: 'TEU', billingUom: 'TEU', stdGrossWeight: null, stdNetWeight: null,  densityMtPerM3: null, tolerancePctInbound: null, tolerancePctOutbound: null, shrinkageRatePct: null, rotateBy: null,  shelfLifeDays: null, isCatchWeight: false, isStorageBillable: true,  isPackaging: false, defaultBagWeightKg: null, hsCode: null,      countryOfOrigin: null },
  ];

  for (const item of itemSeeds) {
    await prisma.mdItem.upsert({
      where: { itemCode: item.itemCode },
      update: {
        itemName: item.itemName, itemNameEn: item.itemNameEn, productGroup: item.productGroup, cargoForm: item.cargoForm,
        category: item.category, stdGrossWeight: item.stdGrossWeight, stdNetWeight: item.stdNetWeight,
        densityMtPerM3: item.densityMtPerM3, tolerancePctInbound: item.tolerancePctInbound,
        tolerancePctOutbound: item.tolerancePctOutbound, shrinkageRatePct: item.shrinkageRatePct,
        rotateBy: item.rotateBy, shelfLifeDays: item.shelfLifeDays, isCatchWeight: item.isCatchWeight,
        isStorageBillable: item.isStorageBillable, isPackaging: item.isPackaging,
        defaultBagWeightKg: item.defaultBagWeightKg, hsCode: item.hsCode, countryOfOrigin: item.countryOfOrigin,
        updatedBy: by,
      },
      create: {
        itemCode: item.itemCode, itemName: item.itemName, itemNameEn: item.itemNameEn,
        productGroup: item.productGroup, cargoForm: item.cargoForm, category: item.category,
        baseUomId: uomMap[item.baseUom], billingUomId: uomMap[item.billingUom],
        stdGrossWeight: item.stdGrossWeight, stdNetWeight: item.stdNetWeight,
        densityMtPerM3: item.densityMtPerM3, tolerancePctInbound: item.tolerancePctInbound,
        tolerancePctOutbound: item.tolerancePctOutbound, shrinkageRatePct: item.shrinkageRatePct,
        rotateBy: item.rotateBy, shelfLifeDays: item.shelfLifeDays, isCatchWeight: item.isCatchWeight,
        isStorageBillable: item.isStorageBillable, isPackaging: item.isPackaging,
        defaultBagWeightKg: item.defaultBagWeightKg, hsCode: item.hsCode, countryOfOrigin: item.countryOfOrigin,
        createdBy: by, updatedBy: by,
      },
    });
  }
  console.log(`  ✅ Items: ${itemSeeds.length} records`);

  // ============================================================
  // 10. Vehicle Types
  // ============================================================
  const vehicleTypeSeeds = [
    { vehicleTypeCode: 'TRUCK-5T',   vehicleTypeName: 'Xe tải 5 tấn',          category: VehicleCategory.TRUCK,     defaultTareWeightKg: 3500,    maxPayloadKg: 5000,     teuEquivalent: null,  handlingFeeGroup: 'FEE-TRUCK-S' },
    { vehicleTypeCode: 'TRUCK-10T',  vehicleTypeName: 'Xe tải 10 tấn',         category: VehicleCategory.TRUCK,     defaultTareWeightKg: 5500,    maxPayloadKg: 10000,    teuEquivalent: null,  handlingFeeGroup: 'FEE-TRUCK-M' },
    { vehicleTypeCode: 'TRUCK-15T',  vehicleTypeName: 'Xe tải 15 tấn',         category: VehicleCategory.TRUCK,     defaultTareWeightKg: 6500,    maxPayloadKg: 15000,    teuEquivalent: null,  handlingFeeGroup: 'FEE-TRUCK-L' },
    { vehicleTypeCode: 'TRUCK-20T',  vehicleTypeName: 'Xe tải 20 tấn',         category: VehicleCategory.TRUCK,     defaultTareWeightKg: 8000,    maxPayloadKg: 20000,    teuEquivalent: null,  handlingFeeGroup: 'FEE-TRUCK-XL' },
    { vehicleTypeCode: 'CONT-20',    vehicleTypeName: 'Xe container 20FT',     category: VehicleCategory.CONTAINER, defaultTareWeightKg: 9500,    maxPayloadKg: 21500,    teuEquivalent: 1.0,   handlingFeeGroup: 'FEE-CONT-20' },
    { vehicleTypeCode: 'CONT-40',    vehicleTypeName: 'Xe container 40FT',     category: VehicleCategory.CONTAINER, defaultTareWeightKg: 12000,   maxPayloadKg: 28000,    teuEquivalent: 2.0,   handlingFeeGroup: 'FEE-CONT-40' },
    { vehicleTypeCode: 'BARGE-500',  vehicleTypeName: 'Sà lan 500 tấn',        category: VehicleCategory.BARGE,     defaultTareWeightKg: 150000,  maxPayloadKg: 500000,   teuEquivalent: null,  handlingFeeGroup: 'FEE-BARGE-S' },
    { vehicleTypeCode: 'BARGE-1000', vehicleTypeName: 'Sà lan 1,000 tấn',      category: VehicleCategory.BARGE,     defaultTareWeightKg: 250000,  maxPayloadKg: 1000000,  teuEquivalent: null,  handlingFeeGroup: 'FEE-BARGE-M' },
    { vehicleTypeCode: 'BARGE-2000', vehicleTypeName: 'Sà lan 2,000 tấn',      category: VehicleCategory.BARGE,     defaultTareWeightKg: 400000,  maxPayloadKg: 2000000,  teuEquivalent: null,  handlingFeeGroup: 'FEE-BARGE-L' },
    { vehicleTypeCode: 'VESSEL-HBC', vehicleTypeName: 'Tàu hàng rời (Handysize)', category: VehicleCategory.VESSEL, defaultTareWeightKg: 4000000, maxPayloadKg: 30000000, teuEquivalent: null,  handlingFeeGroup: 'FEE-VESSEL' },
    { vehicleTypeCode: 'VESSEL-SX',  vehicleTypeName: 'Tàu hàng rời (Supramax)',  category: VehicleCategory.VESSEL, defaultTareWeightKg: 8000000, maxPayloadKg: 55000000, teuEquivalent: null,  handlingFeeGroup: 'FEE-VESSEL' },
  ];

  for (const vt of vehicleTypeSeeds) {
    await prisma.mdVehicleType.upsert({
      where: { vehicleTypeCode: vt.vehicleTypeCode },
      update: { vehicleTypeName: vt.vehicleTypeName, category: vt.category, defaultTareWeightKg: vt.defaultTareWeightKg, maxPayloadKg: vt.maxPayloadKg, teuEquivalent: vt.teuEquivalent, handlingFeeGroup: vt.handlingFeeGroup, updatedBy: by },
      create: { ...vt, createdBy: by, updatedBy: by },
    });
  }
  console.log(`  ✅ Vehicle Types: ${vehicleTypeSeeds.length} records`);

  // ============================================================
  // 11. Inventory Statuses — Mở rộng
  // ============================================================
  const statusSeeds = [
    { statusCode: 'AVAILABLE',  description: 'Sẵn sàng — có thể phân bổ xuất', displayOrder: 1, isAllocatable: true,  isSystemLocked: true },
    { statusCode: 'QC_HOLD',    description: 'Chờ kiểm tra chất lượng',         displayOrder: 2, isAllocatable: false, isSystemLocked: true },
    { statusCode: 'DAMAGED',    description: 'Hư hỏng — chờ xử lý',            displayOrder: 3, isAllocatable: false, isSystemLocked: true },
    { statusCode: 'BLOCKED',    description: 'Bị khóa nghiệp vụ',              displayOrder: 4, isAllocatable: false, isSystemLocked: true },
    { statusCode: 'IN_TRANSIT', description: 'Đang luân chuyển nội bộ',         displayOrder: 5, isAllocatable: false, isSystemLocked: true },
    { statusCode: 'EXPIRED',    description: 'Hết hạn sử dụng',                displayOrder: 6, isAllocatable: false, isSystemLocked: false },
    { statusCode: 'RESERVED',   description: 'Đã giữ cho đơn xuất',            displayOrder: 7, isAllocatable: false, isSystemLocked: true },
    { statusCode: 'DISPUTE',    description: 'Đang tranh chấp số lượng',       displayOrder: 8, isAllocatable: false, isSystemLocked: false },
  ];

  for (const s of statusSeeds) {
    await prisma.mdInventoryStatus.upsert({
      where: { statusCode: s.statusCode },
      update: { description: s.description, displayOrder: s.displayOrder, isAllocatable: s.isAllocatable, isSystemLocked: s.isSystemLocked, updatedBy: by },
      create: { ...s, createdBy: by, updatedBy: by },
    });
  }
  console.log(`  ✅ Inventory Statuses: ${statusSeeds.length} records`);

  // ============================================================
  // 12. On-Hand Seed — Tạo tồn kho mẫu cho các item mới
  // ============================================================

  // Collect item IDs
  const allItems = await prisma.mdItem.findMany({ select: { id: true, itemCode: true } });
  const itemIdMap: Record<string, string> = {};
  for (const it of allItems) itemIdMap[it.itemCode] = it.id;

  // Collect owner IDs
  const allOwners = await prisma.mdOwner.findMany({ select: { id: true, ownerCode: true } });
  const ownerIdMap: Record<string, string> = {};
  for (const o of allOwners) ownerIdMap[o.ownerCode] = o.id;

  // Collect warehouse IDs (use whMap from above + existing)
  const allWarehouses = await prisma.mdWarehouse.findMany({ select: { id: true, warehouseCode: true } });
  const whIdMap: Record<string, string> = {};
  for (const w of allWarehouses) whIdMap[w.warehouseCode] = w.id;

  // Collect location IDs
  const allLocations = await prisma.mdLocation.findMany({ select: { id: true, locationCode: true, warehouseId: true } });
  const locIdMap: Record<string, string> = {};
  for (const l of allLocations) locIdMap[l.locationCode] = l.id;

  // Collect inventory status IDs
  const allStatuses = await prisma.mdInventoryStatus.findMany({ select: { id: true, statusCode: true } });
  const statusIdMap: Record<string, string> = {};
  for (const s of allStatuses) statusIdMap[s.statusCode] = s.id;

  // Collect UOM IDs
  const allUoms = await prisma.mdUom.findMany({ select: { id: true, uomCode: true } });
  const uomIdMap: Record<string, string> = {};
  for (const u of allUoms) uomIdMap[u.uomCode] = u.id;

  // On-hand seed definitions: item + owner + warehouse + location + status + qty
  const onHandSeeds = [
    // Gạo 5% tấm — OWN-001 (TVL) tại WH-02 (Kho hàng bao)
    { item: 'RICE-5T',   owner: 'OWN-001', wh: 'WH-02', loc: 'WH02-A-01',    status: 'AVAILABLE', qty: 18500, uom: 'KG' },
    // Gạo 15% tấm — OWN-002 (NSMT) tại WH-02
    { item: 'RICE-15T',  owner: 'OWN-002', wh: 'WH-02', loc: 'WH02-A-02',    status: 'AVAILABLE', qty: 12000, uom: 'KG' },
    // Gạo rời — OWN-005 (COFCO) tại WH-01 (Kho hàng rời)
    { item: 'RICE-BLK',  owner: 'OWN-005', wh: 'WH-01', loc: 'WH01-A-01',    status: 'AVAILABLE', qty: 45000, uom: 'KG' },
    // Phân Urea rời — OWN-004 (PVFCCo) tại WH-03 (Kho phân bón)
    { item: 'UREA-BLK',  owner: 'OWN-004', wh: 'WH-03', loc: 'WH03-STG-01',  status: 'AVAILABLE', qty: 80000, uom: 'KG' },
    // Phân Urea bao — OWN-004 (PVFCCo) tại WH-03
    { item: 'UREA-50',   owner: 'OWN-004', wh: 'WH-03', loc: 'WH03-STG-02',  status: 'AVAILABLE', qty: 35000, uom: 'KG' },
    // Phân DAP bao — OWN-005 (COFCO) tại WH-03
    { item: 'DAP-50',    owner: 'OWN-005', wh: 'WH-03', loc: 'WH03-STG-01',  status: 'AVAILABLE', qty: 22000, uom: 'KG' },
    // Thép cuộn cán nóng — OWN-006 (VNSteel) tại OY-01 (Bãi hở)
    { item: 'STEEL-HR',  owner: 'OWN-006', wh: 'OY-01', loc: 'OY01-STG-01',  status: 'AVAILABLE', qty: 150000, uom: 'KG' },
    // Thép thanh vằn — OWN-006 (VNSteel) tại OY-01
    { item: 'STEEL-RB',  owner: 'OWN-006', wh: 'OY-01', loc: 'OY01-STG-02',  status: 'AVAILABLE', qty: 95000, uom: 'KG' },
    // Xút NaOH lỏng — OWN-007 (HCDA) tại WH-01
    { item: 'CHEM-NaOH', owner: 'OWN-007', wh: 'WH-01', loc: 'WH01-A-02',   status: 'AVAILABLE', qty: 8000, uom: 'KG' },
    // Clinker — OWN-001 (TVL) tại WH-01
    { item: 'CLINKER',   owner: 'OWN-001', wh: 'WH-01', loc: 'WH01-B-01',    status: 'AVAILABLE', qty: 120000, uom: 'KG' },
    // Gạo Jasmine Jumbo — OWN-001 (TVL) tại WH-02
    { item: 'RICE-JB',   owner: 'OWN-001', wh: 'WH-02', loc: 'WH02-B-01',    status: 'AVAILABLE', qty: 25000, uom: 'KG' },
    // Damaged stock examples
    { item: 'RICE-5T',   owner: 'OWN-001', wh: 'WH-02', loc: 'WH02-A-01',    status: 'DAMAGED',   qty: 500, uom: 'KG' },
    { item: 'UREA-BLK',  owner: 'OWN-004', wh: 'WH-03', loc: 'WH03-STG-01',  status: 'DAMAGED',   qty: 2000, uom: 'KG' },
  ];

  let onHandCount = 0;
  for (const oh of onHandSeeds) {
    const itemId = itemIdMap[oh.item];
    const ownerId = ownerIdMap[oh.owner];
    const warehouseId = whIdMap[oh.wh];
    const locationId = locIdMap[oh.loc];
    const statusId = statusIdMap[oh.status];
    const uomId = uomIdMap[oh.uom];

    if (!itemId || !ownerId || !warehouseId || !locationId || !statusId || !uomId) {
      console.warn(`  ⚠️ Skipping on-hand seed: ${oh.item}/${oh.owner}/${oh.wh}/${oh.loc}/${oh.status} — missing reference`);
      continue;
    }

    // Find or create InventDim
    let inventDim = await prisma.inventDim.findFirst({
      where: { warehouseId, locationId, ownerId, inventoryStatusId: statusId },
    });

    if (!inventDim) {
      const siteId = 'TVL-SITE';
      const dimHash = generateDimHash(siteId, oh.wh, oh.loc, oh.owner, oh.status);

      // Check if an InventDim with this hash already exists (from a previous run)
      inventDim = await prisma.inventDim.findUnique({ where: { dimHash } });

      if (!inventDim) {
        const seq = `${onHandCount}`.padStart(3, '0');
        inventDim = await prisma.inventDim.create({
          data: {
            dimId: `DS-${seq}-${oh.status.slice(0, 4)}`,
            dimHash,
            siteId,
            warehouseId,
            locationId,
            ownerId,
            inventoryStatusId: statusId,
            createdBy: by,
          },
        });
      }
    }

    // Upsert OnHand (unique on itemId + inventDimId)
    const existing = await prisma.onHand.findFirst({
      where: { itemId, inventDimId: inventDim.id },
    });

    if (!existing) {
      await prisma.onHand.create({
        data: {
          itemId,
          inventDimId: inventDim.id,
          physicalQty: oh.qty,
          reservedQty: 0,
          availableQty: oh.qty,
          orderedQty: 0,
          uomId,
          lastMovementAt: new Date(),
        },
      });
      onHandCount++;
    } else {
      // Update if qty changed
      await prisma.onHand.update({
        where: { id: existing.id },
        data: {
          physicalQty: oh.qty,
          availableQty: oh.qty,
          lastMovementAt: new Date(),
        },
      });
    }
  }
  console.log(`  ✅ On-Hand: ${onHandCount} new records`);

  console.log('🎉 Master Data Sample seeded successfully!');
}
