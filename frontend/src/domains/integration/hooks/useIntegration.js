import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'
import { integrationApi } from '../api/integration.api'

const QUERY_KEYS = {
  overview: ['integration', 'overview'],
  channelHealth: ['integration', 'channel-health'],
  stats: ['integration', 'stats'],
  alerts: ['integration', 'alerts'],
  alertDetail: (id) => ['integration', 'alerts', id],
  weighbridgeLogs: ['integration', 'weighbridge', 'logs'],
  weighbridgeDevices: ['integration', 'weighbridge', 'devices'],
  ocrResults: ['integration', 'ocr', 'results'],
  ocrResultDetail: (id) => ['integration', 'ocr', 'results', id],
}

export function useIntegrationOverview() {
  return useQuery({
    queryKey: QUERY_KEYS.overview,
    queryFn: () => integrationApi.getOverview(),
    staleTime: 30000,
  })
}

export function useChannelHealth() {
  return useQuery({
    queryKey: QUERY_KEYS.channelHealth,
    queryFn: () => integrationApi.getChannelHealth(),
    staleTime: 15000,
  })
}

export function useIntegrationStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: () => integrationApi.getDetailedStats(),
    staleTime: 30000,
  })
}

export function useAlerts(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.alerts, filters],
    queryFn: () => integrationApi.getAlerts(filters),
    staleTime: 15000,
  })
}

export function useAlertDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.alertDetail(id),
    queryFn: () => integrationApi.getAlertById(id),
    enabled: Boolean(id),
  })
}

export function useWeighbridgeLogs(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.weighbridgeLogs, filters],
    queryFn: () => integrationApi.getWeighbridgeLogs(filters),
    staleTime: 15000,
  })
}

export function useWeighbridgeDevices(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.weighbridgeDevices, filters],
    queryFn: () => integrationApi.getWeighbridgeDevices(filters),
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
    onError: (error) => toast.error(parseApiError(error)),
  }
}

export function useAcknowledgeAlert() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.alerts, QUERY_KEYS.overview], 'Đã acknowledge alert', 'Không thể acknowledge alert')
  return useMutation({ mutationFn: ({ id, data }) => integrationApi.acknowledgeAlert(id, data), onSuccess, onError })
}

export function useResolveAlert() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.alerts, QUERY_KEYS.overview], 'Đã resolve alert', 'Không thể resolve alert')
  return useMutation({ mutationFn: ({ id, data }) => integrationApi.resolveAlert(id, data), onSuccess, onError })
}

export function useReprocessWeighEvent() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.weighbridgeLogs], 'Đã reprocess weigh event', 'Không thể reprocess')
  return useMutation({ mutationFn: ({ id, data }) => integrationApi.reprocessWeighEvent(id, data), onSuccess, onError })
}

// OCR Hooks
export function useOcrResults(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ocrResults, filters],
    queryFn: () => integrationApi.getOcrResults(filters),
    staleTime: 10000,
  })
}

export function useOcrResultDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.ocrResultDetail(id),
    queryFn: () => integrationApi.getOcrResultById(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query?.state?.data?.status
      return (status === 'UPLOADED' || status === 'EXTRACTING') ? 2000 : false
    },
  })
}

export function useUploadOcrImage() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.ocrResults], 'Đã tải ảnh lên thành công', 'Tải ảnh thất bại')
  return useMutation({ mutationFn: (formData) => integrationApi.uploadOcrImage(formData), onSuccess, onError })
}

export function useConfirmOcrResult() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.ocrResults], 'Đã xác nhận kết quả OCR', 'Không thể xác nhận')
  return useMutation({ mutationFn: ({ id, data }) => integrationApi.confirmOcrResult(id, data), onSuccess, onError })
}

export function useRejectOcrResult() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.ocrResults], 'Đã từ chối kết quả OCR', 'Không thể từ chối')
  return useMutation({ mutationFn: ({ id, data }) => integrationApi.rejectOcrResult(id, data), onSuccess, onError })
}

export { QUERY_KEYS as INTEGRATION_QUERY_KEYS }
