import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@shared/api/httpClient'

const BASE = '/foundation/users'

export function useUsers(params = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => httpClient.get(BASE, { params }),
  })
}

export function useUser(id) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => httpClient.get(`${BASE}/${id}`),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => httpClient.post(BASE, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => httpClient.put(`${BASE}/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => httpClient.post(`${BASE}/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useResetUserPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => httpClient.post(`${BASE}/${id}/reset-password`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
