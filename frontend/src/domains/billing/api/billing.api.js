import { httpClient } from '@shared/api/httpClient'
import { billingMockApi } from '@mocks/billing.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/billing'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const billingApi = {
  getDebitNotes: withDataSource(
    (params) => billingMockApi.getInvoices(params),
    (params) => httpClient.get(`${BASE_URL}/debit-notes`, { params })
  ),
  getDebitNoteById: withDataSource(
    (id) => billingMockApi.getInvoiceById(id),
    (id) => httpClient.get(`${BASE_URL}/debit-notes/${id}`)
  ),
  generateDebitNote: withDataSource(
    (data) => billingMockApi.generateInvoice(data),
    (data) => httpClient.post(`${BASE_URL}/debit-notes`, data)
  ),
  reviewDebitNote: withDataSource(
    (id) => billingMockApi.approveInvoice?.(id) || Promise.resolve({ data: {} }),
    (id) => httpClient.put(`${BASE_URL}/debit-notes/${id}/review`)
  ),
  approveDebitNote: withDataSource(
    (id) => billingMockApi.approveInvoice(id),
    (id) => httpClient.put(`${BASE_URL}/debit-notes/${id}/approve`)
  ),
  lockDebitNote: withDataSource(
    (id) => Promise.resolve({ data: {} }),
    (id) => httpClient.put(`${BASE_URL}/debit-notes/${id}/lock`)
  ),
  getContracts: withDataSource(
    (params) => billingMockApi.getRateCards(params),
    (params) => httpClient.get(`${BASE_URL}/contracts`, { params })
  ),
  createContract: withDataSource(
    (data) => billingMockApi.createRateCard(data),
    (data) => httpClient.post(`${BASE_URL}/contracts`, data)
  ),
  updateContract: withDataSource(
    (id, data) => billingMockApi.updateRateCard(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/contracts/${id}`, data)
  ),
  getEvents: withDataSource(
    (params) => billingMockApi.getBillableEvents(params),
    (params) => httpClient.get(`${BASE_URL}/events`, { params })
  ),
  getDashboard: withDataSource(
    (params) => billingMockApi.getDashboard(params),
    (params) => httpClient.get(`${BASE_URL}/debit-notes`, { params })
  ),
}
