import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goodsSplitApi } from '../api/goodsSplit.api'
import toast from 'react-hot-toast'

const QUERY_KEY = 'goods-split'

export function useGoodsSplits(params) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => goodsSplitApi.getAll(params).then(r => r.data),
  })
}

export function useGoodsSplitById(id) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => goodsSplitApi.getById(id).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateGoodsSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => goodsSplitApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Tạo phiếu chia hàng thành công')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Lỗi tạo phiếu chia hàng'),
  })
}

export function useConfirmGoodsSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => goodsSplitApi.confirm(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Xác nhận phiếu chia hàng thành công')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Lỗi xác nhận'),
  })
}

export function usePostGoodsSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => goodsSplitApi.post(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Ghi sổ phiếu chia hàng thành công')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Lỗi ghi sổ'),
  })
}

export function useCancelGoodsSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reasonCode }) => goodsSplitApi.cancel(id, reasonCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Đã hủy phiếu chia hàng')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Lỗi hủy phiếu'),
  })
}
