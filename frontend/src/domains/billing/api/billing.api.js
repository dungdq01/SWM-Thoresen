import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/billing'

export const billingApi = {
  getDebitNotes: (params) => httpClient.get(`${BASE_URL}/debit-notes`, { params }),
  getDebitNoteById: (id) => httpClient.get(`${BASE_URL}/debit-notes/${id}`),
  generateDebitNote: (data) => httpClient.post(`${BASE_URL}/debit-notes`, data),
  reviewDebitNote: (id) => httpClient.put(`${BASE_URL}/debit-notes/${id}/review`, { externalId: `REV-${id}-${Date.now()}` }),
  approveDebitNote: (id) => httpClient.put(`${BASE_URL}/debit-notes/${id}/approve`, { externalId: `APR-${id}-${Date.now()}` }),
  lockDebitNote: (id) => httpClient.put(`${BASE_URL}/debit-notes/${id}/lock`, { externalId: `LCK-${id}-${Date.now()}` }),
  getContracts: (params) => httpClient.get(`${BASE_URL}/contracts`, { params }),
  createContract: (data) => httpClient.post(`${BASE_URL}/contracts`, data),
  updateContract: (id, data) => httpClient.put(`${BASE_URL}/contracts/${id}`, data),
  getEvents: (params) => httpClient.get(`${BASE_URL}/events`, { params }),
  captureEvent: (data) => httpClient.post(`${BASE_URL}/events/capture`, data),
  getDashboard: (params) => httpClient.get(`${BASE_URL}/debit-notes`, { params }),
}
