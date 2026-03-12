import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reportingApi } from '../api/reporting.api'

const QUERY_KEYS = {
  dashboard: ['reporting', 'dashboard'],
  inventoryReport: ['reporting', 'inventory'],
  billingReport: ['reporting', 'billing'],
  auditLogs: ['reporting', 'audit'],
  reconResults: ['reporting', 'reconciliation'],
  goLiveGates: ['reporting', 'go-live'],
}

export function useReportingDashboard() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => reportingApi.getDashboard(),
    staleTime: 30000,
    refetchInterval: 60000,
  })
}

export function useInventoryReport(filters = {}) {
  // Filter out empty string values to avoid validation errors
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  )
  return useQuery({
    queryKey: [...QUERY_KEYS.inventoryReport, cleanFilters],
    queryFn: () => reportingApi.getInventoryReport(cleanFilters),
    staleTime: 15000,
  })
}

export function useBillingReport(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.billingReport, params],
    queryFn: () => reportingApi.getBillingReport(params),
    staleTime: 30000,
  })
}

export function useAuditLogs(filters = {}) {
  // Filter out empty string values to avoid validation errors
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  )
  return useQuery({
    queryKey: [...QUERY_KEYS.auditLogs, cleanFilters],
    queryFn: () => reportingApi.getAuditLogs(cleanFilters),
    staleTime: 15000,
  })
}

export function useReconResults(filters = {}) {
  // Filter out empty string values to avoid validation errors
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  )
  return useQuery({
    queryKey: [...QUERY_KEYS.reconResults, cleanFilters],
    queryFn: () => reportingApi.getReconResults(cleanFilters),
    staleTime: 30000,
    refetchInterval: 120000,
  })
}

export function useGoLiveGates() {
  return useQuery({
    queryKey: QUERY_KEYS.goLiveGates,
    queryFn: () => reportingApi.getGoLiveGates(),
    staleTime: 10000,
  })
}

export function useUpdateGoLiveGate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => reportingApi.updateGoLiveGate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goLiveGates })
      toast.success('Đã cập nhật trạng thái gate')
    },
    onError: (error) => toast.error(error?.error?.message || 'Không thể cập nhật gate'),
  })
}

export { QUERY_KEYS as REPORTING_QUERY_KEYS }
