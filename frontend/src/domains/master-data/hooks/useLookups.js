import { useQuery } from '@tanstack/react-query'
import { lookupApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'

export function useLookupOwners() {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupOwners,
    queryFn: () => lookupApi.getOwners(),
    staleTime: 60000,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}

export function useLookupVendors() {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupVendors,
    queryFn: () => lookupApi.getVendors(),
    staleTime: 60000,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}

export function useLookupItems() {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupItems,
    queryFn: () => lookupApi.getItems(),
    staleTime: 60000,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}

export function useLookupWarehouses() {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupWarehouses,
    queryFn: () => lookupApi.getWarehouses(),
    staleTime: 60000,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}

export function useLookupZones(warehouseId) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupZones(warehouseId),
    queryFn: () => lookupApi.getZones(warehouseId),
    staleTime: 60000,
    enabled: !!warehouseId,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}

export function useLookupLocations(warehouseId, zoneId) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupLocations(warehouseId, zoneId),
    queryFn: () => lookupApi.getLocations({ warehouseId, zoneId }),
    staleTime: 60000,
    enabled: !!warehouseId,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}

export function useLookupUoms() {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupUoms,
    queryFn: () => lookupApi.getUoms(),
    staleTime: 60000,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}

export function useLookupVehicleTypes() {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupVehicleTypes,
    queryFn: () => lookupApi.getVehicleTypes(),
    staleTime: 60000,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}

export function useLookupInventoryStatuses() {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.lookupInventoryStatuses,
    queryFn: () => lookupApi.getInventoryStatuses(),
    staleTime: 60000,
    select: (response) => (Array.isArray(response) ? response : response.data || []),
  })
}
