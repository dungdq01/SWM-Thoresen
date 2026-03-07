"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const permissionSeeds = [
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
    const permissions = [];
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
            update: { effect: client_1.RolePermissionEffect.ALLOW, createdBy: admin.id },
            create: {
                roleId: adminRole.id,
                permissionId: permission.id,
                effect: client_1.RolePermissionEffect.ALLOW,
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
            update: { effect: client_1.RolePermissionEffect.ALLOW, createdBy: admin.id },
            create: {
                roleId: governanceRole.id,
                permissionId: permission.id,
                effect: client_1.RolePermissionEffect.ALLOW,
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
    for (const sequenceCode of ['RCV', 'SHP', 'WRK', 'TRX', 'DN']) {
        await prisma.numberSequence.upsert({
            where: { sequenceCode },
            update: {
                description: `Sequence ${sequenceCode}`,
                scopeType: client_1.SequenceScopeType.PER_WAREHOUSE,
                resetPolicy: client_1.SequenceResetPolicy.DAILY,
                prefixTemplate: sequenceCode,
                formatTemplate: `${sequenceCode}-{yyyymmdd}-{running_no}`,
                runningNoLength: 6,
                isActive: true,
                updatedBy: admin.id,
            },
            create: {
                sequenceCode,
                description: `Sequence ${sequenceCode}`,
                scopeType: client_1.SequenceScopeType.PER_WAREHOUSE,
                resetPolicy: client_1.SequenceResetPolicy.DAILY,
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
            currentStatus: client_1.BusinessRuleStatus.CONFIRMED,
            sourceOfTruth: 'Module_1_techstack.md',
            effectivePhase: client_1.EffectivePhase.GO_LIVE,
            ownerRole: 'Tech Lead',
            isActive: true,
        },
        create: {
            ruleCode: 'FG-BR-001',
            domain: 'FOUNDATION',
            title: 'Mọi command side effect phải có idempotency',
            description: 'Module downstream phải truyền idempotency key hoặc external id cho command có side effect.',
            currentStatus: client_1.BusinessRuleStatus.CONFIRMED,
            sourceOfTruth: 'Module_1_techstack.md',
            effectivePhase: client_1.EffectivePhase.GO_LIVE,
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
            status: client_1.DecisionLogStatus.CONFIRMED,
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
            status: client_1.DecisionLogStatus.CONFIRMED,
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
            priority: client_1.ChangePriority.HIGH,
            status: client_1.ChangeControlStatus.APPROVED,
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
            priority: client_1.ChangePriority.HIGH,
            status: client_1.ChangeControlStatus.APPROVED,
            targetRelease: 'phase-1',
            requestedBy: admin.id,
            approvedBy: admin.id,
            approvedAt: new Date(),
            impactedModules: ['M1'],
        },
    });
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
//# sourceMappingURL=seed.js.map