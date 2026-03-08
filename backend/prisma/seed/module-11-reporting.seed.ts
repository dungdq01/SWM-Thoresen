import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedModule11Reporting() {
  console.log('🌱 Seeding Module 11: Reporting, Audit & Go-Live Control...');

  // Seed Report Catalog
  const reportCatalog = [
    { reportId: 'RPT-INV-001', reportName: 'On-Hand Report', reportGroup: 'INVENTORY', sourceModule: 'M3', allowExport: true, maxExportRows: 100000 },
    { reportId: 'RPT-INV-002', reportName: 'Movement History', reportGroup: 'INVENTORY', sourceModule: 'M3', allowExport: true, maxExportRows: 100000 },
    { reportId: 'RPT-INV-003', reportName: 'Aging Report', reportGroup: 'INVENTORY', sourceModule: 'M3', allowExport: true, maxExportRows: 50000 },
    { reportId: 'RPT-INV-004', reportName: 'Inbound Summary', reportGroup: 'INVENTORY', sourceModule: 'M4', allowExport: true, maxExportRows: 50000 },
    { reportId: 'RPT-INV-005', reportName: 'Outbound Summary', reportGroup: 'INVENTORY', sourceModule: 'M5', allowExport: true, maxExportRows: 50000 },
    { reportId: 'RPT-INV-006', reportName: 'Location Utilization', reportGroup: 'INVENTORY', sourceModule: 'M2', allowExport: true, maxExportRows: 10000 },
    { reportId: 'RPT-BIL-001', reportName: 'Billing Events', reportGroup: 'BILLING', sourceModule: 'M10', allowExport: true, maxExportRows: 100000 },
    { reportId: 'RPT-BIL-002', reportName: 'Debit Notes', reportGroup: 'BILLING', sourceModule: 'M10', allowExport: true, maxExportRows: 50000 },
    { reportId: 'RPT-BIL-003', reportName: 'Revenue Summary', reportGroup: 'BILLING', sourceModule: 'M10', allowExport: true, maxExportRows: 10000 },
    { reportId: 'RPT-BIL-004', reportName: 'Unbilled Exceptions', reportGroup: 'BILLING', sourceModule: 'M10', allowExport: true, maxExportRows: 10000 },
    { reportId: 'RPT-AUD-001', reportName: 'User Activity Log', reportGroup: 'AUDIT', sourceModule: 'M1', allowExport: true, maxExportRows: 100000 },
    { reportId: 'RPT-AUD-002', reportName: 'State Transitions', reportGroup: 'AUDIT', sourceModule: 'M1', allowExport: true, maxExportRows: 100000 },
    { reportId: 'RPT-AUD-003', reportName: 'Posting Trace', reportGroup: 'AUDIT', sourceModule: 'M3', allowExport: true, maxExportRows: 50000 },
  ];

  for (const report of reportCatalog) {
    await prisma.rptReportCatalog.upsert({
      where: { reportId: report.reportId },
      update: report,
      create: report,
    });
  }
  console.log(`  ✅ Seeded ${reportCatalog.length} report catalog entries`);

  // Seed Reconciliation Checks
  const reconciliationChecks = [
    { checkId: 'RECON-001', checkName: 'OnHand vs InventTrans SUM', sourceModule: 'M3', compareWith: 'on_hand vs invent_trans', sortOrder: 1 },
    { checkId: 'RECON-002', checkName: 'Billing Event Completeness', sourceModule: 'M10', compareWith: 'billing_event vs source events', sortOrder: 2 },
    { checkId: 'RECON-003', checkName: 'DN Line Completeness', sourceModule: 'M10', compareWith: 'debit_note_line vs billing_event', sortOrder: 3 },
    { checkId: 'RECON-004', checkName: 'Receipt Posted Qty', sourceModule: 'M4', compareWith: 'receipt_line.received_qty vs invent_trans RECEIVE', sortOrder: 4 },
    { checkId: 'RECON-005', checkName: 'Shipment Posted Qty', sourceModule: 'M5', compareWith: 'shipment_line.shipped_qty vs invent_trans SHIP', sortOrder: 5 },
    { checkId: 'RECON-006', checkName: 'VAS Material Balance', sourceModule: 'M9', compareWith: 'vas_work_order actuals vs invent_trans VAS_*', sortOrder: 6 },
    { checkId: 'RECON-007', checkName: 'Work Completion vs Posting', sourceModule: 'M7', compareWith: 'work_line COMPLETED vs downstream posting', sortOrder: 7 },
    { checkId: 'RECON-008', checkName: 'Storage Snapshot Continuity', sourceModule: 'M10', compareWith: 'daily_storage_snapshot vs previous closing', sortOrder: 8 },
    { checkId: 'RECON-009', checkName: 'Override Audit Completeness', sourceModule: 'M1', compareWith: 'override actions vs reason_code/evidence', sortOrder: 9 },
  ];

  for (const check of reconciliationChecks) {
    await prisma.rptReconciliationCheck.upsert({
      where: { checkId: check.checkId },
      update: check,
      create: check,
    });
  }
  console.log(`  ✅ Seeded ${reconciliationChecks.length} reconciliation checks`);

  // Seed Go-Live Gates
  const goLiveGates = [
    { gateId: 'GL-001', gateName: 'Master Data Completeness', gateType: 'AUTO' as const, ownerRole: 'DATA_ADMIN', reviewerRole: 'OPS_SUPER', milestone: 'BEFORE_UAT' as const, waiverAllowed: false, displayOrder: 1 },
    { gateId: 'GL-002', gateName: 'RBAC Configured', gateType: 'AUTO' as const, ownerRole: 'SYS_ADMIN', reviewerRole: 'OPS_SUPER', milestone: 'BEFORE_UAT' as const, waiverAllowed: false, displayOrder: 2 },
    { gateId: 'GL-003', gateName: 'Number Sequences Active', gateType: 'AUTO' as const, ownerRole: 'SYS_ADMIN', reviewerRole: 'OPS_SUPER', milestone: 'BEFORE_UAT' as const, waiverAllowed: false, displayOrder: 3 },
    { gateId: 'GL-004', gateName: 'Weighbridge Connectivity', gateType: 'AUTO' as const, ownerRole: 'OPS_SUPER', reviewerRole: 'WH_MANAGER', milestone: 'BEFORE_GO_LIVE' as const, waiverAllowed: true, displayOrder: 4 },
    { gateId: 'GL-005', gateName: 'Reconciliation Clean', gateType: 'AUTO' as const, ownerRole: 'OPS_SUPER', reviewerRole: 'ADMIN', milestone: 'BEFORE_GO_LIVE' as const, waiverAllowed: false, displayOrder: 5 },
    { gateId: 'GL-006', gateName: 'No Open Critical Exceptions', gateType: 'AUTO' as const, ownerRole: 'OPS_SUPER', reviewerRole: 'ADMIN', milestone: 'BEFORE_GO_LIVE' as const, waiverAllowed: true, displayOrder: 6 },
    { gateId: 'GL-007', gateName: 'Test Evidence Uploaded', gateType: 'MANUAL' as const, ownerRole: 'QA', reviewerRole: 'PM', milestone: 'BEFORE_UAT' as const, waiverAllowed: false, displayOrder: 7 },
    { gateId: 'GL-008', gateName: 'Runbook Ready', gateType: 'MANUAL' as const, ownerRole: 'OPS_SUPER', reviewerRole: 'PM', milestone: 'BEFORE_GO_LIVE' as const, waiverAllowed: false, displayOrder: 8 },
    { gateId: 'GL-009', gateName: 'Training & Handover Done', gateType: 'MANUAL' as const, ownerRole: 'PM', reviewerRole: 'ADMIN', milestone: 'BEFORE_GO_LIVE' as const, waiverAllowed: false, displayOrder: 9 },
    { gateId: 'GL-010', gateName: 'Rollback Plan Ready', gateType: 'MANUAL' as const, ownerRole: 'OPS_SUPER', reviewerRole: 'ADMIN', milestone: 'BEFORE_GO_LIVE' as const, waiverAllowed: false, displayOrder: 10 },
  ];

  for (const gate of goLiveGates) {
    await prisma.rptGoLiveGate.upsert({
      where: { gateId: gate.gateId },
      update: gate,
      create: gate,
    });
  }
  console.log(`  ✅ Seeded ${goLiveGates.length} go-live gates`);

  console.log('✅ Module 11 seed completed!');
}
