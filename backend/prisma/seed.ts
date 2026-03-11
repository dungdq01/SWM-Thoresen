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
  CargoForm,
  OwnerType,
  SourceApp,
  InventoryStage,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { seedMasterDataSample } from './seed/master-data-sample.seed';

const prisma = new PrismaClient();

const permissionSeeds: Array<[string, string, string, string, boolean]> = [
  // Foundation permissions
  ['foundation.roles.view', 'FOUNDATION', 'ROLE', 'VIEW', false],
  ['foundation.roles.create', 'FOUNDATION', 'ROLE', 'CREATE', true],
  ['foundation.roles.update', 'FOUNDATION', 'ROLE', 'UPDATE', true],
  ['foundation.roles.assign_permission', 'FOUNDATION', 'ROLE', 'ASSIGN_PERMISSION', true],
  ['foundation.permissions.view', 'FOUNDATION', 'PERMISSION', 'VIEW', false],
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
  ['master_data.zone.view', 'MASTER_DATA', 'ZONE', 'VIEW', false],
  ['master_data.zone.create', 'MASTER_DATA', 'ZONE', 'CREATE', true],
  ['master_data.zone.update', 'MASTER_DATA', 'ZONE', 'UPDATE', true],
  ['master_data.zone.deactivate', 'MASTER_DATA', 'ZONE', 'DEACTIVATE', true],
  ['master_data.location.view', 'MASTER_DATA', 'LOCATION', 'VIEW', false],
  ['master_data.location.create', 'MASTER_DATA', 'LOCATION', 'CREATE', true],
  ['master_data.location.update', 'MASTER_DATA', 'LOCATION', 'UPDATE', true],
  ['master_data.location.deactivate', 'MASTER_DATA', 'LOCATION', 'DEACTIVATE', true],
  ['master_data.uom.view', 'MASTER_DATA', 'UOM', 'VIEW', false],
  ['master_data.uom.create', 'MASTER_DATA', 'UOM', 'CREATE', true],
  ['master_data.uom.update', 'MASTER_DATA', 'UOM', 'UPDATE', true],
  ['master_data.uom.deactivate', 'MASTER_DATA', 'UOM', 'DEACTIVATE', true],
  ['master_data.vehicle_type.view', 'MASTER_DATA', 'VEHICLE_TYPE', 'VIEW', false],
  ['master_data.vehicle_type.create', 'MASTER_DATA', 'VEHICLE_TYPE', 'CREATE', true],
  ['master_data.vehicle_type.update', 'MASTER_DATA', 'VEHICLE_TYPE', 'UPDATE', true],
  ['master_data.vehicle_type.deactivate', 'MASTER_DATA', 'VEHICLE_TYPE', 'DEACTIVATE', true],
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
  // Inbound: Purchase Orders
  ['inbound.po.view', 'INBOUND', 'PO', 'VIEW', false],
  ['inbound.po.create', 'INBOUND', 'PO', 'CREATE', true],
  ['inbound.po.update', 'INBOUND', 'PO', 'UPDATE', true],
  ['inbound.po.confirm', 'INBOUND', 'PO', 'CONFIRM', true],
  ['inbound.po.close', 'INBOUND', 'PO', 'CLOSE', true],
  ['inbound.po.cancel', 'INBOUND', 'PO', 'CANCEL', true],
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
  for (const sequenceCode of ['RCV', 'SHP', 'WRK', 'TRX', 'DN', 'TRF', 'ADJ']) {
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

  // Seed Owners
  const ownerSeeds = [
    { ownerCode: 'TVL', ownerName: 'Thoresen Vinalines', shortName: 'TVL', ownerGroup: 'LOCAL', ownerType: OwnerType.DIRECT, taxCode: '0100107518', address: 'Phú Mỹ, Bà Rịa - Vũng Tàu' },
    { ownerCode: 'CARGILL', ownerName: 'Cargill Vietnam', shortName: 'CARGILL', ownerGroup: 'FOREIGN', ownerType: OwnerType.CONSIGNED, taxCode: '0301234567', address: 'Quận 7, TP.HCM' },
    { ownerCode: 'OLAM', ownerName: 'Olam International', shortName: 'OLAM', ownerGroup: 'FOREIGN', ownerType: OwnerType.CONSIGNED, taxCode: '0301234568', address: 'Quận 1, TP.HCM' },
  ];

  const ownerMap: Record<string, string> = {};
  for (const owner of ownerSeeds) {
    const created = await prisma.mdOwner.upsert({
      where: { ownerCode: owner.ownerCode },
      update: { ownerName: owner.ownerName, updatedBy: admin.id },
      create: { ...owner, createdBy: admin.id, updatedBy: admin.id },
    });
    ownerMap[owner.ownerCode] = created.id;
  }

  // Seed Items
  const itemSeeds = [
    { itemCode: 'RICE-JASMINE', itemName: 'Gạo Jasmine', productGroup: 'AGRICULTURAL', cargoForm: CargoForm.BULK },
    { itemCode: 'CORN-YELLOW', itemName: 'Bắp vàng', productGroup: 'AGRICULTURAL', cargoForm: CargoForm.BULK },
    { itemCode: 'WHEAT-SOFT', itemName: 'Lúa mì mềm', productGroup: 'AGRICULTURAL', cargoForm: CargoForm.BULK },
    { itemCode: 'FERT-UREA', itemName: 'Phân Urê', productGroup: 'FERTILIZER', cargoForm: CargoForm.BAGGED_50KG },
    { itemCode: 'FERT-NPK', itemName: 'Phân NPK', productGroup: 'FERTILIZER', cargoForm: CargoForm.BAGGED_50KG },
    { itemCode: 'SUGAR-RAW', itemName: 'Đường thô', productGroup: 'AGRICULTURAL', cargoForm: CargoForm.BULK },
  ];

  const itemMap: Record<string, string> = {};
  for (const item of itemSeeds) {
    const created = await prisma.mdItem.upsert({
      where: { itemCode: item.itemCode },
      update: { itemName: item.itemName, updatedBy: admin.id },
      create: {
        ...item,
        baseUomId: uomMap['KG'],
        billingUomId: uomMap['MT'],
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
    itemMap[item.itemCode] = created.id;
  }

  // Get inventory status AVAILABLE
  const availableStatus = await prisma.mdInventoryStatus.findUnique({ where: { statusCode: 'AVAILABLE' } });
  const damagedStatus = await prisma.mdInventoryStatus.findUnique({ where: { statusCode: 'DAMAGED' } });

  // Get location for InventDim
  const storageLocation = await prisma.mdLocation.findFirst({ where: { warehouseId: warehouse.id, locationCode: 'STR-A-001' } });

  // Create InventDim for transactions
  const inventDimSeeds = [
    { ownerCode: 'TVL', statusCode: 'AVAILABLE' },
    { ownerCode: 'CARGILL', statusCode: 'AVAILABLE' },
    { ownerCode: 'OLAM', statusCode: 'AVAILABLE' },
    { ownerCode: 'TVL', statusCode: 'DAMAGED' },
  ];

  const inventDimMap: Record<string, string> = {};
  for (const dim of inventDimSeeds) {
    const dimKey = `${dim.ownerCode}-${dim.statusCode}`;
    const dimHash = `hash-${dimKey}-${Date.now()}`;
    const statusId = dim.statusCode === 'AVAILABLE' ? availableStatus!.id : damagedStatus!.id;
    
    const existing = await prisma.inventDim.findFirst({
      where: {
        warehouseId: warehouse.id,
        locationId: storageLocation!.id,
        ownerId: ownerMap[dim.ownerCode],
        inventoryStatusId: statusId,
      },
    });

    if (existing) {
      inventDimMap[dimKey] = existing.id;
    } else {
      const created = await prisma.inventDim.create({
        data: {
          dimId: `DIM-${dimKey}-${Date.now()}`,
          dimHash: dimHash,
          siteId: 'TVL-SITE',
          warehouseId: warehouse.id,
          locationId: storageLocation!.id,
          ownerId: ownerMap[dim.ownerCode],
          inventoryStatusId: statusId,
          createdBy: admin.id,
        },
      });
      inventDimMap[dimKey] = created.id;
    }
  }

  // Seed Inventory Transactions
  const transactionSeeds = [
    { transId: 'TRX-20260310-000001', refType: 'RECEIPT', refId: 'RCV-20260310-001', transType: InventoryTransType.RECEIPT_IN, itemCode: 'RICE-JASMINE', qty: 25000, ownerCode: 'TVL', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260310-000002', refType: 'RECEIPT', refId: 'RCV-20260310-001', transType: InventoryTransType.RECEIPT_IN, itemCode: 'CORN-YELLOW', qty: 15000, ownerCode: 'TVL', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260310-000003', refType: 'RECEIPT', refId: 'RCV-20260310-002', transType: InventoryTransType.RECEIPT_IN, itemCode: 'WHEAT-SOFT', qty: 30000, ownerCode: 'CARGILL', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260310-000004', refType: 'SHIPMENT', refId: 'SHP-20260310-001', transType: InventoryTransType.SHIPMENT_OUT, itemCode: 'RICE-JASMINE', qty: -5000, ownerCode: 'TVL', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260310-000005', refType: 'ADJUSTMENT', refId: 'ADJ-20260310-001', transType: InventoryTransType.ADJUSTMENT, itemCode: 'CORN-YELLOW', qty: -200, ownerCode: 'TVL', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260311-000001', refType: 'RECEIPT', refId: 'RCV-20260311-001', transType: InventoryTransType.RECEIPT_IN, itemCode: 'FERT-UREA', qty: 50000, ownerCode: 'OLAM', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260311-000002', refType: 'RECEIPT', refId: 'RCV-20260311-001', transType: InventoryTransType.RECEIPT_IN, itemCode: 'FERT-NPK', qty: 35000, ownerCode: 'OLAM', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260311-000003', refType: 'TRANSFER', refId: 'TRF-20260311-001', transType: InventoryTransType.TRANSFER_OUT, itemCode: 'WHEAT-SOFT', qty: -10000, ownerCode: 'CARGILL', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260311-000004', refType: 'COUNT', refId: 'CNT-20260311-001', transType: InventoryTransType.COUNT_GAIN, itemCode: 'SUGAR-RAW', qty: 500, ownerCode: 'TVL', statusCode: 'AVAILABLE' },
    { transId: 'TRX-20260311-000005', refType: 'STATUS_CHANGE', refId: 'STC-20260311-001', transType: InventoryTransType.STATUS_CHANGE, itemCode: 'RICE-JASMINE', qty: 1000, ownerCode: 'TVL', statusCode: 'DAMAGED' },
  ];

  for (const trans of transactionSeeds) {
    const dimKey = `${trans.ownerCode}-${trans.statusCode}`;
    const existing = await prisma.inventTrans.findUnique({ where: { transId: trans.transId } });
    
    if (!existing) {
      await prisma.inventTrans.create({
        data: {
          transId: trans.transId,
          refType: trans.refType,
          refId: trans.refId,
          transType: trans.transType,
          itemId: itemMap[trans.itemCode],
          qty: trans.qty,
          uomId: uomMap['KG'],
          dimToId: inventDimMap[dimKey],
          stage: InventoryStage.PHYSICAL,
          externalId: `EXT-${trans.transId}`,
          correlationId: `COR-${trans.refId}`,
          sourceApp: SourceApp.WEB,
          postedBy: admin.id,
          postedAt: new Date(),
          ownerId: ownerMap[trans.ownerCode],
        },
      });
    }
  }

  console.log('✅ Module 2 Master Data seeded successfully');
  console.log('✅ Module 3 Inventory Transactions seeded successfully');

  // ========== Master Data Sample (expanded) ==========
  await seedMasterDataSample(prisma);

  // ========== Module 3: Inventory Event Mapping ==========
  const eventMappingSeeds: Array<{
    eventCode: string;
    sourceModule: string;
    sourceObject: string;
    triggerState: string;
    transType: InventoryTransType;
    affectPhysical: boolean;
    affectHold: boolean;
    reversible: boolean;
  }> = [
    { eventCode: 'RECEIPT_RECEIVED', sourceModule: 'INBOUND', sourceObject: 'Receipt', triggerState: 'RECEIVED', transType: InventoryTransType.RECEIPT_IN, affectPhysical: true, affectHold: false, reversible: true },
    { eventCode: 'PUTAWAY_COMPLETED', sourceModule: 'WORK_EXEC', sourceObject: 'WorkLine', triggerState: 'COMPLETED', transType: InventoryTransType.MOVE, affectPhysical: true, affectHold: false, reversible: true },
    { eventCode: 'SHIPMENT_SHIPPED', sourceModule: 'OUTBOUND', sourceObject: 'Shipment', triggerState: 'SHIPPED', transType: InventoryTransType.SHIPMENT_OUT, affectPhysical: true, affectHold: true, reversible: true },
    { eventCode: 'MOVE_COMPLETED', sourceModule: 'INV_CTRL', sourceObject: 'MoveOrder', triggerState: 'COMPLETED', transType: InventoryTransType.MOVE, affectPhysical: true, affectHold: false, reversible: true },
    { eventCode: 'STATUS_CHANGE_CONFIRMED', sourceModule: 'INV_CTRL', sourceObject: 'StatusChange', triggerState: 'CONFIRMED', transType: InventoryTransType.STATUS_CHANGE, affectPhysical: false, affectHold: false, reversible: true },
    { eventCode: 'ADJUSTMENT_APPROVED', sourceModule: 'INV_CTRL', sourceObject: 'Adjustment', triggerState: 'APPROVED', transType: InventoryTransType.ADJUSTMENT, affectPhysical: true, affectHold: false, reversible: true },
    { eventCode: 'COUNT_GAIN_RECONCILED', sourceModule: 'INV_CTRL', sourceObject: 'CycleCount', triggerState: 'RECONCILED', transType: InventoryTransType.COUNT_GAIN, affectPhysical: true, affectHold: false, reversible: false },
    { eventCode: 'COUNT_LOSS_RECONCILED', sourceModule: 'INV_CTRL', sourceObject: 'CycleCount', triggerState: 'RECONCILED', transType: InventoryTransType.COUNT_LOSS, affectPhysical: true, affectHold: false, reversible: false },
    { eventCode: 'VAS_CONSUME', sourceModule: 'VAS', sourceObject: 'VasWorkOrder', triggerState: 'COMPLETED', transType: InventoryTransType.VAS_CONSUME, affectPhysical: true, affectHold: false, reversible: true },
    { eventCode: 'VAS_PRODUCE', sourceModule: 'VAS', sourceObject: 'VasWorkOrder', triggerState: 'COMPLETED', transType: InventoryTransType.VAS_PRODUCE, affectPhysical: true, affectHold: false, reversible: true },
    { eventCode: 'TRANSFER_OUT', sourceModule: 'INV_CTRL', sourceObject: 'TransferOrder', triggerState: 'SHIPPED', transType: InventoryTransType.TRANSFER_OUT, affectPhysical: true, affectHold: false, reversible: true },
    { eventCode: 'TRANSFER_IN', sourceModule: 'INV_CTRL', sourceObject: 'TransferOrder', triggerState: 'RECEIVED', transType: InventoryTransType.TRANSFER_IN, affectPhysical: true, affectHold: false, reversible: true },
    // Direct adjustment for testing/seeding
    { eventCode: 'DIRECT_ADJUSTMENT', sourceModule: 'FOUNDATION', sourceObject: 'Manual', triggerState: 'APPROVED', transType: InventoryTransType.ADJUSTMENT, affectPhysical: true, affectHold: false, reversible: true },
  ];

  for (const em of eventMappingSeeds) {
    await prisma.inventoryEventMapping.upsert({
      where: { eventCode: em.eventCode },
      update: { ...em, activeFlag: true },
      create: { ...em, activeFlag: true },
    });
  }

  console.log('✅ Module 3 Inventory Event Mapping seeded successfully');
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
