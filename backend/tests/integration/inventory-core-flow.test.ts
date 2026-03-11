/**
 * Module 3: Inventory Core Engine — Full-Flow Integration Test
 *
 * Luồng test:
 *  1. Seed master data (warehouse, location, owner, item, UOM, status, event mapping)
 *  2. POST /postings         → RECEIPT_IN tạo InventTrans + OnHand
 *  3. GET  /onhand            → Xác nhận tồn kho
 *  4. GET  /transactions      → Xác nhận giao dịch
 *  5. POST /holds             → Tạo giữ hàng (reserve)
 *  6. GET  /onhand            → Kiểm tra reservedQty tăng, availableQty giảm
 *  7. POST /holds/:id/release → Giải phóng hold
 *  8. POST /postings          → SHIPMENT_OUT xuất kho
 *  9. POST /postings/reverse  → Đảo giao dịch xuất kho
 * 10. GET  /onhand            → Tồn kho phải trở về giá trị trước xuất
 * 11. POST /reconciliation/runs      → Chạy đối soát
 * 12. GET  /reconciliation/runs      → Liệt kê đối soát
 * 13. GET  /reconciliation/runs/:id  → Xem chi tiết
 * 14. POST .../review + .../resolve  → Xử lý kết quả (nếu có mismatch)
 * 15. Cleanup
 */

// Polyfill BigInt JSON serialization (Prisma rowVersion is BigInt, Express JSON.stringify fails)
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

import { PrismaClient } from '@prisma/client';
import express, { Express } from 'express';
import request from 'supertest';

// Import the inventory-core routes factory (CommonJS)
const { createInventoryCoreRoutes } = require('../../src/modules/inventory-core');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let prisma: PrismaClient;
let app: Express;

/** Unique suffix để tránh conflict giữa các lần chạy */
const TS = Date.now().toString(36);

