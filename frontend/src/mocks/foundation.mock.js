import { delay, paginate, byKeyword, includesText } from './utils'

const foundationDb = {
  permissions: [
    { id: 'perm-001', permissionCode: 'foundation.role.view', permissionName: 'Xem vai trò', moduleCode: 'FOUNDATION' },
    { id: 'perm-002', permissionCode: 'foundation.role.manage', permissionName: 'Quản trị vai trò', moduleCode: 'FOUNDATION' },
    { id: 'perm-003', permissionCode: 'master_data.owner.view', permissionName: 'Xem owner', moduleCode: 'MASTER_DATA' },
    { id: 'perm-004', permissionCode: 'inventory.post', permissionName: 'Post inventory', moduleCode: 'INVENTORY_CORE' },
    { id: 'perm-005', permissionCode: 'inventory.reverse', permissionName: 'Reverse inventory', moduleCode: 'INVENTORY_CORE' },
  ],
  roles: [
    { id: 'role-001', roleCode: 'SYS_ADMIN', roleName: 'System Admin', description: 'Quản trị toàn hệ thống', isActive: true, permissions: ['perm-001', 'perm-002', 'perm-003', 'perm-004', 'perm-005'] },
    { id: 'role-002', roleCode: 'OPS_SUPERVISOR', roleName: 'Ops Supervisor', description: 'Giám sát vận hành kho', isActive: true, permissions: ['perm-003', 'perm-004', 'perm-005'] },
    { id: 'role-003', roleCode: 'CUST_VIEWER', roleName: 'Customer Viewer', description: 'Khách hàng chỉ xem dữ liệu scope owner', isActive: true, permissions: ['perm-003'] },
  ],
  reasonCodes: [
    { id: 'rc-001', code: 'DOCUMENT_ERROR', description: 'Sai tham chiếu chứng từ', category: 'INBOUND', domainCode: 'INBOUND', requiresApproval: false, requiresNote: true, affectsBilling: false, sortOrder: 1, isActive: true },
    { id: 'rc-002', code: 'MASTER_CLEANUP', description: 'Ngừng record cũ sau chuẩn hóa', category: 'GENERAL', domainCode: 'FOUNDATION', requiresApproval: true, requiresNote: false, affectsBilling: false, sortOrder: 2, isActive: true },
    { id: 'rc-003', code: 'DAMAGED_GOODS', description: 'Hàng hóa bị hư hỏng', category: 'ADJUSTMENT', domainCode: 'INVENTORY', requiresApproval: true, requiresNote: true, affectsBilling: true, sortOrder: 3, isActive: true },
    { id: 'rc-004', code: 'SHORT_SHIP', description: 'Giao thiếu hàng', category: 'OUTBOUND', domainCode: 'OUTBOUND', requiresApproval: false, requiresNote: true, affectsBilling: true, sortOrder: 4, isActive: true },
    { id: 'rc-005', code: 'CYCLE_COUNT_ADJ', description: 'Điều chỉnh sau kiểm kê', category: 'INVENTORY', domainCode: 'INVENTORY', requiresApproval: true, requiresNote: false, affectsBilling: false, sortOrder: 5, isActive: true },
  ],
  numberSequences: [
    { id: 'ns-001', sequenceCode: 'HOLD_NO', sequenceName: 'Hold Number', scopeType: 'GLOBAL', prefix: 'HLD', nextNumber: 1025, resetPolicy: 'NEVER', isActive: true },
    { id: 'ns-002', sequenceCode: 'TRANS_ID', sequenceName: 'Inventory Transaction', scopeType: 'GLOBAL', prefix: 'TRX', nextNumber: 4312, resetPolicy: 'DAILY', isActive: true },
  ],
  rules: [
    { id: 'rule-001', ruleCode: 'INV_NEGATIVE_BLOCK', ruleName: 'Chặn tồn âm', domain: 'INVENTORY', status: 'CONFIRMED', severity: 'HIGH', description: 'Không cho posting làm tồn âm' },
    { id: 'rule-002', ruleCode: 'MD_CONTROLLED_FIELDS', ruleName: 'Controlled fields for master', domain: 'MASTER_DATA', status: 'BASELINE', severity: 'MEDIUM', description: 'Một số field yêu cầu governance khi đổi' },
  ],
  decisionLogs: [
    { id: 'dl-001', title: 'Approve controlled update for warehouse baseline', decisionBy: 'admin', decisionDate: '2026-03-08T09:30:00Z', status: 'APPROVED', module: 'MASTER_DATA' },
    { id: 'dl-002', title: 'Freeze inventory reversal rules for phase 1', decisionBy: 'architect', decisionDate: '2026-03-08T13:15:00Z', status: 'APPROVED', module: 'INVENTORY_CORE' },
  ],
  auditLogs: [
    { id: 'al-001', createdAt: '2026-03-08T08:15:00Z', entityType: 'MdOwner', action: 'UPDATE', userId: 'admin', sourceModule: 'MASTER_DATA', entityId: 'owner-001' },
    { id: 'al-002', createdAt: '2026-03-08T09:05:00Z', entityType: 'InventTrans', action: 'POSTING_CREATE', userId: 'admin', sourceModule: 'INVENTORY_CORE', entityId: 'trans-001' },
    { id: 'al-003', createdAt: '2026-03-08T09:20:00Z', entityType: 'Role', action: 'CREATE', userId: 'admin', sourceModule: 'FOUNDATION', entityId: 'role-004' },
  ],
  exceptionLogs: [
    { id: 'ex-001', createdAt: '2026-03-08T09:50:00Z', exceptionType: 'INSUFFICIENT_AVAILABLE', severity: 'HIGH', sourceModule: 'INVENTORY_CORE', message: 'Không đủ tồn khả dụng để tạo hold', isResolved: false },
    { id: 'ex-002', createdAt: '2026-03-08T10:25:00Z', exceptionType: 'VERSION_CONFLICT', severity: 'MEDIUM', sourceModule: 'MASTER_DATA', message: 'Record owner bị cập nhật song song', isResolved: true },
  ],
}

