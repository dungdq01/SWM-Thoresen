import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { billingApi } from '../api/billing.api'

const QUERY_KEYS = {
  debitNotes: ['billing', 'debit-notes'],
  debitNoteDetail: (id) => ['billing', 'debit-notes', id],
  contracts: ['billing', 'contracts'],
  events: ['billing', 'events'],
  dashboard: ['billing', 'dashboard'],
}

export function useDebitNotes(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.debitNotes, filters],
    queryFn: () => billingApi.getDebitNotes(filters),
    staleTime: 15000,
  })
}

export function useDebitNoteDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.debitNoteDetail(id),
    queryFn: () => billingApi.getDebitNoteById(id),
    enabled: Boolean(id),
  })
}

export function useContracts(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.contracts, filters],
    queryFn: () => billingApi.getContracts(filters),
    staleTime: 30000,
  })
}

export function useBillingEvents(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.events, filters],
    queryFn: () => billingApi.getEvents(filters),
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

export function useGenerateDebitNote() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.debitNotes, QUERY_KEYS.dashboard, QUERY_KEYS.events], 'Đã generate debit note', 'Không thể generate debit note')
  return useMutation({ mutationFn: (data) => billingApi.generateDebitNote(data), onSuccess, onError })
}

export function useReviewDebitNote() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.debitNotes], 'Đã review debit note', 'Không thể review debit note')
  return useMutation({ mutationFn: (id) => billingApi.reviewDebitNote(id), onSuccess, onError })
}

export function useApproveDebitNote() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.debitNotes, QUERY_KEYS.dashboard], 'Đã approve debit note', 'Không thể approve debit note')
  return useMutation({ mutationFn: (id) => billingApi.approveDebitNote(id), onSuccess, onError })
}

export function useLockDebitNote() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.debitNotes, QUERY_KEYS.dashboard], 'Đã lock debit note', 'Không thể lock debit note')
  return useMutation({ mutationFn: (id) => billingApi.lockDebitNote(id), onSuccess, onError })
}

export function useCreateContract() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.contracts], 'Đã tạo contract', 'Không thể tạo contract')
  return useMutation({ mutationFn: (data) => billingApi.createContract(data), onSuccess, onError })
}

export function useUpdateContract() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.contracts], 'Đã cập nhật contract', 'Không thể cập nhật contract')
  return useMutation({ mutationFn: ({ id, data }) => billingApi.updateContract(id, data), onSuccess, onError })
}

export { QUERY_KEYS as BILLING_QUERY_KEYS }
