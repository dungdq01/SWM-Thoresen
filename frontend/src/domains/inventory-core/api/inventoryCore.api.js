import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/inventory'

export const inventoryCoreApi = {
  getOnHand: (params) => httpClient.get(`${BASE_URL}/onhand`, { params }),
  getAvailability: (params) => httpClient.get(`${BASE_URL}/onhand/availability`, { params }),
  getTransactions: (params) => httpClient.get(`${BASE_URL}/transactions`, { params }),
  getTransactionById: (transId) => httpClient.get(`${BASE_URL}/transactions/${transId}`),
  createPosting: (data) => httpClient.post(`${BASE_URL}/postings`, data),
  reversePosting: (data) => httpClient.post(`${BASE_URL}/postings/reverse`, data),
  getHolds: (params) => httpClient.get(`${BASE_URL}/holds`, { params }),
  createHold: (data) => httpClient.post(`${BASE_URL}/holds`, data),
  releaseHold: (holdId, data) => httpClient.post(`${BASE_URL}/holds/${holdId}/release`, data),
  cancelHold: (holdId, data) => httpClient.post(`${BASE_URL}/holds/${holdId}/cancel`, data),

  // Reconciliation APIs
  createReconciliationRun: (data) => httpClient.post(`${BASE_URL}/reconciliation/runs`, data),
  getReconciliationRuns: (params) => httpClient.get(`${BASE_URL}/reconciliation/runs`, { params }),
  getReconciliationRun: (runId) => httpClient.get(`${BASE_URL}/reconciliation/runs/${runId}`),
  reviewReconciliationResult: (resultId, data) => httpClient.post(`${BASE_URL}/reconciliation/results/${resultId}/review`, data),
  resolveReconciliationResult: (resultId, data) => httpClient.post(`${BASE_URL}/reconciliation/results/${resultId}/resolve`, data),

  // Snapshot APIs
  createSnapshotRun: (data) => httpClient.post(`${BASE_URL}/snapshots/runs`, data),
  getSnapshotRuns: (params) => httpClient.get(`${BASE_URL}/snapshots/runs`, { params }),
  getSnapshotRun: (runId) => httpClient.get(`${BASE_URL}/snapshots/runs/${runId}`),
  getSnapshotsBilling: (params) => httpClient.get(`${BASE_URL}/snapshots/billing`, { params }),
  getSnapshotsBillingAggregate: (params) => httpClient.get(`${BASE_URL}/snapshots/billing/aggregate`, { params }),
}
