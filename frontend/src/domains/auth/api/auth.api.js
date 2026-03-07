import { httpClient } from '@shared/api/httpClient'

export const authApi = {
  getMyPermissions: () => httpClient.get('/foundation/me/permissions'),

  getRoles: (params) => httpClient.get('/foundation/roles', { params }),
  
  createRole: (data) => httpClient.post('/foundation/roles', data),
  
  updateRole: (id, data) => httpClient.put(`/foundation/roles/${id}`, data),
  
  assignPermissionToRole: (roleId, data) => 
    httpClient.post(`/foundation/roles/${roleId}/permissions`, data),

  getPermissions: (params) => httpClient.get('/foundation/permissions', { params }),

  assignRoleToUser: (userId, data) => 
    httpClient.post(`/foundation/users/${userId}/roles`, data),

  getReasonCodes: (params) => httpClient.get('/foundation/reason-codes', { params }),
  
  createReasonCode: (data) => httpClient.post('/foundation/reason-codes', data),
  
  updateReasonCode: (id, data) => httpClient.put(`/foundation/reason-codes/${id}`, data),
  
  deactivateReasonCode: (id) => httpClient.post(`/foundation/reason-codes/${id}/deactivate`),

  getNumberSequences: (params) => httpClient.get('/foundation/number-sequences', { params }),
  
  createNumberSequence: (data) => httpClient.post('/foundation/number-sequences', data),
  
  updateNumberSequence: (id, data) => httpClient.put(`/foundation/number-sequences/${id}`, data),
  
  getNextNumber: (code, data) => httpClient.post(`/foundation/number-sequences/${code}/next`, data),

  getRules: (params) => httpClient.get('/foundation/rules', { params }),
  
  createRule: (data) => httpClient.post('/foundation/rules', data),
  
  updateRule: (id, data) => httpClient.put(`/foundation/rules/${id}`, data),

  getDecisionLogs: (params) => httpClient.get('/foundation/decision-logs', { params }),
  
  createDecisionLog: (data) => httpClient.post('/foundation/decision-logs', data),

  createChangeControl: (data) => httpClient.post('/foundation/change-controls', data),

  getAuditLogs: (params) => httpClient.get('/foundation/audit-logs', { params }),

  getExceptionLogs: (params) => httpClient.get('/foundation/exception-logs', { params }),
  
  resolveExceptionLog: (id) => httpClient.post(`/foundation/exception-logs/${id}/resolve`),

  getIdempotencyStatus: (key) => httpClient.get(`/foundation/idempotency/${key}`),
}
