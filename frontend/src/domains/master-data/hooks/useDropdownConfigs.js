import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dropdownConfigApi, lookupApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

const DROPDOWN_CONFIG_KEYS = {
  all: ['master-data', 'dropdown-configs'],
  list: (params) => ['master-data', 'dropdown-configs', 'list', params],
  detail: (id) => ['master-data', 'dropdown-configs', id],
  entities: ['master-data', 'dropdown-configs', 'entities'],
  fields: (entity) => ['master-data', 'dropdown-configs', 'fields', entity],
  options: (entity, fieldName) => ['master-data', 'dropdown-options', entity, fieldName],
}

export function useDropdownConfigList(params = {}) {
  return useQuery({
    queryKey: DROPDOWN_CONFIG_KEYS.list(params),
    queryFn: () => dropdownConfigApi.getList(params),
    staleTime: 30000,
  })
}

export function useDropdownConfigEntities() {
  return useQuery({
    queryKey: DROPDOWN_CONFIG_KEYS.entities,
    queryFn: () => dropdownConfigApi.getEntities(),
    staleTime: 60000,
  })
}

export function useDropdownConfigFields(entity) {
  return useQuery({
    queryKey: DROPDOWN_CONFIG_KEYS.fields(entity),
    queryFn: () => dropdownConfigApi.getFieldsByEntity(entity),
    enabled: !!entity,
    staleTime: 60000,
  })
}

export function useDropdownOptions(entity, fieldName) {
  return useQuery({
    queryKey: DROPDOWN_CONFIG_KEYS.options(entity, fieldName),
    queryFn: () => lookupApi.getDropdownOptions(entity, fieldName),
    enabled: !!entity && !!fieldName,
    staleTime: 30000,
  })
}

export function useCreateDropdownConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => dropdownConfigApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DROPDOWN_CONFIG_KEYS.all })
      toast.success('Thêm giá trị dropdown thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateDropdownConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => dropdownConfigApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DROPDOWN_CONFIG_KEYS.all })
      toast.success('Cập nhật giá trị dropdown thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeleteDropdownConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => dropdownConfigApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DROPDOWN_CONFIG_KEYS.all })
      toast.success('Xóa giá trị dropdown thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useSetDefaultDropdownConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => dropdownConfigApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DROPDOWN_CONFIG_KEYS.all })
      toast.success('Đã đặt làm giá trị mặc định')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
