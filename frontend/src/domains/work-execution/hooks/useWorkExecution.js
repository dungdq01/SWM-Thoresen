import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'
import { workExecutionApi } from '../api/workExecution.api'

const QUERY_KEYS = {
  summary: ['work-execution', 'summary'],
  works: ['work-execution', 'works'],
  workDetail: (id) => ['work-execution', 'works', id],
  workHistory: (id) => ['work-execution', 'works', id, 'history'],
  workExceptions: (id) => ['work-execution', 'works', id, 'exceptions'],
  availableWorks: ['work-execution', 'available'],
  myWorks: ['work-execution', 'my'],
}

export function useWorkDashboardSummary(warehouseId) {
  return useQuery({
    queryKey: [...QUERY_KEYS.summary, warehouseId],
    queryFn: () => workExecutionApi.getDashboardSummary(warehouseId),
    staleTime: 30000,
  })
}

export function useWorks(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.works, filters],
    queryFn: () => workExecutionApi.getWorks(filters),
    staleTime: 15000,
  })
}

export function useWorkDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.workDetail(id),
    queryFn: () => workExecutionApi.getWorkById(id),
    enabled: Boolean(id),
  })
}

export function useWorkHistory(id) {
  return useQuery({
    queryKey: QUERY_KEYS.workHistory(id),
    queryFn: () => workExecutionApi.getWorkHistory(id),
    enabled: Boolean(id),
  })
}

export function useWorkExceptions(id) {
  return useQuery({
    queryKey: QUERY_KEYS.workExceptions(id),
    queryFn: () => workExecutionApi.getWorkExceptions(id),
    enabled: Boolean(id),
  })
}

export function useAvailableWorks(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.availableWorks, filters],
    queryFn: () => workExecutionApi.getAvailableWorks(filters),
    staleTime: 10000,
  })
}

export function useMyWorks(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.myWorks, filters],
    queryFn: () => workExecutionApi.getMyWorks(filters),
    staleTime: 10000,
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

export function useGenerateWork() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.works, QUERY_KEYS.summary], 'Đã tạo work', 'Không thể tạo work')
  return useMutation({ mutationFn: (data) => workExecutionApi.generateWork(data), onSuccess, onError })
}

export function useClaimWork() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.works, QUERY_KEYS.availableWorks, QUERY_KEYS.myWorks], 'Đã claim work', 'Không thể claim work')
  return useMutation({ mutationFn: ({ id, data }) => workExecutionApi.claimWork(id, data), onSuccess, onError })
}

export function useReleaseWork() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.works, QUERY_KEYS.availableWorks, QUERY_KEYS.myWorks], 'Đã release work', 'Không thể release work')
  return useMutation({ mutationFn: ({ id, data }) => workExecutionApi.releaseWork(id, data), onSuccess, onError })
}

export function useStartWork() {
  const { queryClient, onError } = useInvalidateQueries([QUERY_KEYS.works, QUERY_KEYS.myWorks], 'Đã start work', 'Không thể start work')
  return useMutation({
    mutationFn: ({ id, data }) => workExecutionApi.startWork(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.works })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myWorks })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workDetail(id) })
      toast.success('Đã start work')
    },
    onError,
  })
}

export function useStartLine() {
  const { queryClient, onError } = useInvalidateQueries([], 'Đã start line', 'Không thể start line')
  return useMutation({
    mutationFn: ({ workId, lineNum, data }) => workExecutionApi.startLine(workId, lineNum, data),
    onSuccess: (_, { workId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workDetail(workId) })
      toast.success('Đã start line')
    },
    onError,
  })
}

export function useCompleteLine() {
  const { queryClient, onError } = useInvalidateQueries([], 'Đã complete line', 'Không thể complete line')
  return useMutation({
    mutationFn: ({ workId, lineNum, data }) => workExecutionApi.completeLine(workId, lineNum, data),
    onSuccess: (_, { workId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workDetail(workId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.works })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      toast.success('Đã complete line và post InventTrans')
    },
    onError,
  })
}

export function useSkipLine() {
  const { queryClient, onError } = useInvalidateQueries([], 'Đã skip line', 'Không thể skip line')
  return useMutation({
    mutationFn: ({ workId, lineNum, data }) => workExecutionApi.skipLine(workId, lineNum, data),
    onSuccess: (_, { workId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workDetail(workId) })
      toast.success('Đã skip line')
    },
    onError,
  })
}

export function useCancelWork() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.works, QUERY_KEYS.summary, QUERY_KEYS.myWorks], 'Đã cancel work', 'Không thể cancel work')
  return useMutation({ mutationFn: ({ id, data }) => workExecutionApi.cancelWork(id, data), onSuccess, onError })
}

export function useValidateScan() {
  return useMutation({
    mutationFn: (data) => workExecutionApi.validateScan(data),
    onError: (error) => toast.error(parseApiError(error)),
  })
}

export { QUERY_KEYS as WORK_EXECUTION_QUERY_KEYS }
