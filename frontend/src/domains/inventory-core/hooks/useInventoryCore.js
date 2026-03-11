import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { inventoryCoreApi } from '../api/inventoryCore.api'

const QUERY_KEYS = {
  onHand: ['inventory-core', 'on-hand'],
  availability: ['inventory-core', 'availability'],
  transactions: ['inventory-core', 'transactions'],
  transactionDetail: (transId) => ['inventory-core', 'transactions', transId],
  holds: ['inventory-core', 'holds'],
}

export function useOnHandList(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.onHand, filters],
    queryFn: () => inventoryCoreApi.getOnHand(filters),
    staleTime: 30000,
    select: (response) => {
      // Handle both unwrapped array and wrapped { data, pagination } format
      if (Array.isArray(response)) {
        return { data: response, pagination: { page: 1, totalPages: 1, total: response.length } }
      }
      return {
        data: response?.data ?? response ?? [],
        pagination: response?.pagination ?? { page: 1, totalPages: 1, total: 0 },
      }
    },
  })
}

export function useAvailabilityCheck(params = {}, enabled = false) {
  return useQuery({
    queryKey: [...QUERY_KEYS.availability, params],
    queryFn: () => inventoryCoreApi.getAvailability(params),
    enabled,
    staleTime: 15000,
  })
}

export function useTransactionList(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.transactions, filters],
    queryFn: () => inventoryCoreApi.getTransactions(filters),
    staleTime: 30000,
    select: (response) => {
      if (Array.isArray(response)) {
        return { data: response, pagination: { page: 1, totalPages: 1, total: response.length } }
      }
      return {
        data: response?.data ?? [],
        pagination: response?.pagination ?? { page: 1, totalPages: 1, total: 0 },
      }
    },
  })
}

export function useTransactionDetail(transId) {
  return useQuery({
    queryKey: QUERY_KEYS.transactionDetail(transId),
    queryFn: () => inventoryCoreApi.getTransactionById(transId),
    enabled: !!transId,
  })
}

export function useHoldList(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.holds, filters],
    queryFn: () => inventoryCoreApi.getHolds(filters),
    staleTime: 30000,
  })
}

export function useCreatePosting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => inventoryCoreApi.createPosting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
      toast.success('Đã post inventory transaction')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể post transaction')
    },
  })
}

export function useReversePosting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => inventoryCoreApi.reversePosting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
      toast.success('Đã reverse transaction')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể reverse transaction')
    },
  })
}

export function useCreateHold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => inventoryCoreApi.createHold(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holds })
      toast.success('Đã tạo hold')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể tạo hold')
    },
  })
}

export function useReleaseHold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ holdId, data }) => inventoryCoreApi.releaseHold(holdId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holds })
      toast.success('Đã release hold')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể release hold')
    },
  })
}

export function useCancelHold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ holdId, data }) => inventoryCoreApi.cancelHold(holdId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holds })
      toast.success('Đã hủy hold')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể hủy hold')
    },
  })
}

export { QUERY_KEYS as INVENTORY_CORE_QUERY_KEYS }
