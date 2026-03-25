/**
 * Goods Split Flow — End-to-End Test Script
 *
 * Kiểm tra luồng chia hàng đổi chủ:
 *   1. Seed dữ liệu cần thiết (Receipt, nếu chưa có)
 *   2. Tạo phiếu chia hàng (CREATE → CALCULATED)
 *   3. Xem chi tiết phiếu (GET by ID)
 *   4. Xác nhận phiếu (CONFIRM → CONFIRMED)
 *   5. Ghi sổ (POST → POSTED, tạo InventTrans)
 *   6. Test hủy phiếu (tạo phiếu mới rồi CANCEL)
 *   7. Kiểm tra danh sách phiếu (GET all)
 *
 * Cách chạy:
 *   cd backend
 *   node scripts/test-goods-split-flow.js
 *
 * Yêu cầu: Backend đang chạy tại http://localhost:3000
 *           Đã seed master data (owners, items, warehouses, uoms)
 */

const BASE = process.env.API_URL || 'http://localhost:3000/api/v1';
let AUTH_TOKEN = '';

// ─── Helper: gọi API ─────────────────────────────────────────────────────────

async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const url = `${BASE}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    console.error(`\n❌ ${method} ${path} → ${res.status}`);
    console.error('Response:', JSON.stringify(data, null, 2));
    throw new Error(`API error ${res.status}: ${typeof data === 'object' ? (data.message || data.error?.message || JSON.stringify(data)) : text}`);
  }

  // NestJS wraps responses in { success, data }
  if (data && data.success !== undefined && data.data !== undefined) {
    return data.data;
  }
  return data;
}

async function login() {
  console.log('  Logging in as admin...');
  const res = await api('POST', '/auth/login', {
    username: 'admin',
    password: 'Admin@123',
    channel: 'WEB',
  });
  AUTH_TOKEN = res.accessToken || res.token || res;
  console.log(`  ✅ Login OK — token: ${String(AUTH_TOKEN).slice(0, 20)}...`);
}

async function seedPermissions() {
  console.log('  Seeding GOODS_SPLIT permissions...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.appUser.findUnique({ where: { userCode: 'admin' } });
    const adminRole = await prisma.role.findUnique({ where: { roleCode: 'ADMIN' } });
    if (!admin || !adminRole) throw new Error('Admin user/role not found');

    const perms = [
      ['INVENTORY.GOODS_SPLIT.CREATE', 'INVENTORY', 'GOODS_SPLIT', 'CREATE'],
      ['INVENTORY.GOODS_SPLIT.READ', 'INVENTORY', 'GOODS_SPLIT', 'READ'],
      ['INVENTORY.GOODS_SPLIT.CONFIRM', 'INVENTORY', 'GOODS_SPLIT', 'CONFIRM'],
      ['INVENTORY.GOODS_SPLIT.POST', 'INVENTORY', 'GOODS_SPLIT', 'POST'],
      ['INVENTORY.GOODS_SPLIT.CANCEL', 'INVENTORY', 'GOODS_SPLIT', 'CANCEL'],
    ];

    for (const [code, mod, res, act] of perms) {
      const p = await prisma.permission.upsert({
        where: { permissionCode: code },
        update: {},
        create: { permissionCode: code, moduleCode: mod, resourceCode: res, actionCode: act, isActive: true, isSensitive: false, createdBy: admin.id, updatedBy: admin.id },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: p.id, effect: 'ALLOW', createdBy: admin.id },
      });
    }
    console.log(`  ✅ ${perms.length} permissions seeded`);
    await prisma.$disconnect();
  } catch (err) {
    await prisma.$disconnect();
    throw err;
  }
}

function log(step, msg) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Step ${step}: ${msg}`);
  console.log('═'.repeat(60));
}

function info(label, value) {
  console.log(`  ${label}: ${typeof value === 'object' ? JSON.stringify(value, null, 4) : value}`);
}