const ids: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();

  // Build a minimal Express app with inventory-core routes, skipAuth = true
  app = express();
  app.use(express.json());

  const inventoryRouter = createInventoryCoreRoutes(prisma, null, null, {
    skipAuth: true,
  });
  app.use('/api/v1/inventory', inventoryRouter);

  // ---- Seed master data ----
  const warehouse = await prisma.mdWarehouse.create({
    data: {
      warehouseCode: `WH-T${TS}`,
      warehouseName: `Test Warehouse ${TS}`,
      warehouseType: 'COVERED',
      totalAreaM2: 10000,
      maxHeightM: 12,
      maxCapacityMt: 50000,
      capacityWarningPct: 85,
      isActive: true,
    },
  });
  ids.warehouseId = warehouse.id;

  const zone = await prisma.mdZone.create({
    data: {
      zoneCode: `ZONE-T${TS}`,
      zoneName: `Test Zone ${TS}`,
      zoneType: 'STORAGE',
      warehouseId: warehouse.id,
      isActive: true,
    },
  });

  const location = await prisma.mdLocation.create({
    data: {
      locationCode: `LOC-T${TS}`,
      locationType: 'STORAGE',
      locationProfile: 'STANDARD',
      warehouseId: warehouse.id,
      zoneId: zone.id,
      isActive: true,
    },
  });
  ids.locationId = location.id;

  const owner = await prisma.mdOwner.create({
    data: {
      ownerCode: `OWN-T${TS}`,
      ownerName: `Test Owner ${TS}`,
      shortName: `TOWN-${TS}`,
      ownerGroup: 'TEST',
      ownerType: 'DIRECT',
      taxCode: '0000000000',
      address: 'Test Address',
      isActive: true,
    },
  });
  ids.ownerId = owner.id;

  const uom = await prisma.mdUom.create({
    data: {
      uomCode: `KG-T${TS}`,
      description: `Kilogram Test ${TS}`,
      uomClass: 'WEIGHT',
      isBaseUom: true,
      isActive: true,
    },
  });
  ids.uomId = uom.id;

  const status = await prisma.mdInventoryStatus.create({
    data: {
      statusCode: `AV-T${TS}`,
      description: `Available Test ${TS}`,
      isAllocatable: true,
      isActive: true,
    },
  });
  ids.statusId = status.id;

  const item = await prisma.mdItem.create({
    data: {
      itemCode: `ITEM-T${TS}`,
      itemName: `Test Item ${TS}`,
      cargoForm: 'BULK',
      baseUomId: uom.id,
      billingUomId: uom.id,
      isActive: true,
    },
  });
  ids.itemId = item.id;

  // Sync NumberSequenceCounter for TRX to avoid trans_id collisions with existing seed data
  // Must use exact same date logic as generateTransId: UTC date from toISOString()
  const trxSeq = await prisma.numberSequence.findFirst({ where: { sequenceCode: 'TRX', isActive: true } });
  if (trxSeq) {
    const now = new Date();
    const utcDateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counterDate = new Date(now.toISOString().slice(0, 10));
    // Find max existing trans_id number for today (UTC)
    const maxTrans = await prisma.inventTrans.findFirst({
      where: { transId: { startsWith: `TRX-${utcDateStr}` } },
      orderBy: { transId: 'desc' },
      select: { transId: true },
    });
    if (maxTrans) {
      const parts = maxTrans.transId.split('-');
      const maxNum = parseInt(parts[parts.length - 1] || '0', 10);
      await prisma.numberSequenceCounter.upsert({
        where: {
          sequenceId_scopeKey_counterDate: {
            sequenceId: trxSeq.id,
            scopeKey: 'GLOBAL',
            counterDate,
          },
        },
        update: { lastNumber: Math.max(maxNum, 0) },
        create: {
          sequenceId: trxSeq.id,
          scopeKey: 'GLOBAL',
          counterDate,
          lastNumber: Math.max(maxNum, 0),
        },
      });
    }
  }

  // Event mappings for RECEIPT_IN and SHIPMENT_OUT
  await prisma.inventoryEventMapping.createMany({
    data: [
      {
        eventCode: `RCV_COMPLETE_T${TS}`,
        sourceModule: 'INBOUND',
        sourceObject: 'RECEIPT',
        triggerState: 'COMPLETED',
        transType: 'RECEIPT_IN',
        affectPhysical: true,
        affectHold: false,
        reversible: true,
        activeFlag: true,
      },
      {
        eventCode: `SHP_COMPLETE_T${TS}`,
        sourceModule: 'OUTBOUND',
        sourceObject: 'SHIPMENT',
        triggerState: 'COMPLETED',
        transType: 'SHIPMENT_OUT',
        affectPhysical: true,
        affectHold: false,
        reversible: true,
        activeFlag: true,
      },
    ],
    skipDuplicates: true,
  });

});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

async function cleanupTestData() {
  try {
    // Delete reconciliation results + runs
    const reconRuns = await prisma.inventoryReconciliationRun.findMany({
      where: { correlationId: { startsWith: `corr-test-${TS}` } },
      select: { id: true },
    });
    const reconRunIds = reconRuns.map((r) => r.id);
    if (reconRunIds.length > 0) {
      await prisma.inventoryReconciliationResult.deleteMany({
        where: { runId: { in: reconRunIds } },
      });
      await prisma.inventoryReconciliationRun.deleteMany({
        where: { id: { in: reconRunIds } },
      });
    }

    // Delete holds for this item
    if (ids.itemId) {
      await prisma.inventoryHold.deleteMany({
        where: { itemId: ids.itemId },
      });
    }

    // Delete reversal links
    const testTrans = await prisma.inventTrans.findMany({
      where: { correlationId: { startsWith: `corr-test-${TS}` } },
      select: { id: true },
    });
    const transIds = testTrans.map((t) => t.id);
    if (transIds.length > 0) {
      await prisma.inventoryReversalLink.deleteMany({
        where: {
          OR: [
            { originalTransId: { in: transIds } },
            { reversalTransId: { in: transIds } },
          ],
        },
      });
    }

    // Delete on-hand
    if (ids.itemId) {
      await prisma.onHand.deleteMany({ where: { itemId: ids.itemId } });
    }

    // Delete invent trans
    await prisma.inventTrans.deleteMany({
      where: { correlationId: { startsWith: `corr-test-${TS}` } },
    });

    // Delete invent dim
    if (ids.warehouseId) {
      await prisma.inventDim.deleteMany({
        where: { warehouseId: ids.warehouseId },
      });
    }

    // Delete event mappings
    await prisma.inventoryEventMapping.deleteMany({
      where: { eventCode: { endsWith: `T${TS}` } },
    });

    // Delete master data
    if (ids.itemId) await prisma.mdItem.deleteMany({ where: { id: ids.itemId } });
    if (ids.statusId) await prisma.mdInventoryStatus.deleteMany({ where: { id: ids.statusId } });
    if (ids.uomId) await prisma.mdUom.deleteMany({ where: { id: ids.uomId } });
    if (ids.ownerId) await prisma.mdOwner.deleteMany({ where: { id: ids.ownerId } });
    if (ids.locationId) await prisma.mdLocation.deleteMany({ where: { id: ids.locationId } });
    if (ids.warehouseId) {
      await prisma.mdZone.deleteMany({ where: { warehouseId: ids.warehouseId } });
      await prisma.mdWarehouse.deleteMany({ where: { id: ids.warehouseId } });
    }
  } catch (e) {
    console.error('Cleanup error (non-fatal):', e);
  }
}

