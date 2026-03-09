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
  return useQuery({
    queryKey: [...QUERY_KEYS.inventoryReport, filters],
    queryFn: () => reportingApi.getInventoryReport(filters),
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
  return useQuery({
    queryKey: [...QUERY_KEYS.auditLogs, filters],
    queryFn: () => reportingApi.getAuditLogs(filters),
    staleTime: 15000,
  })
}

export function useReconResults(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.reconResults, filters],
    queryFn: () => reportingApi.getReconResults(filters),
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
