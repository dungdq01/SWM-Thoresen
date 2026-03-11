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

const cleanFilters = (filters) => {
  const cleaned = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined && value !== null) {
      cleaned[key] = value
    }
  }
  return cleaned
}

export function useDebitNotes(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.debitNotes, filters],
    queryFn: () => billingApi.getDebitNotes(cleanFilters(filters)),
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
    queryFn: () => billingApi.getContracts(cleanFilters(filters)),
    staleTime: 30000,
  })
}

export function useBillingEvents(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.events, filters],
    queryFn: () => billingApi.getEvents(cleanFilters(filters)),
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

const billingErrorMessages = {
  'BIL-DN-NO-CHARGES-422': 'Không có sự kiện thanh toán nào trong kỳ này để tạo phiếu nợ',
  'BIL-DN-NOT-FOUND-404': 'Không tìm thấy phiếu nợ',
  'BIL-DN-INVALID-STATE-409': 'Trạng thái phiếu nợ không hợp lệ',
  'BIL-DN-EXTERNAL-ID-EXISTS-409': 'Phiếu nợ đã tồn tại cho kỳ này',
  'BIL-DN-BLOCKER-EXCEPTION-422': 'Có ngoại lệ chặn phiếu nợ này',
  'BIL-CONTRACT-NOT-FOUND-404': 'Không tìm thấy hợp đồng',
  'BIL-CONTRACT-OVERLAP-409': 'Hợp đồng trùng lặp với hợp đồng đang hoạt động',
}

function getErrorMessage(error, fallback) {
  const code = error?.error?.code || error?.code
  const message = error?.error?.message || error?.message
  if (code && billingErrorMessages[code]) {
    return billingErrorMessages[code]
  }
  return message || fallback
}

function useInvalidateQueries(keys, successMessage, errorMessage) {
  const queryClient = useQueryClient()
  return {
    queryClient,
    onSuccess: () => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      toast.success(successMessage)
    },
    onError: (error) => toast.error(getErrorMessage(error, errorMessage)),
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

export function useCaptureEvent() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.events, QUERY_KEYS.dashboard], 'Đã tạo sự kiện thanh toán', 'Không thể tạo sự kiện')
  return useMutation({ mutationFn: (data) => billingApi.captureEvent(data), onSuccess, onError })
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
