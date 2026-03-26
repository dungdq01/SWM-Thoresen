import {
  BusinessRuleStatus,
  ChangeControlStatus,
  ChangePriority,
  DecisionLogStatus,
  EffectivePhase,
  Permission,
  PrismaClient,
  RolePermissionEffect,
  SequenceResetPolicy,
  SequenceScopeType,
  UomClass,
  WarehouseType,
  ZoneType,
  LocationType,
  LocationStatus,
  ServiceGroup,
  InventoryTransType,
  InventoryStage,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { seedMasterDataSample } from './seed/master-data-sample.seed';
import { seedBillingSample } from './seed/billing-sample.seed';

const prisma = new PrismaClient();

const permissionSeeds: Array<[string, string, string, string, boolean]> = [
  // Foundation permissions
  ['foundation.roles.view', 'FOUNDATION', 'ROLE', 'VIEW', false],
  ['foundation.roles.create', 'FOUNDATION', 'ROLE', 'CREATE', true],
  ['foundation.roles.update', 'FOUNDATION', 'ROLE', 'UPDATE', true],
  ['foundation.roles.assign_permission', 'FOUNDATION', 'ROLE', 'ASSIGN_PERMISSION', true],
  ['foundation.permissions.view', 'FOUNDATION', 'PERMISSION', 'VIEW', false],
  ['foundation.users.view', 'FOUNDATION', 'USER', 'VIEW', false],
  ['foundation.users.create', 'FOUNDATION', 'USER', 'CREATE', true],
  ['foundation.users.update', 'FOUNDATION', 'USER', 'UPDATE', true],
  ['foundation.users.reset_password', 'FOUNDATION', 'USER', 'RESET_PASSWORD', true],
  ['foundation.users.assign_role', 'FOUNDATION', 'USER_ROLE', 'ASSIGN', true],
  ['foundation.permissions.me.view', 'FOUNDATION', 'ME_PERMISSION', 'VIEW', false],
  ['foundation.reason_codes.view', 'FOUNDATION', 'REASON_CODE', 'VIEW', false],
  ['foundation.reason_codes.create', 'FOUNDATION', 'REASON_CODE', 'CREATE', true],
  ['foundation.reason_codes.update', 'FOUNDATION', 'REASON_CODE', 'UPDATE', true],
  ['foundation.reason_codes.deactivate', 'FOUNDATION', 'REASON_CODE', 'DEACTIVATE', true],
  ['foundation.number_sequences.view', 'FOUNDATION', 'NUMBER_SEQUENCE', 'VIEW', false],
  ['foundation.number_sequences.create', 'FOUNDATION', 'NUMBER_SEQUENCE', 'CREATE', true],
  ['foundation.number_sequences.update', 'FOUNDATION', 'NUMBER_SEQUENCE', 'UPDATE', true],
  ['foundation.number_sequences.next', 'FOUNDATION', 'NUMBER_SEQUENCE', 'NEXT', true],
  ['foundation.rules.view', 'FOUNDATION', 'BUSINESS_RULE', 'VIEW', false],
  ['foundation.rules.create', 'FOUNDATION', 'BUSINESS_RULE', 'CREATE', true],
  ['foundation.rules.update', 'FOUNDATION', 'BUSINESS_RULE', 'UPDATE', true],
  ['foundation.decision_logs.view', 'FOUNDATION', 'DECISION_LOG', 'VIEW', false],
  ['foundation.decision_logs.create', 'FOUNDATION', 'DECISION_LOG', 'CREATE', true],
  ['foundation.change_controls.create', 'FOUNDATION', 'CHANGE_CONTROL', 'CREATE', true],
  ['foundation.audit_logs.view', 'FOUNDATION', 'AUDIT_LOG', 'VIEW', true],
  ['foundation.exception_logs.view', 'FOUNDATION', 'EXCEPTION_LOG', 'VIEW', true],
  ['foundation.exception_logs.resolve', 'FOUNDATION', 'EXCEPTION_LOG', 'RESOLVE', true],
  ['foundation.idempotency.view', 'FOUNDATION', 'IDEMPOTENCY', 'VIEW', true],
  // Module 2: Master Data permissions
  ['master_data.lookup.view', 'MASTER_DATA', 'LOOKUP', 'VIEW', false],
  ['master_data.owner.view', 'MASTER_DATA', 'OWNER', 'VIEW', false],
  ['master_data.owner.create', 'MASTER_DATA', 'OWNER', 'CREATE', true],
  ['master_data.owner.update', 'MASTER_DATA', 'OWNER', 'UPDATE', true],
  ['master_data.owner.deactivate', 'MASTER_DATA', 'OWNER', 'DEACTIVATE', true],
  ['master_data.owner.reactivate', 'MASTER_DATA', 'OWNER', 'REACTIVATE', true],
  ['master_data.vendor.view', 'MASTER_DATA', 'VENDOR', 'VIEW', false],
  ['master_data.vendor.create', 'MASTER_DATA', 'VENDOR', 'CREATE', true],
  ['master_data.vendor.update', 'MASTER_DATA', 'VENDOR', 'UPDATE', true],
  ['master_data.vendor.deactivate', 'MASTER_DATA', 'VENDOR', 'DEACTIVATE', true],
  ['master_data.vendor.reactivate', 'MASTER_DATA', 'VENDOR', 'REACTIVATE', true],
  ['master_data.item.view', 'MASTER_DATA', 'ITEM', 'VIEW', false],
  ['master_data.item.create', 'MASTER_DATA', 'ITEM', 'CREATE', true],
  ['master_data.item.update', 'MASTER_DATA', 'ITEM', 'UPDATE', true],
  ['master_data.item.deactivate', 'MASTER_DATA', 'ITEM', 'DEACTIVATE', true],
  ['master_data.item.reactivate', 'MASTER_DATA', 'ITEM', 'REACTIVATE', true],
  ['master_data.warehouse.view', 'MASTER_DATA', 'WAREHOUSE', 'VIEW', false],
  ['master_data.warehouse.create', 'MASTER_DATA', 'WAREHOUSE', 'CREATE', true],
  ['master_data.warehouse.update', 'MASTER_DATA', 'WAREHOUSE', 'UPDATE', true],
  ['master_data.warehouse.deactivate', 'MASTER_DATA', 'WAREHOUSE', 'DEACTIVATE', true],
  ['master_data.warehouse.reactivate', 'MASTER_DATA', 'WAREHOUSE', 'REACTIVATE', true],
  ['master_data.vessel.view', 'MASTER_DATA', 'VESSEL', 'VIEW', false],
  ['master_data.vessel.create', 'MASTER_DATA', 'VESSEL', 'CREATE', true],
  ['master_data.vessel.update', 'MASTER_DATA', 'VESSEL', 'UPDATE', true],
  ['master_data.vessel.deactivate', 'MASTER_DATA', 'VESSEL', 'DEACTIVATE', true],
  ['master_data.vessel.reactivate', 'MASTER_DATA', 'VESSEL', 'REACTIVATE', true],
  ['master_data.zone.view', 'MASTER_DATA', 'ZONE', 'VIEW', false],
  ['master_data.zone.create', 'MASTER_DATA', 'ZONE', 'CREATE', true],
  ['master_data.zone.update', 'MASTER_DATA', 'ZONE', 'UPDATE', true],
  ['master_data.zone.deactivate', 'MASTER_DATA', 'ZONE', 'DEACTIVATE', true],
  ['master_data.zone.reactivate', 'MASTER_DATA', 'ZONE', 'REACTIVATE', true],
  ['master_data.location.view', 'MASTER_DATA', 'LOCATION', 'VIEW', false],
  ['master_data.location.create', 'MASTER_DATA', 'LOCATION', 'CREATE', true],
  ['master_data.location.update', 'MASTER_DATA', 'LOCATION', 'UPDATE', true],
  ['master_data.location.deactivate', 'MASTER_DATA', 'LOCATION', 'DEACTIVATE', true],
  ['master_data.location.reactivate', 'MASTER_DATA', 'LOCATION', 'REACTIVATE', true],
  ['master_data.uom.view', 'MASTER_DATA', 'UOM', 'VIEW', false],
  ['master_data.uom.create', 'MASTER_DATA', 'UOM', 'CREATE', true],
  ['master_data.uom.update', 'MASTER_DATA', 'UOM', 'UPDATE', true],
  ['master_data.uom.deactivate', 'MASTER_DATA', 'UOM', 'DEACTIVATE', true],
  ['master_data.uom.reactivate', 'MASTER_DATA', 'UOM', 'REACTIVATE', true],
  ['master_data.vehicle_type.view', 'MASTER_DATA', 'VEHICLE_TYPE', 'VIEW', false],
  ['master_data.vehicle_type.create', 'MASTER_DATA', 'VEHICLE_TYPE', 'CREATE', true],
  ['master_data.vehicle_type.update', 'MASTER_DATA', 'VEHICLE_TYPE', 'UPDATE', true],
  ['master_data.vehicle_type.deactivate', 'MASTER_DATA', 'VEHICLE_TYPE', 'DEACTIVATE', true],
  ['master_data.vehicle_type.reactivate', 'MASTER_DATA', 'VEHICLE_TYPE', 'REACTIVATE', true],
  ['master_data.inventory_status.view', 'MASTER_DATA', 'INVENTORY_STATUS', 'VIEW', false],
  ['master_data.inventory_status.update', 'MASTER_DATA', 'INVENTORY_STATUS', 'UPDATE', true],
  ['master_data.service_code.view', 'MASTER_DATA', 'SERVICE_CODE', 'VIEW', false],
  ['master_data.service_code.create', 'MASTER_DATA', 'SERVICE_CODE', 'CREATE', true],
  ['master_data.service_code.update', 'MASTER_DATA', 'SERVICE_CODE', 'UPDATE', true],
  ['master_data.day_type.view', 'MASTER_DATA', 'DAY_TYPE', 'VIEW', false],
  ['master_data.day_type.create', 'MASTER_DATA', 'DAY_TYPE', 'CREATE', true],
  ['master_data.day_type.update', 'MASTER_DATA', 'DAY_TYPE', 'UPDATE', true],
  ['master_data.rate_reference.view', 'MASTER_DATA', 'RATE_REFERENCE', 'VIEW', false],
  ['master_data.rate_reference.create', 'MASTER_DATA', 'RATE_REFERENCE', 'CREATE', true],
  ['master_data.rate_reference.update', 'MASTER_DATA', 'RATE_REFERENCE', 'UPDATE', true],
  ['master_data.rate_reference.deactivate', 'MASTER_DATA', 'RATE_REFERENCE', 'DEACTIVATE', true],
  ['master_data.owner_item_policy.view', 'MASTER_DATA', 'OWNER_ITEM_POLICY', 'VIEW', false],
  ['master_data.owner_item_policy.create', 'MASTER_DATA', 'OWNER_ITEM_POLICY', 'CREATE', true],
  ['master_data.owner_item_policy.update', 'MASTER_DATA', 'OWNER_ITEM_POLICY', 'UPDATE', true],
  ['master_data.import.preview', 'MASTER_DATA', 'IMPORT', 'PREVIEW', true],
  ['master_data.import.commit', 'MASTER_DATA', 'IMPORT', 'COMMIT', true],
  ['master_data.import.view', 'MASTER_DATA', 'IMPORT', 'VIEW', false],
  // Customer
  ['master_data.customer.view', 'MASTER_DATA', 'CUSTOMER', 'VIEW', false],
  ['master_data.customer.create', 'MASTER_DATA', 'CUSTOMER', 'CREATE', true],
  ['master_data.customer.update', 'MASTER_DATA', 'CUSTOMER', 'UPDATE', true],
  ['master_data.customer.deactivate', 'MASTER_DATA', 'CUSTOMER', 'DEACTIVATE', true],
  ['master_data.customer.reactivate', 'MASTER_DATA', 'CUSTOMER', 'REACTIVATE', true],
  // Dropdown Config
  ['master_data.dropdown.view', 'MASTER_DATA', 'DROPDOWN', 'VIEW', false],
  ['master_data.dropdown.create', 'MASTER_DATA', 'DROPDOWN', 'CREATE', true],
  ['master_data.dropdown.update', 'MASTER_DATA', 'DROPDOWN', 'UPDATE', true],
  ['master_data.dropdown.delete', 'MASTER_DATA', 'DROPDOWN', 'DELETE', true],
  // UOM Conversion
  ['master_data.uom_conversion.view', 'MASTER_DATA', 'UOM_CONVERSION', 'VIEW', false],
  ['master_data.uom_conversion.create', 'MASTER_DATA', 'UOM_CONVERSION', 'CREATE', true],
  ['master_data.uom_conversion.update', 'MASTER_DATA', 'UOM_CONVERSION', 'UPDATE', true],
  ['master_data.uom_conversion.delete', 'MASTER_DATA', 'UOM_CONVERSION', 'DELETE', true],
  // Lot Management
  ['master_data.lot.view', 'MASTER_DATA', 'LOT', 'VIEW', false],
  ['master_data.lot.create', 'MASTER_DATA', 'LOT', 'CREATE', true],
  ['master_data.lot.update', 'MASTER_DATA', 'LOT', 'UPDATE', true],
  ['master_data.lot.deactivate', 'MASTER_DATA', 'LOT', 'DEACTIVATE', true],
  ['master_data.lot.reactivate', 'MASTER_DATA', 'LOT', 'REACTIVATE', true],
  // Owner SKU Mapping
  ['master_data.owner_sku_mapping.view', 'MASTER_DATA', 'OWNER_SKU_MAPPING', 'VIEW', false],
  ['master_data.owner_sku_mapping.create', 'MASTER_DATA', 'OWNER_SKU_MAPPING', 'CREATE', true],
  ['master_data.owner_sku_mapping.update', 'MASTER_DATA', 'OWNER_SKU_MAPPING', 'UPDATE', true],
  ['master_data.owner_sku_mapping.delete', 'MASTER_DATA', 'OWNER_SKU_MAPPING', 'DELETE', true],
  // Owner Warehouse Access
  ['master_data.owner_warehouse_access.view', 'MASTER_DATA', 'OWNER_WAREHOUSE_ACCESS', 'VIEW', false],
  ['master_data.owner_warehouse_access.create', 'MASTER_DATA', 'OWNER_WAREHOUSE_ACCESS', 'CREATE', true],
  ['master_data.owner_warehouse_access.delete', 'MASTER_DATA', 'OWNER_WAREHOUSE_ACCESS', 'DELETE', true],
  // Item Incompatibility
  ['master_data.item_incompatibility.view', 'MASTER_DATA', 'ITEM_INCOMPATIBILITY', 'VIEW', false],
  ['master_data.item_incompatibility.create', 'MASTER_DATA', 'ITEM_INCOMPATIBILITY', 'CREATE', true],
  ['master_data.item_incompatibility.update', 'MASTER_DATA', 'ITEM_INCOMPATIBILITY', 'UPDATE', true],
  ['master_data.item_incompatibility.deactivate', 'MASTER_DATA', 'ITEM_INCOMPATIBILITY', 'DEACTIVATE', true],
  ['master_data.item_incompatibility.reactivate', 'MASTER_DATA', 'ITEM_INCOMPATIBILITY', 'REACTIVATE', true],
  // Carrier
  ['master_data.carrier.view', 'MASTER_DATA', 'CARRIER', 'VIEW', false],
  ['master_data.carrier.create', 'MASTER_DATA', 'CARRIER', 'CREATE', true],
  ['master_data.carrier.update', 'MASTER_DATA', 'CARRIER', 'UPDATE', true],
  ['master_data.carrier.deactivate', 'MASTER_DATA', 'CARRIER', 'DEACTIVATE', true],
  ['master_data.carrier.reactivate', 'MASTER_DATA', 'CARRIER', 'REACTIVATE', true],
  // Inbound: Purchase Orders
  ['inbound.po.view', 'INBOUND', 'PO', 'VIEW', false],
  ['inbound.po.create', 'INBOUND', 'PO', 'CREATE', true],
  ['inbound.po.update', 'INBOUND', 'PO', 'UPDATE', true],
  ['inbound.po.confirm', 'INBOUND', 'PO', 'CONFIRM', true],
  ['inbound.po.close', 'INBOUND', 'PO', 'CLOSE', true],
  ['inbound.po.cancel', 'INBOUND', 'PO', 'CANCEL', true],
  // Inbound: Receipts
  ['inbound.receipt.view', 'INBOUND', 'RECEIPT', 'VIEW', false],
  ['inbound.receipt.create', 'INBOUND', 'RECEIPT', 'CREATE', true],
  ['inbound.receipt.confirm', 'INBOUND', 'RECEIPT', 'CONFIRM', true],
  ['inbound.receipt.cancel', 'INBOUND', 'RECEIPT', 'CANCEL', true],
  ['inbound.receipt.reweigh', 'INBOUND', 'RECEIPT', 'REWEIGH', true],
  ['inbound.receipt.close', 'INBOUND', 'RECEIPT', 'CLOSE', true],
  ['inbound.weigh.receive', 'INBOUND', 'WEIGH', 'RECEIVE', true],
  ['inbound.dashboard.view', 'INBOUND', 'DASHBOARD', 'VIEW', false],
  // Sales Orders
  ['sales_order.view', 'SALES_ORDER', 'SALES_ORDER', 'VIEW', false],
  ['sales_order.create', 'SALES_ORDER', 'SALES_ORDER', 'CREATE', true],
  ['sales_order.update', 'SALES_ORDER', 'SALES_ORDER', 'UPDATE', true],
  ['sales_order.confirm', 'SALES_ORDER', 'SALES_ORDER', 'CONFIRM', true],
  ['sales_order.cancel', 'SALES_ORDER', 'SALES_ORDER', 'CANCEL', true],
  ['sales_order.close', 'SALES_ORDER', 'SALES_ORDER', 'CLOSE', true],
  ['sales_order.release', 'SALES_ORDER', 'SALES_ORDER', 'RELEASE', true],
  ['sales_order.dashboard.view', 'SALES_ORDER', 'DASHBOARD', 'VIEW', false],
  // Outbound: Shipments & Operations
  ['OUTBOUND.SHIPMENT.CREATE', 'OUTBOUND', 'SHIPMENT', 'CREATE', true],
  ['OUTBOUND.SHIPMENT.READ', 'OUTBOUND', 'SHIPMENT', 'READ', false],
  ['OUTBOUND.SHIPMENT.CONFIRM', 'OUTBOUND', 'SHIPMENT', 'CONFIRM', true],
  ['OUTBOUND.SHIPMENT.CANCEL', 'OUTBOUND', 'SHIPMENT', 'CANCEL', true],
  ['OUTBOUND.SHIPMENT.SHIP', 'OUTBOUND', 'SHIPMENT', 'SHIP', true],
  ['OUTBOUND.ALLOCATION.EXECUTE', 'OUTBOUND', 'ALLOCATION', 'EXECUTE', true],
  ['OUTBOUND.WEIGH.RECEIVE', 'OUTBOUND', 'WEIGH', 'RECEIVE', true],
  ['OUTBOUND.APPROVAL.DECIDE', 'OUTBOUND', 'APPROVAL', 'DECIDE', true],
  ['OUTBOUND.DASHBOARD.READ', 'OUTBOUND', 'DASHBOARD', 'READ', false],
  // Module 6: Inventory Control - Move Orders
  ['inventory.control.move.read', 'INVENTORY_CONTROL', 'MOVE_ORDER', 'READ', false],
  ['inventory.control.move.create', 'INVENTORY_CONTROL', 'MOVE_ORDER', 'CREATE', true],
  ['inventory.control.move.confirm', 'INVENTORY_CONTROL', 'MOVE_ORDER', 'CONFIRM', true],
  ['inventory.control.move.execute', 'INVENTORY_CONTROL', 'MOVE_ORDER', 'EXECUTE', true],
  ['inventory.control.move.cancel', 'INVENTORY_CONTROL', 'MOVE_ORDER', 'CANCEL', true],
  // Module 6: Inventory Control - Transfer Orders
  ['inventory.control.transfer.read', 'INVENTORY_CONTROL', 'TRANSFER_ORDER', 'READ', false],
  ['inventory.control.transfer.create', 'INVENTORY_CONTROL', 'TRANSFER_ORDER', 'CREATE', true],
  ['inventory.control.transfer.release', 'INVENTORY_CONTROL', 'TRANSFER_ORDER', 'RELEASE', true],
  ['inventory.control.transfer.ship', 'INVENTORY_CONTROL', 'TRANSFER_ORDER', 'SHIP', true],
  ['inventory.control.transfer.receive', 'INVENTORY_CONTROL', 'TRANSFER_ORDER', 'RECEIVE', true],
  ['inventory.control.transfer.close', 'INVENTORY_CONTROL', 'TRANSFER_ORDER', 'CLOSE', true],
  ['inventory.control.transfer.cancel', 'INVENTORY_CONTROL', 'TRANSFER_ORDER', 'CANCEL', true],
  // Module 6: Inventory Control - Status Change
  ['inventory.control.status.read', 'INVENTORY_CONTROL', 'STATUS_CHANGE', 'READ', false],
  ['inventory.control.status.create', 'INVENTORY_CONTROL', 'STATUS_CHANGE', 'CREATE', true],
  ['inventory.control.status.execute', 'INVENTORY_CONTROL', 'STATUS_CHANGE', 'EXECUTE', true],
  ['inventory.control.status.cancel', 'INVENTORY_CONTROL', 'STATUS_CHANGE', 'CANCEL', true],
  // Module 6: Inventory Control - Cycle Count
  ['inventory.control.cycle_count.read', 'INVENTORY_CONTROL', 'CYCLE_COUNT', 'READ', false],
  ['inventory.control.cycle_count.create', 'INVENTORY_CONTROL', 'CYCLE_COUNT', 'CREATE', true],
  ['inventory.control.cycle_count.release', 'INVENTORY_CONTROL', 'CYCLE_COUNT', 'RELEASE', true],
  ['inventory.control.cycle_count.approve', 'INVENTORY_CONTROL', 'CYCLE_COUNT', 'APPROVE', true],
  ['inventory.control.cycle_count.post', 'INVENTORY_CONTROL', 'CYCLE_COUNT', 'POST', true],
  // Module 6: Inventory Control - Adjustment
  ['inventory.control.adjustment.read', 'INVENTORY_CONTROL', 'ADJUSTMENT', 'READ', false],
  ['inventory.control.adjustment.create', 'INVENTORY_CONTROL', 'ADJUSTMENT', 'CREATE', true],
  ['inventory.control.adjustment.submit', 'INVENTORY_CONTROL', 'ADJUSTMENT', 'SUBMIT', true],
  ['inventory.control.adjustment.approve', 'INVENTORY_CONTROL', 'ADJUSTMENT', 'APPROVE', true],
  ['inventory.control.adjustment.post', 'INVENTORY_CONTROL', 'ADJUSTMENT', 'POST', true],
  // Module 6: Inventory Control - On-Hand & Movement History
  ['inventory.control.onhand.read', 'INVENTORY_CONTROL', 'ONHAND', 'READ', false],
  ['inventory.control.movement.read', 'INVENTORY_CONTROL', 'MOVEMENT', 'READ', false],
  // Module 7: Work Execution
  ['work.execution.read', 'WORK_EXECUTION', 'WORK', 'READ', false],
  ['work.execution.claim', 'WORK_EXECUTION', 'WORK', 'CLAIM', true],
  ['work.execution.start', 'WORK_EXECUTION', 'WORK', 'START', true],
  ['work.execution.complete', 'WORK_EXECUTION', 'WORK', 'COMPLETE', true],
  ['work.execution.skip', 'WORK_EXECUTION', 'WORK', 'SKIP', true],
  ['work.execution.cancel', 'WORK_EXECUTION', 'WORK', 'CANCEL', true],
  ['work.dashboard.read', 'WORK_EXECUTION', 'DASHBOARD', 'READ', false],
  // Module 8: Integration Monitoring
  ['integration.monitoring.read', 'INTEGRATION', 'MONITORING', 'READ', false],
  ['integration.alerts.read', 'INTEGRATION', 'ALERTS', 'READ', false],
  ['integration.alerts.manage', 'INTEGRATION', 'ALERTS', 'MANAGE', true],
  ['integration.weighbridge.read', 'INTEGRATION', 'WEIGHBRIDGE', 'READ', false],
  ['integration.weighbridge.manage', 'INTEGRATION', 'WEIGHBRIDGE', 'MANAGE', true],
  // Legacy integration-platform permissions (uppercase format)
  ['INTEGRATION.MONITORING.VIEW', 'INTEGRATION', 'MONITORING', 'VIEW', false],
  ['INTEGRATION.ALERT.READ', 'INTEGRATION', 'ALERT', 'READ', false],
  ['INTEGRATION.ALERT.ACKNOWLEDGE', 'INTEGRATION', 'ALERT', 'ACKNOWLEDGE', true],
  ['INTEGRATION.ALERT.RESOLVE', 'INTEGRATION', 'ALERT', 'RESOLVE', true],
  ['INTEGRATION.WEIGHBRIDGE.READ', 'INTEGRATION', 'WEIGHBRIDGE_LOG', 'READ', false],
  ['INTEGRATION.WEIGHBRIDGE.INGEST', 'INTEGRATION', 'WEIGHBRIDGE_LOG', 'INGEST', true],
  ['INTEGRATION.WEIGHBRIDGE.MANUAL_CREATE', 'INTEGRATION', 'WEIGHBRIDGE_LOG', 'MANUAL_CREATE', true],
  ['INTEGRATION.WEIGHBRIDGE.REPROCESS', 'INTEGRATION', 'WEIGHBRIDGE_LOG', 'REPROCESS', true],
  ['INTEGRATION.WEIGHBRIDGE.MANAGE', 'INTEGRATION', 'WEIGHBRIDGE_LOG', 'MANAGE', true],
  ['INTEGRATION.WEIGHBRIDGE_DEVICE.READ', 'INTEGRATION', 'WB_DEVICE', 'READ', false],
  ['INTEGRATION.WEIGHBRIDGE_DEVICE.HEARTBEAT', 'INTEGRATION', 'WB_DEVICE', 'HEARTBEAT', true],
  // Module 8: OCR
  ['INTEGRATION.OCR.UPLOAD', 'INTEGRATION', 'OCR', 'UPLOAD', true],
  ['INTEGRATION.OCR.READ', 'INTEGRATION', 'OCR', 'READ', false],
  ['INTEGRATION.OCR.CONFIRM', 'INTEGRATION', 'OCR', 'CONFIRM', true],
  ['INTEGRATION.OCR.LINK', 'INTEGRATION', 'OCR', 'LINK', true],
  ['INTEGRATION.OCR.REJECT', 'INTEGRATION', 'OCR', 'REJECT', true],
  // Module 9: Billing
  ['BILLING.CONTRACT.READ', 'BILLING', 'CONTRACT', 'READ', false],
  ['BILLING.CONTRACT.CREATE', 'BILLING', 'CONTRACT', 'CREATE', true],
  ['BILLING.CONTRACT.UPDATE', 'BILLING', 'CONTRACT', 'UPDATE', true],
  ['BILLING.DAY_TYPE.MANAGE', 'BILLING', 'DAY_TYPE', 'MANAGE', true],
  ['BILLING.EVENT.READ', 'BILLING', 'EVENT', 'READ', false],
  ['BILLING.EXCEPTION.READ', 'BILLING', 'EXCEPTION', 'READ', false],
  ['BILLING.EXCEPTION.RESOLVE', 'BILLING', 'EXCEPTION', 'RESOLVE', true],
  ['BILLING.DN.READ', 'BILLING', 'DN', 'READ', false],
  ['BILLING.DN.GENERATE', 'BILLING', 'DN', 'GENERATE', true],
  ['BILLING.DN.REVIEW', 'BILLING', 'DN', 'REVIEW', true],
  ['BILLING.DN.APPROVE', 'BILLING', 'DN', 'APPROVE', true],
  ['BILLING.DN.LOCK', 'BILLING', 'DN', 'LOCK', true],
  // Module 9: VAS (Value-Added Services)
  ['VAS.WO.READ', 'VAS', 'WORK_ORDER', 'READ', false],
  ['VAS.WO.CREATE', 'VAS', 'WORK_ORDER', 'CREATE', true],
  ['VAS.WO.UPDATE', 'VAS', 'WORK_ORDER', 'UPDATE', true],
  ['VAS.WO.CONFIRM', 'VAS', 'WORK_ORDER', 'CONFIRM', true],
  ['VAS.WO.COMPLETE', 'VAS', 'WORK_ORDER', 'COMPLETE', true],
  ['VAS.WO.CANCEL', 'VAS', 'WORK_ORDER', 'CANCEL', true],
  ['VAS.SESSION.READ', 'VAS', 'SESSION', 'READ', false],
  ['VAS.SESSION.CREATE', 'VAS', 'SESSION', 'CREATE', true],
  ['VAS.DASHBOARD.READ', 'VAS', 'DASHBOARD', 'READ', false],
  // Module 11: Reporting
  ['REPORTING.DASHBOARD.READ', 'REPORTING', 'DASHBOARD', 'READ', false],
  ['REPORTING.INVENTORY.READ', 'REPORTING', 'INVENTORY', 'READ', false],
  ['REPORTING.BILLING.READ', 'REPORTING', 'BILLING', 'READ', false],
  ['REPORTING.AUDIT.READ', 'REPORTING', 'AUDIT', 'READ', false],
  ['REPORTING.RECONCILIATION.RUN', 'REPORTING', 'RECONCILIATION', 'RUN', true],
  ['REPORTING.RECONCILIATION.READ', 'REPORTING', 'RECONCILIATION', 'READ', false],
  ['REPORTING.RECONCILIATION.RESOLVE', 'REPORTING', 'RECONCILIATION', 'RESOLVE', true],
  ['REPORTING.GOLIVE.READ', 'REPORTING', 'GOLIVE', 'READ', false],
  ['REPORTING.GOLIVE.CHECK', 'REPORTING', 'GOLIVE', 'CHECK', true],
  ['REPORTING.GOLIVE.SIGNOFF', 'REPORTING', 'GOLIVE', 'SIGNOFF', true],
  ['REPORTING.EXPORT.CREATE', 'REPORTING', 'EXPORT', 'CREATE', true],
  ['REPORTING.EXPORT.READ', 'REPORTING', 'EXPORT', 'READ', false],
];

async function main() {
  const admin = await prisma.appUser.upsert({
    where: { userCode: 'admin' },
    update: { fullName: 'System Admin', isActive: true },
    create: {
      userCode: 'admin',
      username: 'admin',
      fullName: 'System Admin',
      email: 'admin@swms.local',
    },
  });

  // Seed auth credentials for admin user
  const adminPasswordHash = await argon2.hash('Admin@123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await prisma.authLocalCredential.upsert({
    where: { userId: admin.id },
    update: { passwordHash: adminPasswordHash, mustChangePassword: false },
    create: {
      userId: admin.id,
      passwordHash: adminPasswordHash,
      passwordAlgo: 'ARGON2ID',
      mustChangePassword: false,
    },
  });

  const governance = await prisma.appUser.upsert({
    where: { userCode: 'gov_manager' },
    update: { fullName: 'Governance Manager', isActive: true },
    create: {
      userCode: 'gov_manager',
      username: 'gov_manager',
      fullName: 'Governance Manager',
      email: 'governance@swms.local',
    },
  });

  // Seed auth credentials for governance user
  const govPasswordHash = await argon2.hash('Gov@123456', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await prisma.authLocalCredential.upsert({
    where: { userId: governance.id },
    update: { passwordHash: govPasswordHash, mustChangePassword: false },
    create: {
      userId: governance.id,
      passwordHash: govPasswordHash,
      passwordAlgo: 'ARGON2ID',
      mustChangePassword: false,
    },
  });

  const billingOfficer = await prisma.appUser.upsert({
    where: { userCode: 'billing_officer' },
    update: { fullName: 'Billing Officer', isActive: true },
    create: {
      userCode: 'billing_officer',
      username: 'billing_officer',
      fullName: 'Billing Officer',
      email: 'billing@swms.local',
    },
  });

  // Seed auth credentials for billing officer user
  const billingPasswordHash = await argon2.hash('Billing@123456', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await prisma.authLocalCredential.upsert({
    where: { userId: billingOfficer.id },
    update: { passwordHash: billingPasswordHash, mustChangePassword: false },
    create: {
      userId: billingOfficer.id,
      passwordHash: billingPasswordHash,
      passwordAlgo: 'ARGON2ID',
      mustChangePassword: false,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { roleCode: 'ADMIN' },
    update: { roleName: 'Administrator', isActive: true },
    create: {
      roleCode: 'ADMIN',
      roleName: 'Administrator',
      description: 'Quản trị toàn bộ module foundation',
      isSystemRole: true,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  const governanceRole = await prisma.role.upsert({
    where: { roleCode: 'GOVERNANCE_MANAGER' },
    update: { roleName: 'Governance Manager', isActive: true },
    create: {
      roleCode: 'GOVERNANCE_MANAGER',
      roleName: 'Governance Manager',
      description: 'Quản lý rule, decision log và change control',
      isSystemRole: true,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  // Go-live roles from spec
  const goLiveRoles = [
    { roleCode: 'WH_MANAGER', roleName: 'Warehouse Manager', description: 'Quản lý vận hành kho và ngoại lệ' },
    { roleCode: 'WH_KEEPER', roleName: 'Warehouse Keeper', description: 'Tác nghiệp kho thực địa' },
    { roleCode: 'WB_OPERATOR', roleName: 'Weighbridge Operator', description: 'Vận hành cân và OCR' },
    { roleCode: 'BILLING_OFC', roleName: 'Billing Officer', description: 'Vận hành billing và debit note' },
    { roleCode: 'OPS_SUPER', roleName: 'Operations Supervisor', description: 'Giám sát vận hành và dashboard' },
    { roleCode: 'CUST_VIEWER', roleName: 'Customer Viewer', description: 'Chỉ xem dữ liệu trong phạm vi owner' },
  ];

  for (const role of goLiveRoles) {
    await prisma.role.upsert({
      where: { roleCode: role.roleCode },
      update: { roleName: role.roleName, isActive: true },
      create: {
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: role.description,
        isSystemRole: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  const permissions: Permission[] = [];
  for (const [permissionCode, moduleCode, resourceCode, actionCode, isSensitive] of permissionSeeds) {
    const permission = await prisma.permission.upsert({
      where: { permissionCode },
      update: {
        moduleCode,
        resourceCode,
        actionCode,
        isSensitive,
        isActive: true,
        updatedBy: admin.id,
      },
      create: {
        permissionCode,
        moduleCode,
        resourceCode,
        actionCode,
        isSensitive,
        isActive: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
    permissions.push(permission);
  }

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: { effect: RolePermissionEffect.ALLOW, createdBy: admin.id },
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
        effect: RolePermissionEffect.ALLOW,
        createdBy: admin.id,
      },
    });
  }

  for (const permission of permissions.filter((item) => item.permissionCode.startsWith('foundation.rules') || item.permissionCode.startsWith('foundation.decision_logs') || item.permissionCode.startsWith('foundation.change_controls') || item.permissionCode.startsWith('foundation.audit_logs') || item.permissionCode.startsWith('foundation.exception_logs') || item.permissionCode === 'foundation.idempotency.view')) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: governanceRole.id,
          permissionId: permission.id,
        },
      },
      update: { effect: RolePermissionEffect.ALLOW, createdBy: admin.id },
      create: {
        roleId: governanceRole.id,
        permissionId: permission.id,
        effect: RolePermissionEffect.ALLOW,
        createdBy: admin.id,
      },
    });
  }

  // Assign billing permissions to BILLING_OFC role
  const billingOfcRole = await prisma.role.findUnique({
    where: { roleCode: 'BILLING_OFC' },
  });

  if (billingOfcRole) {
    for (const permission of permissions.filter((item) => item.permissionCode.startsWith('BILLING.'))) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: billingOfcRole.id,
            permissionId: permission.id,
          },
        },
        update: { effect: RolePermissionEffect.ALLOW, createdBy: admin.id },
        create: {
          roleId: billingOfcRole.id,
          permissionId: permission.id,
          effect: RolePermissionEffect.ALLOW,
          createdBy: admin.id,
        },
      });
    }
  }

  await prisma.userRole.upsert({
    where: { id: '0b8a0f26-61d8-42b0-9255-74a37bf8f100' },
    update: {
      userId: admin.id,
      roleId: adminRole.id,
      isPrimary: true,
      isActive: true,
    },
    create: {
      id: '0b8a0f26-61d8-42b0-9255-74a37bf8f100',
      userId: admin.id,
      roleId: adminRole.id,
      isPrimary: true,
      isActive: true,
      assignedBy: admin.id,
    },
  });

  await prisma.userRole.upsert({
    where: { id: 'c3d441fe-2bb1-45ce-9ed3-bd4f3ce6aa01' },
    update: {
      userId: governance.id,
      roleId: governanceRole.id,
      isPrimary: true,
      isActive: true,
      warehouseCode: 'WH5.1',
    },
    create: {
      id: 'c3d441fe-2bb1-45ce-9ed3-bd4f3ce6aa01',
      userId: governance.id,
      roleId: governanceRole.id,
      isPrimary: true,
      isActive: true,
      warehouseCode: 'WH5.1',
      assignedBy: admin.id,
    },
  });

  await prisma.userRole.upsert({
    where: { id: 'd4e552ff-3cc2-56df-0fee-ce5f4ce7bb02' },
    update: {
      userId: billingOfficer.id,
      roleId: billingOfcRole?.id || adminRole.id,
      isPrimary: true,
      isActive: true,
      warehouseCode: 'WH5.1',
    },
    create: {
      id: 'd4e552ff-3cc2-56df-0fee-ce5f4ce7bb02',
      userId: billingOfficer.id,
      roleId: billingOfcRole?.id || adminRole.id,
      isPrimary: true,
      isActive: true,
      warehouseCode: 'WH5.1',
      assignedBy: admin.id,
    },
  });

  // ========== Go-live Users + Credentials + UserRoles ==========
  const goLiveUsers = [
    { userCode: 'wh_manager',   username: 'wh_manager',   fullName: 'Nguyễn Văn Quản',  email: 'whmanager@swms.local',   password: 'WhMgr@123456',  roleCode: 'WH_MANAGER',  userRoleId: 'e5f663aa-4dd3-67ef-1aff-df605df8cc03' },
    { userCode: 'wh_keeper',    username: 'wh_keeper',    fullName: 'Trần Thị Kho',      email: 'whkeeper@swms.local',    password: 'WhKpr@123456',  roleCode: 'WH_KEEPER',   userRoleId: 'f6a774bb-5ee4-78f0-2b00-ea706ea9dd04' },
    { userCode: 'wb_operator',  username: 'wb_operator',  fullName: 'Lê Minh Cân',       email: 'wboperator@swms.local',  password: 'WbOp@123456',   roleCode: 'WB_OPERATOR', userRoleId: 'a7b885cc-6ff5-89a1-3c11-fb807fb0ee05' },
    { userCode: 'ops_super',    username: 'ops_super',    fullName: 'Phạm Đức Giám',     email: 'opssuper@swms.local',    password: 'OpSu@123456',   roleCode: 'OPS_SUPER',   userRoleId: 'b8c996dd-7006-9ab2-4d22-ac908ac1ff06' },
    { userCode: 'cust_viewer',  username: 'cust_viewer',  fullName: 'Hoàng Thị Khách',   email: 'custviewer@swms.local',  password: 'CuVw@123456',   roleCode: 'CUST_VIEWER', userRoleId: 'c9daa7ee-8117-0bc3-5e33-bda09bd20007' },
  ];

  for (const u of goLiveUsers) {
    const user = await prisma.appUser.upsert({
      where: { userCode: u.userCode },
      update: { fullName: u.fullName, isActive: true },
      create: {
        userCode: u.userCode,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
      },
    });

    const hash = await argon2.hash(u.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await prisma.authLocalCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash: hash, mustChangePassword: false },
      create: {
        userId: user.id,
        passwordHash: hash,
        passwordAlgo: 'ARGON2ID',
        mustChangePassword: false,
      },
    });

    const role = await prisma.role.findUnique({ where: { roleCode: u.roleCode } });
    if (role) {
      await prisma.userRole.upsert({
        where: { id: u.userRoleId },
        update: {
          userId: user.id,
          roleId: role.id,
          isPrimary: true,
          isActive: true,
          warehouseCode: 'WH5.1',
        },
        create: {
          id: u.userRoleId,
          userId: user.id,
          roleId: role.id,
          isPrimary: true,
          isActive: true,
          warehouseCode: 'WH5.1',
          assignedBy: admin.id,
        },
      });
    }
  }

  // ========== Role-Permission Assignments for Go-live Roles ==========

  // Lookup all go-live roles
  const whManagerRole = await prisma.role.findUnique({ where: { roleCode: 'WH_MANAGER' } });
  const whKeeperRole = await prisma.role.findUnique({ where: { roleCode: 'WH_KEEPER' } });
  const wbOperatorRole = await prisma.role.findUnique({ where: { roleCode: 'WB_OPERATOR' } });
  const opsSuperRole = await prisma.role.findUnique({ where: { roleCode: 'OPS_SUPER' } });
  const custViewerRole = await prisma.role.findUnique({ where: { roleCode: 'CUST_VIEWER' } });

  // Permission prefix patterns per role
  const rolePermissionMap: Array<{ role: typeof whManagerRole; prefixes: string[] }> = [
    // WH_MANAGER: Full warehouse ops — inbound, outbound, inventory, master data, work, reporting (no foundation admin, no billing)
    {
      role: whManagerRole,
      prefixes: [
        'master_data.',
        'inbound.',
        'sales_order.',
        'OUTBOUND.',
        'inventory.control.',
        'work.',
        'REPORTING.DASHBOARD.',
        'REPORTING.INVENTORY.',
        'REPORTING.AUDIT.',
        'foundation.reason_codes.view',
        'foundation.permissions.me.view',
      ],
    },
    // WH_KEEPER: Daily warehouse ops — inbound receive, outbound execute, inventory view, work execution
    {
      role: whKeeperRole,
      prefixes: [
        'inbound.receipt.',
        'inbound.weigh.',
        'inbound.dashboard.',
        'OUTBOUND.SHIPMENT.READ',
        'OUTBOUND.SHIPMENT.CONFIRM',
        'OUTBOUND.SHIPMENT.SHIP',
        'OUTBOUND.WEIGH.',
        'OUTBOUND.DASHBOARD.',
        'inventory.control.onhand.read',
        'inventory.control.movement.read',
        'inventory.control.move.',
        'inventory.control.status.',
        'work.execution.',
        'work.dashboard.',
        'master_data.lookup.view',
        'master_data.warehouse.view',
        'master_data.item.view',
        'master_data.owner.view',
        'master_data.location.view',
        'master_data.zone.view',
        'master_data.uom.view',
        'master_data.inventory_status.view',
        'foundation.permissions.me.view',
      ],
    },
    // WB_OPERATOR: Weighbridge + OCR only
    {
      role: wbOperatorRole,
      prefixes: [
        'inbound.weigh.',
        'inbound.receipt.view',
        'inbound.dashboard.',
        'OUTBOUND.WEIGH.',
        'OUTBOUND.SHIPMENT.READ',
        'OUTBOUND.DASHBOARD.',
        'INTEGRATION.WEIGHBRIDGE.',
        'INTEGRATION.WEIGHBRIDGE_DEVICE.',
        'INTEGRATION.OCR.',
        'integration.weighbridge.',
        'master_data.lookup.view',
        'master_data.item.view',
        'master_data.owner.view',
        'master_data.vehicle_type.view',
        'foundation.permissions.me.view',
      ],
    },
    // OPS_SUPER: Supervise all ops — read everything + dashboards + reporting + approve adjustments
    {
      role: opsSuperRole,
      prefixes: [
        'inbound.',
        'sales_order.view',
        'sales_order.dashboard.',
        'OUTBOUND.SHIPMENT.READ',
        'OUTBOUND.DASHBOARD.',
        'OUTBOUND.APPROVAL.',
        'inventory.control.',
        'work.',
        'REPORTING.',
        'INTEGRATION.MONITORING.',
        'integration.monitoring.',
        'integration.alerts.',
        'INTEGRATION.ALERT.',
        'master_data.lookup.view',
        'master_data.warehouse.view',
        'master_data.item.view',
        'master_data.owner.view',
        'master_data.customer.view',
        'foundation.audit_logs.view',
        'foundation.exception_logs.',
        'foundation.permissions.me.view',
      ],
    },
    // CUST_VIEWER: Read-only within owner scope — inventory on-hand, movement, inbound/outbound status, reporting
    {
      role: custViewerRole,
      prefixes: [
        'inbound.po.view',
        'inbound.receipt.view',
        'inbound.dashboard.',
        'sales_order.view',
        'sales_order.dashboard.',
        'OUTBOUND.SHIPMENT.READ',
        'OUTBOUND.DASHBOARD.',
        'inventory.control.onhand.read',
        'inventory.control.movement.read',
        'REPORTING.DASHBOARD.',
        'REPORTING.INVENTORY.',
        'foundation.permissions.me.view',
      ],
    },
  ];

  for (const { role, prefixes } of rolePermissionMap) {
    if (!role) continue;
    const matchedPermissions = permissions.filter((p) =>
      prefixes.some((prefix) => p.permissionCode.startsWith(prefix) || p.permissionCode === prefix),
    );
    for (const permission of matchedPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: { effect: RolePermissionEffect.ALLOW, createdBy: admin.id },
        create: {
          roleId: role.id,
          permissionId: permission.id,
          effect: RolePermissionEffect.ALLOW,
          createdBy: admin.id,
        },
      });
    }
  }

  await prisma.reasonCode.upsert({
    where: { code: 'MANUAL_ADJUST' },
    update: {
      description: 'Điều chỉnh thủ công',
      category: 'ADJUSTMENT',
      domainCode: 'FOUNDATION',
      isActive: true,
      updatedBy: admin.id,
    },
    create: {
      code: 'MANUAL_ADJUST',
      description: 'Điều chỉnh thủ công',
      category: 'ADJUSTMENT',
      domainCode: 'FOUNDATION',
      requiresApproval: true,
      requiresNote: true,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  await prisma.reasonCode.upsert({
    where: { code: 'DUPLICATE_RETRY' },
    update: {
      description: 'Client gửi lại yêu cầu',
      category: 'IDEMPOTENCY',
      domainCode: 'FOUNDATION',
      isActive: true,
      updatedBy: admin.id,
    },
    create: {
      code: 'DUPLICATE_RETRY',
      description: 'Client gửi lại yêu cầu',
      category: 'IDEMPOTENCY',
      domainCode: 'FOUNDATION',
      requiresApproval: false,
      requiresNote: false,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  // Go-live reason codes from spec
  const goLiveReasonCodes = [
    // Inbound
    { code: 'DAMAGED', description: 'Hàng hư hỏng khi nhận', category: 'DAMAGE', domainCode: 'INBOUND', requiresApproval: false, affectsBilling: true, requiresNote: true },
    { code: 'SHORT_DELIVERY', description: 'Giao thiếu so với chứng từ', category: 'EXCEPTION_OVERRIDE', domainCode: 'INBOUND', requiresApproval: true, affectsBilling: true, requiresNote: true },
    { code: 'OVER_DELIVERY', description: 'Giao dư so với chứng từ', category: 'EXCEPTION_OVERRIDE', domainCode: 'INBOUND', requiresApproval: true, affectsBilling: true, requiresNote: true },
    { code: 'WRONG_ITEM', description: 'Sai mặt hàng/sku/owner', category: 'EXCEPTION_OVERRIDE', domainCode: 'INBOUND', requiresApproval: true, affectsBilling: false, requiresNote: true },
    { code: 'SCALE_CALIBRATION', description: 'Cân lỗi/cần nhập tay do hiệu chuẩn', category: 'SCALE_ISSUE', domainCode: 'INBOUND', requiresApproval: true, affectsBilling: false, requiresNote: true },
    { code: 'DOCUMENTATION_ERROR', description: 'Sai chứng từ nguồn', category: 'DOCUMENT_ERROR', domainCode: 'INBOUND', requiresApproval: false, affectsBilling: false, requiresNote: true },
    // Outbound
    { code: 'CUSTOMER_REJECT', description: 'Khách từ chối nhận', category: 'CANCEL', domainCode: 'OUTBOUND', requiresApproval: true, affectsBilling: true, requiresNote: true },
    { code: 'WEIGHT_MISMATCH', description: 'Sai lệch trọng lượng', category: 'EXCEPTION_OVERRIDE', domainCode: 'OUTBOUND', requiresApproval: true, affectsBilling: true, requiresNote: true },
    { code: 'QUALITY_ISSUE', description: 'Vấn đề chất lượng', category: 'DAMAGE', domainCode: 'OUTBOUND', requiresApproval: true, affectsBilling: true, requiresNote: true },
    // Inventory
    { code: 'CYCLE_COUNT_ADJUST', description: 'Điều chỉnh do kiểm kê', category: 'ADJUSTMENT', domainCode: 'INVENTORY', requiresApproval: true, affectsBilling: true, requiresNote: true },
    { code: 'DAMAGE_WRITEOFF', description: 'Ghi giảm do hư hỏng', category: 'DAMAGE', domainCode: 'INVENTORY', requiresApproval: true, affectsBilling: true, requiresNote: true },
    { code: 'STATUS_CHANGE', description: 'Thay đổi inventory status', category: 'STATUS_CHANGE', domainCode: 'INVENTORY', requiresApproval: false, affectsBilling: false, requiresNote: true },
    { code: 'SHRINKAGE', description: 'Hao hụt', category: 'SHRINKAGE', domainCode: 'INVENTORY', requiresApproval: true, affectsBilling: true, requiresNote: true },
    // General
    { code: 'OTHER', description: 'Lý do khác (bắt buộc nhập ghi chú)', category: 'OTHER', domainCode: 'FOUNDATION', requiresApproval: false, affectsBilling: false, requiresNote: true },
    { code: 'MANUAL_WEIGHT', description: 'Nhập trọng lượng thủ công', category: 'MANUAL_WEIGHT', domainCode: 'FOUNDATION', requiresApproval: true, affectsBilling: true, requiresNote: true },
  ];

  for (const rc of goLiveReasonCodes) {
    await prisma.reasonCode.upsert({
      where: { code: rc.code },
      update: {
        description: rc.description,
        category: rc.category,
        domainCode: rc.domainCode,
        isActive: true,
        updatedBy: admin.id,
      },
      create: {
        code: rc.code,
        description: rc.description,
        category: rc.category,
        domainCode: rc.domainCode,
        requiresApproval: rc.requiresApproval,
        affectsBilling: rc.affectsBilling,
        requiresNote: rc.requiresNote,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  // HI-4 Fix: Add TRF and ADJ sequences for Module 6 (Inventory Control)
  // Added CONTRACT for Module 10 Billing
  for (const sequenceCode of ['RCV', 'SHP', 'WRK', 'TRX', 'DN', 'TRF', 'ADJ', 'CONTRACT']) {
    await prisma.numberSequence.upsert({
      where: { sequenceCode },
      update: {
        description: `Sequence ${sequenceCode}`,
        scopeType: SequenceScopeType.PER_WAREHOUSE,
        resetPolicy: SequenceResetPolicy.DAILY,
        prefixTemplate: sequenceCode,
        formatTemplate: `${sequenceCode}-{yyyymmdd}-{running_no}`,
        runningNoLength: 6,
        isActive: true,
        updatedBy: admin.id,
      },
      create: {
        sequenceCode,
        description: `Sequence ${sequenceCode}`,
        scopeType: SequenceScopeType.PER_WAREHOUSE,
        resetPolicy: SequenceResetPolicy.DAILY,
        prefixTemplate: sequenceCode,
        formatTemplate: `${sequenceCode}-{yyyymmdd}-{running_no}`,
        runningNoLength: 6,
        allowGap: true,
        isActive: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  await prisma.businessRuleCatalog.upsert({
    where: { ruleCode: 'FG-BR-001' },
    update: {
      title: 'Mọi command side effect phải có idempotency',
      description: 'Module downstream phải truyền idempotency key hoặc external id cho command có side effect.',
      currentStatus: BusinessRuleStatus.CONFIRMED,
      sourceOfTruth: 'Module_1_techstack.md',
      effectivePhase: EffectivePhase.GO_LIVE,
      ownerRole: 'Tech Lead',
      isActive: true,
    },
    create: {
      ruleCode: 'FG-BR-001',
      domain: 'FOUNDATION',
      title: 'Mọi command side effect phải có idempotency',
      description: 'Module downstream phải truyền idempotency key hoặc external id cho command có side effect.',
      currentStatus: BusinessRuleStatus.CONFIRMED,
      sourceOfTruth: 'Module_1_techstack.md',
      effectivePhase: EffectivePhase.GO_LIVE,
      ownerRole: 'Tech Lead',
      isActive: true,
    },
  });

  await prisma.decisionLog.upsert({
    where: { decisionNo: 'DEC-20260308-001' },
    update: {
      title: 'Chọn NestJS + Prisma cho Module 1',
      decisionType: 'TECH_STACK',
      contextDomain: 'FOUNDATION',
      summary: 'Module 1 dùng NestJS + Prisma + PostgreSQL để giữ cấu trúc rõ và type-safe.',
      decidedValue: 'Adopt NestJS + Prisma + PostgreSQL',
      status: DecisionLogStatus.CONFIRMED,
      sourceRefs: ['docs/stack/Module_1_techstack.md'],
      impactedModules: ['M1'],
      decidedBy: admin.id,
      decidedAt: new Date(),
    },
    create: {
      decisionNo: 'DEC-20260308-001',
      title: 'Chọn NestJS + Prisma cho Module 1',
      decisionType: 'TECH_STACK',
      contextDomain: 'FOUNDATION',
      summary: 'Module 1 dùng NestJS + Prisma + PostgreSQL để giữ cấu trúc rõ và type-safe.',
      decidedValue: 'Adopt NestJS + Prisma + PostgreSQL',
      status: DecisionLogStatus.CONFIRMED,
      sourceRefs: ['docs/stack/Module_1_techstack.md'],
      impactedModules: ['M1'],
      decidedBy: admin.id,
      decidedAt: new Date(),
    },
  });

  await prisma.changeControlRecord.upsert({
    where: { changeNo: 'CCR-20260308-001' },
    update: {
      changeType: 'SCOPE',
      title: 'Khởi tạo nền tảng backend cho Module 1',
      description: 'Tạo schema, seed và API control/config cho Module 1.',
      priority: ChangePriority.HIGH,
      status: ChangeControlStatus.APPROVED,
      targetRelease: 'phase-1',
      requestedBy: admin.id,
      approvedBy: admin.id,
      approvedAt: new Date(),
      impactedModules: ['M1'],
    },
    create: {
      changeNo: 'CCR-20260308-001',
      changeType: 'SCOPE',
      title: 'Khởi tạo nền tảng backend cho Module 1',
      description: 'Tạo schema, seed và API control/config cho Module 1.',
      priority: ChangePriority.HIGH,
      status: ChangeControlStatus.APPROVED,
      targetRelease: 'phase-1',
      requestedBy: admin.id,
      approvedBy: admin.id,
      approvedAt: new Date(),
      impactedModules: ['M1'],
    },
  });

  // ========== Module 2: Master Data Seed ==========

  // Seed UOMs
  const uomSeeds = [
    { uomCode: 'KG', description: 'Kilogram', uomClass: UomClass.WEIGHT, isBaseUom: true, decimalPrecision: 3 },
    { uomCode: 'MT', description: 'Metric Ton', uomClass: UomClass.WEIGHT, isBaseUom: false, decimalPrecision: 6 },
    { uomCode: 'BAG', description: 'Bag', uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'M3', description: 'Cubic Meter', uomClass: UomClass.VOLUME, isBaseUom: true, decimalPrecision: 4 },
    { uomCode: 'UNIT', description: 'Unit/Piece', uomClass: UomClass.QUANTITY, isBaseUom: true, decimalPrecision: 0 },
    { uomCode: 'PALLET', description: 'Pallet', uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'CONTAINER', description: 'Container', uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
    { uomCode: 'DAY', description: 'Day', uomClass: UomClass.QUANTITY, isBaseUom: false, decimalPrecision: 0 },
  ];

  const uomMap: Record<string, string> = {};
  for (const uom of uomSeeds) {
    const created = await prisma.mdUom.upsert({
      where: { uomCode: uom.uomCode },
      update: { description: uom.description, uomClass: uom.uomClass, isBaseUom: uom.isBaseUom, decimalPrecision: uom.decimalPrecision, updatedBy: admin.id },
      create: { ...uom, createdBy: admin.id, updatedBy: admin.id },
    });
    uomMap[uom.uomCode] = created.id;
  }

  // Seed UOM Conversions (use findFirst + create pattern for null itemId)
  const existingConversion = await prisma.mdUomConversion.findFirst({
    where: { fromUomId: uomMap['MT'], toUomId: uomMap['KG'], itemId: null },
  });
  if (!existingConversion) {
    await prisma.mdUomConversion.create({
      data: { fromUomId: uomMap['MT'], toUomId: uomMap['KG'], conversionFactor: 1000, createdBy: admin.id, updatedBy: admin.id },
    });
  }

  // Seed Inventory Statuses (Go-live: 4 statuses)
  const inventoryStatuses = [
    { statusCode: 'AVAILABLE', description: 'Sẵn sàng để phân bổ', displayOrder: 1, isAllocatable: true, isSystemLocked: true },
    { statusCode: 'DAMAGED', description: 'Hư hỏng', displayOrder: 2, isAllocatable: false, isSystemLocked: true },
    { statusCode: 'BLOCKED', description: 'Đã khóa', displayOrder: 3, isAllocatable: false, isSystemLocked: true },
    { statusCode: 'IN_TRANSIT', description: 'Đang vận chuyển', displayOrder: 4, isAllocatable: false, isSystemLocked: true },
  ];

  for (const status of inventoryStatuses) {
    await prisma.mdInventoryStatus.upsert({
      where: { statusCode: status.statusCode },
      update: { description: status.description, displayOrder: status.displayOrder, isAllocatable: status.isAllocatable, updatedBy: admin.id },
      create: { ...status, createdBy: admin.id, updatedBy: admin.id },
    });
  }

  // Seed Sample Warehouse
  const warehouse = await prisma.mdWarehouse.upsert({
    where: { warehouseCode: 'WH5.1' },
    update: { warehouseName: 'Kho 5.1 - Phú Mỹ', updatedBy: admin.id },
    create: {
      warehouseCode: 'WH5.1',
      warehouseName: 'Kho 5.1 - Phú Mỹ',
      siteId: 'TVL-SITE',
      warehouseType: WarehouseType.COVERED,
      totalAreaM2: 50000,
      usableAreaM2: 45000,
      maxHeightM: 12,
      maxCapacityMt: 100000,
      address: 'Khu công nghiệp Phú Mỹ, Tân Thành, Bà Rịa - Vũng Tàu',
      hasWeighbridge: true,
      weighbridgeCount: 2,
      isBonded: false,
      capacityWarningPct: 85,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  // Seed Sample Zones
  const zoneSeeds = [
    { zoneCode: 'RCV-01', zoneName: 'Khu tiếp nhận 01', zoneType: ZoneType.RECEIVING, isBillingZone: false },
    { zoneCode: 'STG-01', zoneName: 'Khu staging 01', zoneType: ZoneType.STAGING, isBillingZone: false },
    { zoneCode: 'STR-A', zoneName: 'Khu lưu trữ A', zoneType: ZoneType.STORAGE, isBillingZone: true, billingRateZone: 'ZONE_A' },
    { zoneCode: 'STR-B', zoneName: 'Khu lưu trữ B', zoneType: ZoneType.STORAGE, isBillingZone: true, billingRateZone: 'ZONE_B' },
    { zoneCode: 'SHP-01', zoneName: 'Khu xuất hàng 01', zoneType: ZoneType.SHIPPING, isBillingZone: false },
  ];

  const zoneMap: Record<string, string> = {};
  for (const zone of zoneSeeds) {
    const created = await prisma.mdZone.upsert({
      where: { warehouseId_zoneCode: { warehouseId: warehouse.id, zoneCode: zone.zoneCode } },
      update: { zoneName: zone.zoneName, zoneType: zone.zoneType, updatedBy: admin.id },
      create: { warehouseId: warehouse.id, ...zone, createdBy: admin.id, updatedBy: admin.id },
    });
    zoneMap[zone.zoneCode] = created.id;
  }

  // Seed Sample Locations
  const locationSeeds = [
    { locationCode: 'RCV-01-001', zoneCode: 'RCV-01', locationType: LocationType.RECEIVING, locationProfile: 'RECEIVING', isMixedOwner: true, isMixedProduct: true },
    { locationCode: 'STG-01-001', zoneCode: 'STG-01', locationType: LocationType.STAGING, locationProfile: 'STAGING', isMixedOwner: false, isMixedProduct: true },
    { locationCode: 'STR-A-001', zoneCode: 'STR-A', locationType: LocationType.STORAGE, locationProfile: 'BULK_STORAGE', isMixedOwner: false, isMixedProduct: false },
    { locationCode: 'STR-A-002', zoneCode: 'STR-A', locationType: LocationType.STORAGE, locationProfile: 'BULK_STORAGE', isMixedOwner: false, isMixedProduct: false },
    { locationCode: 'STR-B-001', zoneCode: 'STR-B', locationType: LocationType.STORAGE, locationProfile: 'BAGGED_STORAGE', isMixedOwner: false, isMixedProduct: false },
    { locationCode: 'SHP-01-001', zoneCode: 'SHP-01', locationType: LocationType.SHIPPING, locationProfile: 'SHIPPING', isMixedOwner: true, isMixedProduct: true },
  ];

  for (const loc of locationSeeds) {
    await prisma.mdLocation.upsert({
      where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: loc.locationCode } },
      update: { locationType: loc.locationType, locationProfile: loc.locationProfile, updatedBy: admin.id },
      create: {
        warehouseId: warehouse.id,
        zoneId: zoneMap[loc.zoneCode],
        locationCode: loc.locationCode,
        locationType: loc.locationType,
        locationProfile: loc.locationProfile,
        status: LocationStatus.OK,
        isMixedOwner: loc.isMixedOwner,
        isMixedProduct: loc.isMixedProduct,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  // Seed Service Codes
  const serviceCodes = [
    { serviceCode: 'STORAGE', serviceName: 'Phí lưu kho', serviceGroup: ServiceGroup.STORAGE },
    { serviceCode: 'HANDLING_IN', serviceName: 'Phí xếp dỡ nhập', serviceGroup: ServiceGroup.HANDLING },
    { serviceCode: 'HANDLING_OUT', serviceName: 'Phí xếp dỡ xuất', serviceGroup: ServiceGroup.HANDLING },
    { serviceCode: 'BAGGING', serviceName: 'Phí đóng bao', serviceGroup: ServiceGroup.VAS },
    { serviceCode: 'WEIGHING', serviceName: 'Phí cân', serviceGroup: ServiceGroup.HANDLING },
  ];

  for (const sc of serviceCodes) {
    await prisma.mdServiceCode.upsert({
      where: { serviceCode: sc.serviceCode },
      update: { serviceName: sc.serviceName, serviceGroup: sc.serviceGroup, updatedBy: admin.id },
      create: { ...sc, defaultUomId: uomMap['MT'], createdBy: admin.id, updatedBy: admin.id },
    });
  }

  // Seed Day Types
  const dayTypes = [
    { dayTypeCode: 'NORMAL', description: 'Ngày thường' },
    { dayTypeCode: 'WEEKEND', description: 'Cuối tuần' },
    { dayTypeCode: 'HOLIDAY', description: 'Ngày lễ' },
  ];

  for (const dt of dayTypes) {
    await prisma.mdDayType.upsert({
      where: { dayTypeCode: dt.dayTypeCode },
      update: { description: dt.description, updatedBy: admin.id },
      create: { ...dt, createdBy: admin.id, updatedBy: admin.id },
    });
  }

  // Seed Dropdown Configs (22 values from BE-TODO-dropdown-config.md)
  const dropdownSeeds = [
    // Owner
    { entity: 'owner', fieldName: 'ownerGroup', value: 'LOCAL', label: 'Nội địa', sortOrder: 1, isDefault: true },
    { entity: 'owner', fieldName: 'ownerGroup', value: 'FOREIGN', label: 'Nước ngoài', sortOrder: 2, isDefault: false },
    { entity: 'owner', fieldName: 'ownerType', value: 'DOMESTIC', label: 'Trong nước', sortOrder: 1, isDefault: true },
    { entity: 'owner', fieldName: 'ownerType', value: 'EXPORT', label: 'Xuất khẩu', sortOrder: 2, isDefault: false },
    { entity: 'owner', fieldName: 'ownerType', value: 'IMPORT', label: 'Nhập khẩu', sortOrder: 3, isDefault: false },
    // Vendor
    { entity: 'vendor', fieldName: 'supplierGroup', value: 'VESSEL', label: 'Tàu', sortOrder: 1, isDefault: true },
    { entity: 'vendor', fieldName: 'supplierGroup', value: 'TRUCK', label: 'Xe tải', sortOrder: 2, isDefault: false },
    { entity: 'vendor', fieldName: 'supplierGroup', value: 'BARGE', label: 'Sà lan', sortOrder: 3, isDefault: false },
    { entity: 'vendor', fieldName: 'supplierGroup', value: 'OTHER', label: 'Khác', sortOrder: 4, isDefault: false },
    // Item
    { entity: 'item', fieldName: 'cargoForm', value: 'BULK', label: 'Hàng rời', sortOrder: 1, isDefault: true },
    { entity: 'item', fieldName: 'cargoForm', value: 'BAGGED', label: 'Đóng bao', sortOrder: 2, isDefault: false },
    { entity: 'item', fieldName: 'cargoForm', value: 'CONTAINERIZED', label: 'Container', sortOrder: 3, isDefault: false },
    { entity: 'item', fieldName: 'cargoForm', value: 'LIQUID', label: 'Lỏng', sortOrder: 4, isDefault: false },
    { entity: 'item', fieldName: 'productGroup', value: 'AGRICULTURAL', label: 'Nông sản', sortOrder: 1, isDefault: true },
    { entity: 'item', fieldName: 'productGroup', value: 'FERTILIZER', label: 'Phân bón', sortOrder: 2, isDefault: false },
    { entity: 'item', fieldName: 'productGroup', value: 'CHEMICAL', label: 'Hóa chất', sortOrder: 3, isDefault: false },
    { entity: 'item', fieldName: 'productGroup', value: 'STEEL', label: 'Thép', sortOrder: 4, isDefault: false },
    { entity: 'item', fieldName: 'productGroup', value: 'GENERAL', label: 'Hàng tổng hợp', sortOrder: 5, isDefault: false },
    // Warehouse
    { entity: 'warehouse', fieldName: 'warehouseType', value: 'COVERED', label: 'Kho có mái che', sortOrder: 1, isDefault: true },
    { entity: 'warehouse', fieldName: 'warehouseType', value: 'OPEN', label: 'Bãi hở', sortOrder: 2, isDefault: false },
    { entity: 'warehouse', fieldName: 'warehouseType', value: 'COLD', label: 'Kho lạnh', sortOrder: 3, isDefault: false },
    { entity: 'warehouse', fieldName: 'warehouseType', value: 'HAZMAT', label: 'Kho hàng nguy hiểm', sortOrder: 4, isDefault: false },
    // Customer
    { entity: 'customer', fieldName: 'customerGroup', value: 'CORPORATE', label: 'Doanh nghiệp', sortOrder: 1, isDefault: true },
    { entity: 'customer', fieldName: 'customerGroup', value: 'INDIVIDUAL', label: 'Cá nhân', sortOrder: 2, isDefault: false },
    { entity: 'customer', fieldName: 'customerType', value: 'BUYER', label: 'Người mua', sortOrder: 1, isDefault: true },
    { entity: 'customer', fieldName: 'customerType', value: 'CONSIGNEE', label: 'Người nhận hàng', sortOrder: 2, isDefault: false },
    { entity: 'customer', fieldName: 'customerType', value: 'SHIPPER', label: 'Người gửi hàng', sortOrder: 3, isDefault: false },
  ];

  for (const dc of dropdownSeeds) {
    await prisma.dropdownConfig.upsert({
      where: { entity_fieldName_value: { entity: dc.entity, fieldName: dc.fieldName, value: dc.value } },
      update: { label: dc.label, sortOrder: dc.sortOrder, isDefault: dc.isDefault, isActive: true },
      create: { entity: dc.entity, fieldName: dc.fieldName, value: dc.value, label: dc.label, sortOrder: dc.sortOrder, isDefault: dc.isDefault },
    });
  }

  console.log("✅ Module 2 Master Data seeded successfully");

  // ========== Master Data Sample (expanded) ==========
  await seedMasterDataSample(prisma);

  // Gán owner cho WH5.1 (sau khi owners đã seed)
  await prisma.$executeRawUnsafe(`
    UPDATE md_warehouse SET owner_id = (SELECT id FROM md_owner WHERE owner_code = 'OWN-001')
    WHERE warehouse_code = 'WH5.1' AND owner_id IS NULL
  `);

  // ========== Module 3: Inventory Event Mapping (stage-based) ==========
  const eventMappingSeeds: Array<{
    eventCode: string;
    sourceModule: string;
    sourceObject: string;
    triggerState: string;
    transType: InventoryTransType;
    stage: InventoryStage;
    affectPhysical: boolean;
    affectOrdered: boolean;
    affectHold: boolean;
    reversible: boolean;
  }> = [
    // Inbound
    { eventCode: 'PO_CONFIRMED', sourceModule: 'M4', sourceObject: 'PURCHASE_ORDER', triggerState: 'CONFIRMED', transType: InventoryTransType.RECEIPT, stage: InventoryStage.EXPECTED, affectPhysical: false, affectOrdered: true, affectHold: false, reversible: true },
    { eventCode: 'RECEIPT_CREATED', sourceModule: 'M4', sourceObject: 'RECEIPT', triggerState: 'CREATED', transType: InventoryTransType.RECEIPT, stage: InventoryStage.REGISTERED, affectPhysical: false, affectOrdered: false, affectHold: false, reversible: true },
    { eventCode: 'GOODS_RECEIVED', sourceModule: 'M4', sourceObject: 'RECEIPT', triggerState: 'RECEIVED', transType: InventoryTransType.RECEIPT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: true, affectHold: false, reversible: true },
    { eventCode: 'PUTAWAY_COMPLETED', sourceModule: 'M7', sourceObject: 'WORK_LINE', triggerState: 'COMPLETED', transType: InventoryTransType.MOVE, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    // Outbound
    { eventCode: 'SO_CONFIRMED', sourceModule: 'M5', sourceObject: 'SALES_ORDER', triggerState: 'CONFIRMED', transType: InventoryTransType.ISSUE, stage: InventoryStage.EXPECTED, affectPhysical: false, affectOrdered: true, affectHold: false, reversible: true },
    { eventCode: 'ALLOCATION_CREATED', sourceModule: 'M5', sourceObject: 'SHIPMENT', triggerState: 'ALLOCATED', transType: InventoryTransType.ISSUE, stage: InventoryStage.ALLOCATED, affectPhysical: false, affectOrdered: false, affectHold: true, reversible: true },
    { eventCode: 'ALLOCATION_RELEASED', sourceModule: 'M5', sourceObject: 'SHIPMENT', triggerState: 'DEALLOCATED', transType: InventoryTransType.ISSUE, stage: InventoryStage.DE_ALLOCATED, affectPhysical: false, affectOrdered: false, affectHold: true, reversible: false },
    { eventCode: 'PICK_CONFIRMED', sourceModule: 'M7', sourceObject: 'WORK_LINE', triggerState: 'COMPLETED', transType: InventoryTransType.ISSUE, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    { eventCode: 'LOAD_CONFIRMED', sourceModule: 'M5', sourceObject: 'SHIPMENT', triggerState: 'LOADED', transType: InventoryTransType.ISSUE, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    { eventCode: 'SHIP_CONFIRMED', sourceModule: 'M5', sourceObject: 'SHIPMENT', triggerState: 'SHIPPED', transType: InventoryTransType.ISSUE, stage: InventoryStage.DEDUCTED, affectPhysical: true, affectOrdered: true, affectHold: true, reversible: true },
    // Transfer
    { eventCode: 'TRANSFER_ORDER_CONFIRMED', sourceModule: 'M6', sourceObject: 'TRANSFER', triggerState: 'CONFIRMED', transType: InventoryTransType.TRANSFER_ISSUE, stage: InventoryStage.EXPECTED, affectPhysical: false, affectOrdered: true, affectHold: false, reversible: true },
    { eventCode: 'TRANSFER_ISSUED', sourceModule: 'M6', sourceObject: 'TRANSFER', triggerState: 'SHIPPED', transType: InventoryTransType.TRANSFER_ISSUE, stage: InventoryStage.DEDUCTED, affectPhysical: true, affectOrdered: true, affectHold: false, reversible: true },
    { eventCode: 'TRANSFER_RECEIVED', sourceModule: 'M6', sourceObject: 'TRANSFER', triggerState: 'RECEIVED', transType: InventoryTransType.TRANSFER_RECEIPT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    // VAS
    { eventCode: 'VAS_ORDER_CONFIRMED', sourceModule: 'M9', sourceObject: 'VAS_ORDER', triggerState: 'CONFIRMED', transType: InventoryTransType.ISSUE, stage: InventoryStage.EXPECTED, affectPhysical: false, affectOrdered: true, affectHold: false, reversible: true },
    { eventCode: 'VAS_CONSUMED', sourceModule: 'M9', sourceObject: 'VAS_ORDER', triggerState: 'COMPLETED', transType: InventoryTransType.ISSUE, stage: InventoryStage.DEDUCTED, affectPhysical: true, affectOrdered: true, affectHold: false, reversible: true },
    { eventCode: 'VAS_PRODUCED', sourceModule: 'M9', sourceObject: 'VAS_ORDER', triggerState: 'COMPLETED', transType: InventoryTransType.RECEIPT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    { eventCode: 'VAS_WASTE', sourceModule: 'M9', sourceObject: 'VAS_ORDER', triggerState: 'COMPLETED', transType: InventoryTransType.ADJUSTMENT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    // Inventory Control
    { eventCode: 'MOVE_COMPLETED', sourceModule: 'M6', sourceObject: 'INVENTORY_CONTROL', triggerState: 'COMPLETED', transType: InventoryTransType.MOVE, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    { eventCode: 'STATUS_CHANGE_CONFIRMED', sourceModule: 'M6', sourceObject: 'INVENTORY_CONTROL', triggerState: 'CONFIRMED', transType: InventoryTransType.STATUS_CHANGE, stage: InventoryStage.PHYSICAL, affectPhysical: false, affectOrdered: false, affectHold: false, reversible: true },
    { eventCode: 'ADJUSTMENT_APPROVED', sourceModule: 'M6', sourceObject: 'INVENTORY_CONTROL', triggerState: 'APPROVED', transType: InventoryTransType.ADJUSTMENT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    { eventCode: 'COUNT_GAIN_RECONCILED', sourceModule: 'M6', sourceObject: 'CYCLE_COUNT', triggerState: 'RECONCILED', transType: InventoryTransType.ADJUSTMENT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    { eventCode: 'COUNT_LOSS_RECONCILED', sourceModule: 'M6', sourceObject: 'CYCLE_COUNT', triggerState: 'RECONCILED', transType: InventoryTransType.ADJUSTMENT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
    // Backward compat (deprecated)
    { eventCode: 'RECEIPT_RECEIVED', sourceModule: 'M4', sourceObject: 'RECEIPT', triggerState: 'RECEIVED', transType: InventoryTransType.RECEIPT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: true, affectHold: false, reversible: true },
    { eventCode: 'SHIPMENT_SHIPPED', sourceModule: 'M5', sourceObject: 'SHIPMENT', triggerState: 'SHIPPED', transType: InventoryTransType.ISSUE, stage: InventoryStage.DEDUCTED, affectPhysical: true, affectOrdered: true, affectHold: true, reversible: true },
    // Direct adjustment for testing
    { eventCode: 'DIRECT_ADJUSTMENT', sourceModule: 'FOUNDATION', sourceObject: 'Manual', triggerState: 'APPROVED', transType: InventoryTransType.ADJUSTMENT, stage: InventoryStage.PHYSICAL, affectPhysical: true, affectOrdered: false, affectHold: false, reversible: true },
  ];

  for (const em of eventMappingSeeds) {
    await prisma.inventoryEventMapping.upsert({
      where: { eventCode: em.eventCode },
      update: { ...em, activeFlag: true },
      create: { ...em, activeFlag: true },
    });
  }

  console.log('✅ Module 3 Inventory Event Mapping seeded successfully');


  // Seed billing sample data
  await seedBillingSample(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
