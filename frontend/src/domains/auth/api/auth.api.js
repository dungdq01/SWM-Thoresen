import { httpClient } from '@shared/api/httpClient'
import { foundationMockApi } from '@mocks/foundation.mock'
import { isMockApiEnabled } from '@mocks/utils'

const client = foundationMockApi

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const authApi = {
  getMyPermissions: withDataSource(
    () => client.getMyPermissions(),
    () => httpClient.get('/foundation/me/permissions')
  ),

  getRoles: withDataSource(
    (params) => client.getRoles(params),
    (params) => httpClient.get('/foundation/roles', { params })
  ),
  
  createRole: withDataSource(
    (data) => client.createRole(data),
    (data) => httpClient.post('/foundation/roles', data)
  ),
  
  updateRole: withDataSource(
    (id, data) => client.updateRole(id, data),
    (id, data) => httpClient.put(`/foundation/roles/${id}`, data)
  ),
  
  assignPermissionToRole: withDataSource(
    (roleId, data) => client.assignPermissionToRole(roleId, data),
    (roleId, data) => httpClient.post(`/foundation/roles/${roleId}/permissions`, data)
  ),

  getPermissions: withDataSource(
    (params) => client.getPermissions(params),
    (params) => httpClient.get('/foundation/permissions', { params })
  ),

  assignRoleToUser: withDataSource(
    (userId, data) => client.assignRoleToUser(userId, data),
    (userId, data) => httpClient.post(`/foundation/users/${userId}/roles`, data)
  ),

  getReasonCodes: withDataSource(
    (params) => client.getReasonCodes(params),
    (params) => httpClient.get('/foundation/reason-codes', { params })
  ),
  
  createReasonCode: withDataSource(
    (data) => client.createReasonCode(data),
    (data) => httpClient.post('/foundation/reason-codes', data)
  ),
  
  updateReasonCode: withDataSource(
    (id, data) => client.updateReasonCode(id, data),
    (id, data) => httpClient.put(`/foundation/reason-codes/${id}`, data)
  ),
  
  deactivateReasonCode: withDataSource(
    (id) => client.deactivateReasonCode(id),
    (id) => httpClient.post(`/foundation/reason-codes/${id}/deactivate`)
  ),

  getNumberSequences: withDataSource(
    (params) => client.getNumberSequences(params),
    (params) => httpClient.get('/foundation/number-sequences', { params })
  ),
  
  createNumberSequence: withDataSource(
    (data) => client.createNumberSequence(data),
    (data) => httpClient.post('/foundation/number-sequences', data)
  ),
  
  updateNumberSequence: withDataSource(
    (id, data) => client.updateNumberSequence(id, data),
    (id, data) => httpClient.put(`/foundation/number-sequences/${id}`, data)
  ),
  
  getNextNumber: withDataSource(
    (code, data) => client.getNextNumber(code, data),
    (code, data) => httpClient.post(`/foundation/number-sequences/${code}/next`, data)
  ),

  getRules: withDataSource(
    (params) => client.getRules(params),
    (params) => httpClient.get('/foundation/rules', { params })
  ),
  
  createRule: withDataSource(
    (data) => client.createRule(data),
    (data) => httpClient.post('/foundation/rules', data)
  ),
  
  updateRule: withDataSource(
    (id, data) => client.updateRule(id, data),
    (id, data) => httpClient.put(`/foundation/rules/${id}`, data)
  ),

  getDecisionLogs: withDataSource(
    (params) => client.getDecisionLogs(params),
    (params) => httpClient.get('/foundation/decision-logs', { params })
  ),
  
  createDecisionLog: withDataSource(
    (data) => client.createDecisionLog(data),
    (data) => httpClient.post('/foundation/decision-logs', data)
  ),

  createChangeControl: withDataSource(
    (data) => client.createChangeControl(data),
    (data) => httpClient.post('/foundation/change-controls', data)
  ),

  getAuditLogs: withDataSource(
    (params) => client.getAuditLogs(params),
    (params) => httpClient.get('/foundation/audit-logs', { params })
  ),

  getExceptionLogs: withDataSource(
    (params) => client.getExceptionLogs(params),
    (params) => httpClient.get('/foundation/exception-logs', { params })
  ),
  
  resolveExceptionLog: withDataSource(
    (id) => client.resolveExceptionLog(id),
    (id) => httpClient.post(`/foundation/exception-logs/${id}/resolve`)
  ),

  getIdempotencyStatus: withDataSource(
    (key) => client.getIdempotencyStatus(key),
    (key) => httpClient.get(`/foundation/idempotency/${key}`)
  ),
}