const expandRole = (role) => ({ ...role, permissions: foundationDb.permissions.filter((perm) => role.permissions.includes(perm.id)) })

export const foundationMockApi = {
  getMyPermissions: () => delay({ data: { permissionCodes: foundationDb.permissions.map((item) => item.permissionCode) } }),
  getRoles: (params = {}) => {
    const filtered = foundationDb.roles.filter((role) => byKeyword(role, params.keyword || params.search, ['roleCode', 'roleName', 'description']))
    return delay({ data: filtered.map(expandRole) })
  },
  createRole: (data) => {
    const record = { id: `role-${Date.now()}`, isActive: true, permissions: [], ...data }
    foundationDb.roles.unshift(record)
    return delay({ data: expandRole(record) })
  },
  updateRole: (id, data) => {
    const index = foundationDb.roles.findIndex((item) => item.id === id)
    foundationDb.roles[index] = { ...foundationDb.roles[index], ...data }
    return delay({ data: expandRole(foundationDb.roles[index]) })
  },
  assignPermissionToRole: (roleId, data) => {
    const role = foundationDb.roles.find((item) => item.id === roleId)
    role.permissions = data.permissionIds || []
    return delay({ data: expandRole(role) })
  },
  deleteRole: (id) => {
    const index = foundationDb.roles.findIndex((item) => item.id === id)
    if (index !== -1) foundationDb.roles.splice(index, 1)
    return delay({ success: true })
  },
  getPermissions: (params = {}) => {
    const filtered = foundationDb.permissions.filter((item) => byKeyword(item, params.keyword || params.search, ['permissionCode', 'permissionName', 'moduleCode']))
    return delay({ data: filtered })
  },
  createPermission: (data) => {
    const record = { id: `perm-${Date.now()}`, ...data }
    foundationDb.permissions.unshift(record)
    return delay({ data: record })
  },
  updatePermission: (id, data) => {
    const index = foundationDb.permissions.findIndex((item) => item.id === id)
    if (index !== -1) foundationDb.permissions[index] = { ...foundationDb.permissions[index], ...data }
    return delay({ data: foundationDb.permissions[index] })
  },
  deletePermission: (id) => {
    const index = foundationDb.permissions.findIndex((item) => item.id === id)
    if (index !== -1) foundationDb.permissions.splice(index, 1)
    return delay({ success: true })
  },
  assignRoleToUser: () => delay({ success: true }),
  getReasonCodes: (params = {}) => delay({ data: foundationDb.reasonCodes.filter((item) => byKeyword(item, params.keyword || params.search, ['code', 'description', 'category'])) }),
  createReasonCode: (data) => {
    const record = { id: `rc-${Date.now()}`, isActive: true, ...data }
    foundationDb.reasonCodes.unshift(record)
    return delay({ data: record })
  },
  updateReasonCode: (id, data) => {
    const index = foundationDb.reasonCodes.findIndex((item) => item.id === id)
    foundationDb.reasonCodes[index] = { ...foundationDb.reasonCodes[index], ...data }
    return delay({ data: foundationDb.reasonCodes[index] })
  },
  deactivateReasonCode: (id) => {
    const reason = foundationDb.reasonCodes.find((item) => item.id === id)
    reason.isActive = false
    return delay({ data: reason })
  },
  getNumberSequences: (params = {}) => delay({ data: foundationDb.numberSequences.filter((item) => byKeyword(item, params.keyword || params.search, ['sequenceCode', 'sequenceName'])) }),
  createNumberSequence: (data) => {
    const record = { id: `ns-${Date.now()}`, isActive: true, ...data }
    foundationDb.numberSequences.unshift(record)
    return delay({ data: record })
  },
  updateNumberSequence: (id, data) => {
    const index = foundationDb.numberSequences.findIndex((item) => item.id === id)
    foundationDb.numberSequences[index] = { ...foundationDb.numberSequences[index], ...data }
    return delay({ data: foundationDb.numberSequences[index] })
  },
  getNextNumber: (code) => {
    const sequence = foundationDb.numberSequences.find((item) => item.sequenceCode === code)
    sequence.nextNumber += 1
    return delay({ data: { value: `${sequence.prefix}-${String(sequence.nextNumber).padStart(6, '0')}` } })
  },
  getRules: (params = {}) => delay({ data: foundationDb.rules.filter((item) => byKeyword(item, params.keyword || params.search, ['ruleCode', 'ruleName', 'domain'])) }),
  createRule: (data) => {
    const record = { id: `rule-${Date.now()}`, ...data }
    foundationDb.rules.unshift(record)
    return delay({ data: record })
  },
  updateRule: (id, data) => {
    const index = foundationDb.rules.findIndex((item) => item.id === id)
    foundationDb.rules[index] = { ...foundationDb.rules[index], ...data }
    return delay({ data: foundationDb.rules[index] })
  },
  getDecisionLogs: (params = {}) => delay({ data: foundationDb.decisionLogs.filter((item) => includesText(item.module, params.module) || !params.module) }),
  createDecisionLog: (data) => {
    const record = { id: `dl-${Date.now()}`, decisionDate: new Date().toISOString(), ...data }
    foundationDb.decisionLogs.unshift(record)
    return delay({ data: record })
  },
  createChangeControl: (data) => delay({ data: { id: `cc-${Date.now()}`, ...data } }),
  getAuditLogs: (params = {}) => {
    const filtered = foundationDb.auditLogs.filter((item) => includesText(item.entityType, params.entity))
    return delay({ ...paginate(filtered, params.page, params.limit) })
  },
  getExceptionLogs: (params = {}) => {
    const filtered = foundationDb.exceptionLogs.filter((item) => params.resolved === '' || params.resolved == null ? true : String(item.isResolved) === String(params.resolved))
    return delay({ ...paginate(filtered, params.page, params.limit) })
  },
  resolveExceptionLog: (id) => {
    const log = foundationDb.exceptionLogs.find((item) => item.id === id)
    log.isResolved = true
    return delay({ data: log })
  },
  getIdempotencyStatus: (key) => delay({ data: { key, status: 'COMPLETED' } }),
}