// ---------------------------------------------------------------------------
// Shared state across ordered test steps
// ---------------------------------------------------------------------------
let receiptTransId: string;
let receiptTransDbId: string;
let shipmentTransId: string;
let holdId: string;
let reconRunId: string;
let reconMismatchResultId: string | null = null;

// ---------------------------------------------------------------------------
// Tests — chạy tuần tự (describe.each không cần, Jest mặc định tuần tự trong 1 file)
// ---------------------------------------------------------------------------

describe('Module 3 — Inventory Core Full-Flow', () => {
  // ── Step 1: RECEIPT_IN posting ──────────────────────────────────────────
  it('Step 1: POST /postings (RECEIPT_IN) — nhập kho 5000 kg', async () => {
    const correlationId = `corr-test-${TS}-receipt`;
    const res = await request(app)
      .post('/api/v1/inventory/postings')
      .send({
        externalId: `EXT-RCV-${TS}-001`,
        correlationId,
        eventCode: `RCV_COMPLETE_T${TS}`,
        refType: 'RECEIPT',
        refId: `RCV-${TS}-001`,
        itemId: ids.itemId,
        qty: '5000',
        uomCode: `KG-T${TS}`,
        dimTo: {
          warehouseCode: `WH-T${TS}`,
          locationCode: `LOC-T${TS}`,
          ownerCode: `OWN-T${TS}`,
          statusCode: `AV-T${TS}`,
        },
        sourceApp: 'API',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.transType).toBe('RECEIPT_IN');
    expect(Number(res.body.data.qty)).toBe(5000);
    expect(res.body.data.idempotentReplay).toBe(false);

    receiptTransId = res.body.data.transId;
    receiptTransDbId = res.body.data.transDbId;
  });

  // ── Step 1b: Idempotency check ─────────────────────────────────────────
  it('Step 1b: Idempotent replay — cùng externalId trả về 200, không tạo mới', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/postings')
      .send({
        externalId: `EXT-RCV-${TS}-001`,
        correlationId: `corr-test-${TS}-receipt`,
        eventCode: `RCV_COMPLETE_T${TS}`,
        refType: 'RECEIPT',
        refId: `RCV-${TS}-001`,
        itemId: ids.itemId,
        qty: '5000',
        uomCode: `KG-T${TS}`,
        dimTo: {
          warehouseCode: `WH-T${TS}`,
          locationCode: `LOC-T${TS}`,
          ownerCode: `OWN-T${TS}`,
          statusCode: `AV-T${TS}`,
        },
        sourceApp: 'API',
      })
      .expect(200);

    expect(res.body.data.idempotentReplay).toBe(true);
    expect(res.body.data.transId).toBe(receiptTransId);
  });

  // ── Step 2: Query on-hand ──────────────────────────────────────────────
  it('Step 2: GET /onhand — tồn kho physical = 5000', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/onhand')
      .query({ itemId: ids.itemId })
      .expect(200);

    expect(res.body.success).toBe(true);
    const rows = res.body.data;
    expect(rows.length).toBeGreaterThanOrEqual(1);

    const row = rows.find((r: any) => r.itemId === ids.itemId);
    expect(row).toBeDefined();
    expect(Number(row.physicalQty)).toBe(5000);
    expect(Number(row.reservedQty)).toBe(0);
    expect(Number(row.availableQty)).toBe(5000);
  });

  // ── Step 3: Query transactions ─────────────────────────────────────────
  it('Step 3: GET /transactions — có 1 giao dịch RECEIPT_IN', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/transactions')
      .query({ itemId: ids.itemId })
      .expect(200);

    expect(res.body.success).toBe(true);
    const txns = res.body.data;
    expect(txns.length).toBeGreaterThanOrEqual(1);

    const receipt = txns.find((t: any) => t.transId === receiptTransId);
    expect(receipt).toBeDefined();
    expect(receipt.transType).toBe('RECEIPT_IN');
  });

  // ── Step 4: Get single transaction ─────────────────────────────────────
  it('Step 4: GET /transactions/:transId — chi tiết giao dịch', async () => {
    const res = await request(app)
      .get(`/api/v1/inventory/transactions/${receiptTransId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.transId).toBe(receiptTransId);
  });

  // ── Step 5: Create hold ────────────────────────────────────────────────
  it('Step 5: POST /holds — giữ 1500 kg', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/holds')
      .send({
        correlationId: `corr-test-${TS}-hold`,
        itemId: ids.itemId,
        qty: '1500',
        dim: {
          warehouseCode: `WH-T${TS}`,
          locationCode: `LOC-T${TS}`,
          ownerCode: `OWN-T${TS}`,
          statusCode: `AV-T${TS}`,
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.idempotentReplay).toBe(false);
    expect(Number(res.body.data.holdQty)).toBe(1500);

    holdId = res.body.data.holdId;
  });

  // ── Step 6: On-hand after hold ─────────────────────────────────────────
  it('Step 6: GET /onhand — reserved = 1500, available = 3500', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/onhand')
      .query({ itemId: ids.itemId })
      .expect(200);

    const row = res.body.data.find((r: any) => r.itemId === ids.itemId);
    expect(row).toBeDefined();
    expect(Number(row.physicalQty)).toBe(5000);
    expect(Number(row.reservedQty)).toBe(1500);
    expect(Number(row.availableQty)).toBe(3500);
  });

  // ── Step 7: Release hold ───────────────────────────────────────────────
  it('Step 7: POST /holds/:id/release — giải phóng 1500', async () => {
    const res = await request(app)
      .post(`/api/v1/inventory/holds/${holdId}/release`)
      .send({
        releaseQty: '1500',
        correlationId: `corr-test-${TS}-release`,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.newStatus).toBe('RELEASED');
  });

  // ── Step 7b: On-hand after release ─────────────────────────────────────
  it('Step 7b: GET /onhand — reserved trở về 0, available = 5000', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/onhand')
      .query({ itemId: ids.itemId })
      .expect(200);

    const row = res.body.data.find((r: any) => r.itemId === ids.itemId);
    expect(Number(row.reservedQty)).toBe(0);
    expect(Number(row.availableQty)).toBe(5000);
  });

  // ── Step 8: SHIPMENT_OUT posting ───────────────────────────────────────
  it('Step 8: POST /postings (SHIPMENT_OUT) — xuất kho 2000 kg', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/postings')
      .send({
        externalId: `EXT-SHP-${TS}-001`,
        correlationId: `corr-test-${TS}-shipment`,
        eventCode: `SHP_COMPLETE_T${TS}`,
        refType: 'SHIPMENT',
        refId: `SHP-${TS}-001`,
        itemId: ids.itemId,
        qty: '2000',
        uomCode: `KG-T${TS}`,
        dimFrom: {
          warehouseCode: `WH-T${TS}`,
          locationCode: `LOC-T${TS}`,
          ownerCode: `OWN-T${TS}`,
          statusCode: `AV-T${TS}`,
        },
        sourceApp: 'API',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.transType).toBe('SHIPMENT_OUT');

    shipmentTransId = res.body.data.transId;
  });

  // ── Step 8b: On-hand after shipment ────────────────────────────────────
  it('Step 8b: GET /onhand — physical = 3000 sau xuất 2000', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/onhand')
      .query({ itemId: ids.itemId })
      .expect(200);

    const row = res.body.data.find((r: any) => r.itemId === ids.itemId);
    expect(Number(row.physicalQty)).toBe(3000);
  });

  // ── Step 9: Reverse shipment ───────────────────────────────────────────
  it('Step 9: POST /postings/reverse — đảo giao dịch xuất kho', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/postings/reverse')
      .send({
        externalId: `EXT-REV-${TS}-001`,
        correlationId: `corr-test-${TS}-reversal`,
        originalTransId: shipmentTransId,
        reasonCode: 'WRONG_SHIPMENT',
        note: 'Test reversal — sai đơn xuất',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reversalTransId).toBeDefined();
    expect(res.body.data.originalTransId).toBe(shipmentTransId);
  });

  // ── Step 9b: On-hand after reversal ────────────────────────────────────
  it('Step 9b: GET /onhand — physical trở về 5000 sau đảo', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/onhand')
      .query({ itemId: ids.itemId })
      .expect(200);

    const row = res.body.data.find((r: any) => r.itemId === ids.itemId);
    expect(Number(row.physicalQty)).toBe(5000);
    expect(Number(row.availableQty)).toBe(5000);
  });

  // ── Step 10: Check availability ────────────────────────────────────────
  it('Step 10: GET /onhand/availability — 5000 available', async () => {
    // We need the inventDimId – fetch onHand first
    const onHandRes = await request(app)
      .get('/api/v1/inventory/onhand')
      .query({ itemId: ids.itemId })
      .expect(200);

    const row = onHandRes.body.data.find((r: any) => r.itemId === ids.itemId);
    const inventDimId = row.inventDimId;

    const res = await request(app)
      .get('/api/v1/inventory/onhand/availability')
      .query({ itemId: ids.itemId, inventDimId, qty: '3000' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.available).toBe(true);
  });

  // ── Step 11: Reconciliation — create run ───────────────────────────────
  it('Step 11: POST /reconciliation/runs — chạy đối soát', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/reconciliation/runs')
      .send({
        runType: 'ON_DEMAND',
        scopeType: 'FULL',
        correlationId: `corr-test-${TS}-recon`,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(typeof res.body.data.totalChecked).toBe('number');
    expect(typeof res.body.data.mismatchCount).toBe('number');

    reconRunId = res.body.data.runId;
  });

  // ── Step 12: Reconciliation — list runs ────────────────────────────────
  it('Step 12: GET /reconciliation/runs — danh sách đối soát', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/reconciliation/runs')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ── Step 13: Reconciliation — get detail ───────────────────────────────
  it('Step 13: GET /reconciliation/runs/:id — chi tiết đối soát', async () => {
    const res = await request(app)
      .get(`/api/v1/inventory/reconciliation/runs/${reconRunId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id || res.body.data.runId).toBeDefined();

    // Nếu có mismatch, lưu resultId để test review/resolve
    const results = res.body.data.results || res.body.data.reconciliationResults || [];
    const mismatch = results.find((r: any) => r.resultStatus === 'MISMATCH' || r.status === 'MISMATCH');
    if (mismatch) {
      reconMismatchResultId = mismatch.id;
    }
  });

  // ── Step 14: Reconciliation — review + resolve nếu có mismatch ─────────
  it('Step 14a: POST .../review — xem xét kết quả (skip nếu không có mismatch)', async () => {
    if (!reconMismatchResultId) {
      console.log('  → Không có mismatch, skip review test');
      return;
    }

    const res = await request(app)
      .post(`/api/v1/inventory/reconciliation/results/${reconMismatchResultId}/review`)
      .send({ note: 'Test review' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.resultStatus).toBe('REVIEWED');
  });

  it('Step 14b: POST .../resolve — xử lý kết quả (skip nếu không có mismatch)', async () => {
    if (!reconMismatchResultId) {
      console.log('  → Không có mismatch, skip resolve test');
      return;
    }

    const res = await request(app)
      .post(`/api/v1/inventory/reconciliation/results/${reconMismatchResultId}/resolve`)
      .send({ resolutionNote: 'Test resolution' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.resultStatus).toBe('RESOLVED');
  });

  // ── Step 15: Hold lifecycle — create + get + cancel ────────────────────
  it('Step 15a: POST /holds — tạo hold mới 500 kg', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/holds')
      .send({
        correlationId: `corr-test-${TS}-hold2`,
        itemId: ids.itemId,
        qty: '500',
        dim: {
          warehouseCode: `WH-T${TS}`,
          locationCode: `LOC-T${TS}`,
          ownerCode: `OWN-T${TS}`,
          statusCode: `AV-T${TS}`,
        },
      })
      .expect(201);

    holdId = res.body.data.holdId;
  });

  it('Step 15b: GET /holds/:id — xem chi tiết hold', async () => {
    const res = await request(app)
      .get(`/api/v1/inventory/holds/${holdId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(holdId);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('Step 15c: POST /holds/:id/cancel — hủy hold', async () => {
    const res = await request(app)
      .post(`/api/v1/inventory/holds/${holdId}/cancel`)
      .send({ correlationId: `corr-test-${TS}-cancel` })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.newStatus).toBe('CANCELLED');
  });

  it('Step 15d: GET /holds — liệt kê holds', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/holds')
      .query({ itemId: ids.itemId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ── Step 16: Validation tests ──────────────────────────────────────────
  it('Step 16a: POST /postings — thiếu field bắt buộc → 400', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/postings')
      .send({
        // Missing most required fields
        correlationId: 'test',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('Step 16b: POST /postings — eventCode không tồn tại → 422', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/postings')
      .send({
        externalId: `EXT-BAD-${TS}-001`,
        correlationId: `corr-test-${TS}-bad`,
        eventCode: 'NON_EXISTENT_EVENT_CODE',
        refType: 'TEST',
        refId: 'TEST-001',
        itemId: ids.itemId,
        qty: '100',
        uomCode: `KG-T${TS}`,
        dimTo: {
          warehouseCode: `WH-T${TS}`,
          locationCode: `LOC-T${TS}`,
          ownerCode: `OWN-T${TS}`,
          statusCode: `AV-T${TS}`,
        },
        sourceApp: 'API',
      })
      .expect(422);

    expect(res.body.error).toBe('INV_INVALID_EVENT_CODE');
  });

  it('Step 16c: GET /transactions/:transId — không tồn tại → 404', async () => {
    await request(app)
      .get('/api/v1/inventory/transactions/NON-EXISTENT-TRANS-ID')
      .expect(404);
  });

  it('Step 16d: POST /postings (SHIPMENT_OUT) — vượt tồn kho → 422', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/postings')
      .send({
        externalId: `EXT-OVR-${TS}-001`,
        correlationId: `corr-test-${TS}-overstock`,
        eventCode: `SHP_COMPLETE_T${TS}`,
        refType: 'SHIPMENT',
        refId: `SHP-${TS}-OVER`,
        itemId: ids.itemId,
        qty: '999999',
        uomCode: `KG-T${TS}`,
        dimFrom: {
          warehouseCode: `WH-T${TS}`,
          locationCode: `LOC-T${TS}`,
          ownerCode: `OWN-T${TS}`,
          statusCode: `AV-T${TS}`,
        },
        sourceApp: 'API',
      })
      .expect(422);

    expect(res.body.error).toBe('INV_NEGATIVE_STOCK_BLOCKED');
  });

  // ── Step 17: Final on-hand check ───────────────────────────────────────
  it('Step 17: GET /onhand — tồn kho cuối cùng vẫn = 5000 (tất cả đảo đã hoàn nguyên)', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/onhand')
      .query({ itemId: ids.itemId })
      .expect(200);

    const row = res.body.data.find((r: any) => r.itemId === ids.itemId);
    expect(row).toBeDefined();
    expect(Number(row.physicalQty)).toBe(5000);
    // reservedQty = 0 vì hold 500 đã cancel + hold 1500 đã release
    expect(Number(row.reservedQty)).toBe(0);
    expect(Number(row.availableQty)).toBe(5000);
  });
});
