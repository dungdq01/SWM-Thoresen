# Module 4 — Inbound Operations: Fix Verification Report v2

**Previous review:** `Module_4_Fix_Verification_Report.md` (Score 8.0)
**New Score:** 8.0 / 10 (unchanged)
**Verdict:** CONDITIONAL PASS — CR-1 (M3 posting) van KHONG FIXED lan thu 4. Data integrity fixes van tot.

---

## Issue Status

| ID | Issue | Severity | v1 Status | v2 Status | Evidence |
|----|-------|----------|-----------|-----------|----------|
| CR-1 | M3 inventory posting at RECEIVED | CRITICAL | **NOT FIXED** | **NOT FIXED (lan 4)** | `receiveWeighOut()` transitions to RECEIVED, updates `receivedQty`, nhung KHONG import PostingEngine, KHONG goi `postInventory()`. Zero references to M3 posting trong toan bo module. |
| CR-2 | createReceipt not transactional | CRITICAL | **FIXED** | FIXED | Unchanged — $transaction wrap van hoat dong. |
| HI-1 | BaggedPolicy dead code | HIGH | **PARTIAL** | **PARTIAL (unchanged)** | `BaggedPolicy.checkOverReceipt()` duoc goi tai line 357-362, nhung `expectedBagCount` hardcoded = `null` (TODO comment). Guard always falsy → no-op. |
| HI-2 | Putaway handoff | HIGH | **NOT FIXED** | **NOT FIXED** | Zero putaway/work logic. Doi M7 ready — acceptable. |
| HI-3 | Receipt# concurrent-safe | HIGH | **FIXED** | FIXED | `pg_advisory_xact_lock` van hoat dong. |
| HI-4 | lockForUpdate used | HIGH | **FIXED** | FIXED | ALL state-transition methods van call `lockForUpdate()`. |
| HI-5 | AuditLog integration | HIGH | **NOT FIXED** | **NOT FIXED** | Zero audit references. Only domain-specific StatusHistory. |
| HI-6 | Single-line guard | HIGH | **FIXED** | FIXED | `lines.length > 1` guard van hoat dong. |

**Fixed: 4/8 | Partial: 1/8 | Not Fixed: 3/8 — KHONG THAY DOI SO VOI v1**

---

## CR-1: M3 Posting — Flag Lan Thu 4

**Timeline:**
| Round | Report | Status |
|-------|--------|--------|
| Initial review | Module_4_Code_Review_Report.md | FAIL — posting NOT IMPLEMENTED |
| Fix v1 | Module_4_Fix_Verification_Report.md | NOT FIXED |
| Fix v2 (this) | Module_4_Fix_Verification_Report_v2.md | **NOT FIXED — lan thu 4** |

**Evidence:**
- Zero imports cua PostingEngine hoac M3 module trong `receipt.service.js`
- `receiveWeighOut()` flow: validate → lockForUpdate → calculateNet → checkTolerance → set RECEIVED → update receivedQty → write StatusHistory → **DONE** (khong co posting step)
- `postedTransId` field tren ReceiptHeader van luon null
- State machine declares `sideEffects: ['postInventory']` nhung day chi la documentation, khong co code thuc thi

**Impact:** Day la ly do M4 ton tai. Khong co posting:
- InventTrans KHONG duoc tao → OnHand KHONG tang
- M5 Outbound se thay available stock = 0
- M10 Billing khong co inbound event data
- M4 chi la "receipt document management" chu khong phai "inbound operations"

**Fix (da cung cap 3 lan truoc):**
```javascript
// In receiveWeighOut(), after setting status RECEIVED:
const postingResult = await this.postingEngine.postInventory({
  externalId: `RCPT-${receipt.id}-${line.id}`,
  correlationId: context.correlationId,
  eventCode: 'INBOUND_RECEIVED',
  refType: 'RECEIPT',
  refId: receipt.id,
  refLineId: line.id,
  itemId: line.itemId,
  qty: netWeightKg.toString(),
  uomCode: line.uomCode || 'KG',
  dimTo: {
    warehouseCode: receipt.warehouse.warehouseCode,
    locationCode: receipt.receivingLocation.locationCode,
    ownerCode: receipt.owner.ownerCode,
    statusCode: 'AVAILABLE',
  },
  sourceApp: 'WEB',
  postedBy: context.userId,
});
await tx.receiptHeader.update({
  where: { id: receipt.id },
  data: { postedTransId: postingResult.transId },
});
```

**Prerequisite:** Event mapping `INBOUND_RECEIVED` phai co trong M3 seed data.

---

## Score — Unchanged

| Category | v1 | v2 | Note |
|----------|----|----|------|
| State machine | 95% | 95% | Unchanged |
| Tolerance | 95% | 95% | Unchanged |
| Weighing | 90% | 90% | Unchanged |
| Data integrity | 85% | 85% | $transaction + lockForUpdate + advisory lock van tot |
| M3 integration | 0% | **0%** | STILL MISSING — 4th flag |
| Completeness | 55% | 55% | BaggedPolicy still dead, putaway pending M7 |
| **Overall** | **8.0** | **8.0** | Khong co improvement |

---

## Remaining Work

| # | Priority | Issue | Effort | Note |
|---|----------|-------|--------|------|
| 1 | **CRITICAL** | Implement M3 posting at RECEIVED | 1 day | **FLAG LAN 4 — MUST FIX TRUOC MERGE** |
| 2 | HIGH | Fix BaggedPolicy.expectedBagCount (replace null TODO) | 15m | Quick fix — lookup from PO/receipt data |
| 3 | HIGH | Putaway handoff to M7 | 1 day | After M7 ready |
| 4 | HIGH | AuditLog integration | 2h | Before production |

---

## Verdict

**CONDITIONAL PASS (8.0/10) — UNCHANGED.** Dev team KHONG fix bat ky issue nao moi trong lan nay. Score giu nguyen 8.0 nho data integrity fixes tu lan truoc.

**CR-1 (M3 posting) da bi flag 4 lan lien tiep.** Day la blocking issue — M4 KHONG the merge ma khong co posting. Dev team PHAI prioritize issue nay NGAY LAP TUC. Fix code da duoc cung cap day du 3 lan truoc.
