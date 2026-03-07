import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@shared/api/queryClient'
import { authApi } from '../api/auth.api'

export function usePermissions(filters = {}) {
  return useQuery({
    queryKey: queryKeys.permissions.list(filters),
    queryFn: () => authApi.getPermissions(filters),
    select: (response) => response.data || [],
  })
}

export function useMyPermissions() {
  return useQuery({
    queryKey: queryKeys.auth.permissions,
    queryFn: () => authApi.getMyPermissions(),
    select: (response) => response.data || {},
    staleTime: 10 * 60 * 1000,
  })
}
