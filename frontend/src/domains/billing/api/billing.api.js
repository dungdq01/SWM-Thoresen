import { httpClient } from '@shared/api/httpClient'
import { billingMockApi } from '@mocks/billing.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/api/v1/billing'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const billingApi = {
  getInvoices: withDataSource(
    (params) => billingMockApi.getInvoices(params),
    (params) => httpClient.get(`${BASE_URL}/invoices`, { params })
  ),
  getInvoiceById: withDataSource(
    (id) => billingMockApi.getInvoiceById(id),
    (id) => httpClient.get(`${BASE_URL}/invoices/${id}`)
  ),
  generateInvoice: withDataSource(
    (data) => billingMockApi.generateInvoice(data),
    (data) => httpClient.post(`${BASE_URL}/invoices/generate`, data)
  ),
  approveInvoice: withDataSource(
    (id) => billingMockApi.approveInvoice(id),
    (id) => httpClient.post(`${BASE_URL}/invoices/${id}/approve`)
  ),
  cancelInvoice: withDataSource(
    (id, data) => billingMockApi.cancelInvoice(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/invoices/${id}/cancel`, data)
  ),
  getRateCards: withDataSource(
    (params) => billingMockApi.getRateCards(params),
    (params) => httpClient.get(`${BASE_URL}/rate-cards`, { params })
  ),
  createRateCard: withDataSource(
    (data) => billingMockApi.createRateCard(data),
    (data) => httpClient.post(`${BASE_URL}/rate-cards`, data)
  ),
  updateRateCard: withDataSource(
    (id, data) => billingMockApi.updateRateCard(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/rate-cards/${id}`, data)
  ),
  getBillableEvents: withDataSource(
    (params) => billingMockApi.getBillableEvents(params),
    (params) => httpClient.get(`${BASE_URL}/billable-events`, { params })
  ),
  getDashboard: withDataSource(
    (params) => billingMockApi.getDashboard(params),
    (params) => httpClient.get(`${BASE_URL}/dashboard`, { params })
  ),
}
