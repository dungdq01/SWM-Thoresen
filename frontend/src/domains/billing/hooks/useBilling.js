import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { billingApi } from '../api/billing.api'

const QUERY_KEYS = {
  invoices: ['billing', 'invoices'],
  invoiceDetail: (id) => ['billing', 'invoices', id],
  rateCards: ['billing', 'rate-cards'],
  billableEvents: ['billing', 'billable-events'],
  dashboard: ['billing', 'dashboard'],
}

export function useInvoices(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.invoices, filters],
    queryFn: () => billingApi.getInvoices(filters),
    staleTime: 15000,
  })
}

export function useInvoiceDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.invoiceDetail(id),
    queryFn: () => billingApi.getInvoiceById(id),
    enabled: Boolean(id),
  })
}

export function useRateCards(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.rateCards, filters],
    queryFn: () => billingApi.getRateCards(filters),
    staleTime: 30000,
  })
}

export function useBillableEvents(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.billableEvents, filters],
    queryFn: () => billingApi.getBillableEvents(filters),
    staleTime: 15000,
  })
}

export function useBillingDashboard(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboard, params],
    queryFn: () => billingApi.getDashboard(params),
    staleTime: 30000,
  })
}

function useInvalidateQueries(keys, successMessage, errorMessage) {
  const queryClient = useQueryClient()
  return {
    queryClient,
    onSuccess: () => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      toast.success(successMessage)
    },
    onError: (error) => toast.error(error?.error?.message || errorMessage),
  }
}

export function useGenerateInvoice() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.invoices, QUERY_KEYS.dashboard, QUERY_KEYS.billableEvents], 'Đã generate invoice', 'Không thể generate invoice')
  return useMutation({ mutationFn: (data) => billingApi.generateInvoice(data), onSuccess, onError })
}

export function useApproveInvoice() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.invoices, QUERY_KEYS.dashboard], 'Đã approve invoice', 'Không thể approve invoice')
  return useMutation({ mutationFn: (id) => billingApi.approveInvoice(id), onSuccess, onError })
}

export function useCancelInvoice() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.invoices], 'Đã cancel invoice', 'Không thể cancel invoice')
  return useMutation({ mutationFn: ({ id, data }) => billingApi.cancelInvoice(id, data), onSuccess, onError })
}

export function useCreateRateCard() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.rateCards], 'Đã tạo rate card', 'Không thể tạo rate card')
  return useMutation({ mutationFn: (data) => billingApi.createRateCard(data), onSuccess, onError })
}

export function useUpdateRateCard() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.rateCards], 'Đã cập nhật rate card', 'Không thể cập nhật rate card')
  return useMutation({ mutationFn: ({ id, data }) => billingApi.updateRateCard(id, data), onSuccess, onError })
}

export { QUERY_KEYS as BILLING_QUERY_KEYS }