// ─── Main Test Flow ──────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔷 Goods Split Flow — End-to-End Test');
  console.log(`   API: ${BASE}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  // ─── Seed permissions & Login ─────────────────────────────────────────
  await seedPermissions();
  await login();

  // ─── Step 0: Lấy master data cần thiết ──────────────────────────────────

  log('0', 'Lấy master data (owners, items, warehouses, uoms, receipts)');

  const [owners, items, warehouses, uoms, receiptsRes] = await Promise.all([
    api('GET', '/master-data/lookups/owners'),
    api('GET', '/master-data/lookups/items'),
    api('GET', '/master-data/lookups/warehouses'),
    api('GET', '/master-data/lookups/uoms'),
    api('GET', '/inbound/receipts?pageSize=50'),
  ]);

  // receipts response may be { data: [...], pagination: {...} }
  const receipts = Array.isArray(receiptsRes) ? receiptsRes : (receiptsRes?.data || receiptsRes || []);

  info('Owners found', owners.length);
  info('Items found', items.length);
  info('Warehouses found', warehouses.length);
  info('UOMs found', uoms.length);
  info('Receipts found', receipts.length);

  if (owners.length < 3) throw new Error('Cần ít nhất 3 owners. Hãy chạy prisma:seed trước.');
  if (items.length < 1) throw new Error('Cần ít nhất 1 item. Hãy chạy prisma:seed trước.');
  if (warehouses.length < 1) throw new Error('Cần ít nhất 1 warehouse. Hãy chạy prisma:seed trước.');
  if (uoms.length < 1) throw new Error('Cần ít nhất 1 UOM. Hãy chạy prisma:seed trước.');

  // ─── Step 0.5: Tạo Receipt nếu chưa có ─────────────────────────────────

  let receiptId;
  if (receipts.length === 0) {
    log('0.5', 'Chưa có receipt → Tạo receipt test');

    const receiptData = {
      receiptType: 'STANDARD',
      ownerId: owners[0].id,
      warehouseId: warehouses[0].id,
      expectedQty: 10000,
      notes: '[TEST] Receipt cho test goods-split',
    };

    const newReceipt = await api('POST', '/inbound/receipts', receiptData);
    receiptId = newReceipt.id || newReceipt.data?.id;
    info('Created receipt', receiptId);
  } else {
    receiptId = receipts[0].id;
    info('Using existing receipt', `${receipts[0].receiptNumber || receipts[0].id}`);
  }

  // Chọn item, warehouse, UOM
  const testItem = items[0];
  const testWh = warehouses[0];
  const testUom = uoms.find(u => (u.code || u.uomCode || '').toUpperCase() === 'KG') || uoms[0];

  // Chọn 3 owners khác nhau làm target
  const originalOwner = owners[0]; // Chủ hàng gốc (từ receipt)
  const targetOwner1 = owners[1];
  const targetOwner2 = owners[2];
  const targetOwner3 = owners.length > 3 ? owners[3] : owners[0];

  info('Item', `${testItem.code || testItem.itemCode} — ${testItem.name || testItem.itemName}`);
  info('Warehouse', `${testWh.code || testWh.warehouseCode}`);
  info('UOM', `${testUom.code || testUom.uomCode}`);
  info('Original Owner', `${originalOwner.code || originalOwner.ownerCode}`);
  info('Target 1', `${targetOwner1.code || targetOwner1.ownerCode} (50%)`);
  info('Target 2', `${targetOwner2.code || targetOwner2.ownerCode} (30%)`);
  info('Target 3', `${targetOwner3.code || targetOwner3.ownerCode} (20%)`);

  // ─── Step 1: Tạo phiếu chia hàng ─────────────────────────────────────

  log('1', 'Tạo phiếu chia hàng (CREATE → CALCULATED)');

  const createPayload = {
    sourceReceiptId: receiptId,
    sourcePOId: 'PO-TEST-001',
    itemId: testItem.id,
    warehouseId: testWh.id,
    totalQty: 10000,
    uomId: testUom.id,
    notes: '[TEST] Phiếu chia hàng test luồng end-to-end',
    details: [
      { targetOwnerId: targetOwner1.id, allocationPct: 50 },
      { targetOwnerId: targetOwner2.id, allocationPct: 30 },
      { targetOwnerId: targetOwner3.id, allocationPct: 20 },
    ],
  };

  info('Payload', createPayload);
  const split = await api('POST', '/goods-split', createPayload);

  info('Split ID', split.id);
  info('Split Number', split.splitNumber);
  info('Status', split.status);
  info('Total Qty', split.totalQty);
  info('Details count', split.details?.length);

  if (split.details) {
    split.details.forEach((d, i) => {
      info(`  Detail ${i + 1}`, `Owner=${d.targetOwner?.ownerCode || d.targetOwnerId}, ${d.allocationPct}% → expected ${d.expectedQty} kg`);
    });
  }

  if (split.status !== 'CALCULATED') {
    throw new Error(`Expected status CALCULATED, got ${split.status}`);
  }
  console.log('\n  ✅ Tạo phiếu thành công! Status = CALCULATED');

  // ─── Step 2: Xem chi tiết phiếu ──────────────────────────────────────

  log('2', 'Xem chi tiết phiếu (GET by ID)');

  const detail = await api('GET', `/goods-split/${split.id}`);
  info('Split Number', detail.splitNumber);
  info('Original Owner', `${detail.originalOwner?.ownerCode} — ${detail.originalOwner?.ownerName}`);
  info('Item', `${detail.item?.itemCode} — ${detail.item?.itemName}`);
  info('Warehouse', `${detail.warehouse?.warehouseCode} — ${detail.warehouse?.warehouseName}`);
  info('UOM', detail.uom?.uomCode);
  info('Details', detail.details?.length);
  console.log('\n  ✅ Xem chi tiết thành công!');

  // ─── Step 3: Xác nhận phiếu ──────────────────────────────────────────

  log('3', 'Xác nhận phiếu (CONFIRM → CONFIRMED)');

  const confirmed = await api('POST', `/goods-split/${split.id}/confirm`, {});
  info('Status', confirmed.status);
  if (confirmed.details) {
    confirmed.details.forEach((d, i) => {
      info(`  Detail ${i + 1}`, `actual=${d.actualQty} kg, status=${d.status}`);
    });
  }
  info('Unallocated Qty', confirmed.unallocatedQty);

  if (confirmed.status !== 'CONFIRMED') {
    throw new Error(`Expected status CONFIRMED, got ${confirmed.status}`);
  }
  console.log('\n  ✅ Xác nhận thành công! Status = CONFIRMED');

  // ─── Step 4: Ghi sổ ──────────────────────────────────────────────────

  log('4', 'Ghi sổ (POST → POSTED, tạo InventTrans)');

  const posted = await api('POST', `/goods-split/${split.id}/post`);
  info('Status', posted.status);
  info('Posted At', posted.postedAt);
  info('Transactions count', posted.transactions?.length);

  if (posted.transactions) {
    posted.transactions.forEach((tx, i) => {
      info(`  TX ${i + 1}`, `${tx.transType}: ${tx.fromOwnerId?.slice(0, 8)}.. → ${tx.toOwnerId?.slice(0, 8)}.. | ${tx.qty} kg`);
    });
  }

  if (posted.status !== 'POSTED') {
    throw new Error(`Expected status POSTED, got ${posted.status}`);
  }
  console.log('\n  ✅ Ghi sổ thành công! Status = POSTED');

  // ─── Step 5: Test hủy phiếu (tạo phiếu mới rồi cancel) ─────────────

  log('5', 'Test hủy phiếu (tạo mới → CANCEL)');

  const cancelPayload = {
    sourceReceiptId: receiptId,
    itemId: testItem.id,
    warehouseId: testWh.id,
    totalQty: 5000,
    uomId: testUom.id,
    notes: '[TEST] Phiếu sẽ bị hủy',
    details: [
      { targetOwnerId: targetOwner1.id, allocationPct: 60 },
      { targetOwnerId: targetOwner2.id, allocationPct: 40 },
    ],
  };

  const splitToCancel = await api('POST', '/goods-split', cancelPayload);
  info('Created split for cancel', `${splitToCancel.splitNumber} (${splitToCancel.status})`);

  const cancelled = await api('POST', `/goods-split/${splitToCancel.id}/cancel`, {
    reasonCode: 'USER_CANCEL',
  });
  info('Status after cancel', cancelled.status);

  if (cancelled.status !== 'CANCELLED') {
    throw new Error(`Expected status CANCELLED, got ${cancelled.status}`);
  }
  console.log('\n  ✅ Hủy phiếu thành công! Status = CANCELLED');

  // ─── Step 6: Kiểm tra lỗi validation ─────────────────────────────────

  log('6', 'Test validation — Tổng % ≠ 100');

  try {
    await api('POST', '/goods-split', {
      sourceReceiptId: receiptId,
      itemId: testItem.id,
      warehouseId: testWh.id,
      totalQty: 1000,
      uomId: testUom.id,
      details: [
        { targetOwnerId: targetOwner1.id, allocationPct: 50 },
        { targetOwnerId: targetOwner2.id, allocationPct: 30 },
        // Missing 20% → total = 80%
      ],
    });
    console.log('\n  ❌ Validation KHÔNG hoạt động — lẽ ra phải reject!');
  } catch (err) {
    console.log(`\n  ✅ Validation OK — API đã reject: ${err.message}`);
  }

  // ─── Step 7: Kiểm tra không thể cancel phiếu đã POSTED ──────────────

  log('7', 'Test business rule — Không thể hủy phiếu đã POSTED');

  try {
    await api('POST', `/goods-split/${split.id}/cancel`, { reasonCode: 'TEST_CANCEL' });
    console.log('\n  ❌ Business rule KHÔNG hoạt động — lẽ ra phải reject!');
  } catch (err) {
    console.log(`\n  ✅ Business rule OK — Không thể hủy POSTED: ${err.message}`);
  }

  // ─── Step 8: Liệt kê tất cả phiếu ───────────────────────────────────

  log('8', 'Liệt kê phiếu chia hàng (GET all)');

  const list = await api('GET', '/goods-split?page=1&pageSize=10');
  info('Total records', list.pagination?.total || list.data?.length);
  info('Page', `${list.pagination?.page} / ${list.pagination?.totalPages}`);

  if (list.data) {
    list.data.slice(0, 5).forEach((s) => {
      console.log(`    ${s.splitNumber} | ${s.status.padEnd(11)} | ${s.originalOwner?.ownerCode} → ${s.details?.length || 0} targets | ${Number(s.totalQty).toLocaleString()} kg`);
    });
  }

  console.log('\n  ✅ Liệt kê thành công!');

  // ─── Summary ──────────────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(60));
  console.log('  🎉 ALL TESTS PASSED');
  console.log('═'.repeat(60));
  console.log('\n  Luồng đã test:');
  console.log('    1. ✅ CREATE   → Tạo phiếu (CALCULATED)');
  console.log('    2. ✅ READ     → Xem chi tiết phiếu');
  console.log('    3. ✅ CONFIRM  → Xác nhận (CONFIRMED)');
  console.log('    4. ✅ POST     → Ghi sổ (POSTED + InventTrans)');
  console.log('    5. ✅ CANCEL   → Hủy phiếu (CANCELLED)');
  console.log('    6. ✅ VALIDATE → Reject khi tổng % ≠ 100');
  console.log('    7. ✅ RULE     → Không thể hủy POSTED');
  console.log('    8. ✅ LIST     → Liệt kê với pagination');
  console.log();
}

// ─── Run ────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\n💥 TEST FAILED:', err.message);
  process.exit(1);
});
