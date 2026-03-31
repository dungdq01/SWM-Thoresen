import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Warehouse,
  MapPin,
  Scale,
  Ruler,
  Box,
  Edit2,
  ToggleLeft,
  ToggleRight,
  PenTool,
} from 'lucide-react'
import {
  useWarehouseDetail,
  useUpdateWarehouse,
  useDeactivateWarehouse,
  useReactivateWarehouse,
  StatusBadge,
  WarehouseTypeBadge,
  DeactivateModal,
  ReactivateModal,
} from '@domains/master-data'
import { useZoneList } from '@domains/master-data/hooks/useZones'
import { useLocationList } from '@domains/master-data/hooks/useLocations'
import { useRackList } from '@domains/master-data/hooks/useRacks'
import { WarehouseFormDrawer } from '@features/master-data'
import { WarehouseVisualization } from '@features/master-data/warehouse/visualization'
import { Button } from '@shared/ui'

const formatNumber = (num) => {
  if (num == null) return '—'
  return new Intl.NumberFormat('vi-VN').format(num)
}

function InfoCard({ icon: Icon, label, value, unit, className = '' }) {
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl bg-navy-50/50 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
        <Icon className="w-4 h-4 text-navy-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-navy-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-navy-900 truncate">
          {value}
          {unit && <span className="text-navy-500 font-normal ml-0.5">{unit}</span>}
        </p>
      </div>
    </div>
  )
}

export function WarehouseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: response, isLoading } = useWarehouseDetail(id)
  const { data: zoneRes } = useZoneList({ warehouseId: id, pageSize: 200 })
  const { data: locationRes } = useLocationList({ warehouseId: id, pageSize: 500 })
  const { data: rackRes } = useRackList({ warehouseId: id, pageSize: 200 })

  const zones = zoneRes?.data || []
  const locations = locationRes?.data || []
  const racks = rackRes?.data || []
  const updateMutation = useUpdateWarehouse()
  const deactivateMutation = useDeactivateWarehouse()
  const reactivateMutation = useReactivateWarehouse()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)

  const warehouse = response?.id ? response : (response?.data || null)

  const handleUpdate = async (data) => {
    try {
      await updateMutation.mutateAsync({ id, data })
      setDrawerOpen(false)
    } catch {
      // Error handled by mutation
    }
  }

  const handleDeactivate = async (reason) => {
    try {
      await deactivateMutation.mutateAsync({ id, reason })
      setDeactivateOpen(false)
    } catch {
      // Error handled by mutation
    }
  }

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(id)
      setReactivateOpen(false)
    } catch {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-navy-100 rounded" />
          <div className="h-[300px] md:h-[400px] lg:h-[500px] bg-navy-50 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!warehouse) {
    return (
      <div className="p-3 sm:p-6">
        <div className="text-center py-20">
          <Warehouse className="w-12 h-12 text-navy-300 mx-auto mb-3" />
          <p className="text-navy-600 font-medium">Không tìm thấy kho</p>
          <p className="text-sm text-navy-400 mt-1">Kho có thể đã bị xóa hoặc không tồn tại.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/app/master-data/warehouses')}>
            Quay lại danh sách
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/app/master-data/warehouses')}
            className="p-1.5 sm:p-2 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Warehouse className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-navy-900 truncate">{warehouse.warehouseName}</h1>
                <StatusBadge isActive={warehouse.isActive} />
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-navy-500">
                <span className="font-mono">{warehouse.warehouseCode}</span>
                <span>·</span>
                <WarehouseTypeBadge type={warehouse.warehouseType} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate(`/app/master-data/warehouses/${id}/layout-editor`)}>
            <PenTool className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Thiết kế mặt bằng</span>
            <span className="sm:hidden">Layout</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Chỉnh sửa</span>
            <span className="sm:hidden">Sửa</span>
          </Button>
          {warehouse.isActive ? (
            <Button variant="outline" size="sm" onClick={() => setDeactivateOpen(true)} className="text-red-600 border-red-200 hover:bg-red-50">
              <ToggleLeft className="w-3.5 h-3.5 mr-1" />
              <span className="hidden md:inline">Ngừng hoạt động</span>
              <span className="md:hidden">Ngừng</span>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setReactivateOpen(true)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              <ToggleRight className="w-3.5 h-3.5 mr-1" />
              <span className="hidden md:inline">Kích hoạt lại</span>
              <span className="md:hidden">Kích hoạt</span>
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <InfoCard
          icon={Ruler}
          label="Diện tích tổng"
          value={formatNumber(warehouse.totalAreaM2)}
          unit="m²"
        />
        <InfoCard
          icon={Box}
          label="DT sử dụng"
          value={formatNumber(warehouse.usableAreaM2)}
          unit="m²"
        />
        <InfoCard
          icon={Ruler}
          label="Chiều cao tối đa"
          value={warehouse.maxHeightM || '—'}
          unit={warehouse.maxHeightM ? 'm' : ''}
        />
        <InfoCard
          icon={Scale}
          label="Sức chứa tối đa"
          value={formatNumber(warehouse.maxCapacityMt)}
          unit="MT"
        />
      </div>

      {/* Address */}
      {warehouse.address && (
        <div className="flex items-start gap-2 px-4 py-3 bg-navy-50/50 rounded-xl">
          <MapPin className="w-4 h-4 text-navy-400 mt-0.5 shrink-0" />
          <p className="text-sm text-navy-700">{warehouse.address}</p>
        </div>
      )}

      {/* Visualization */}
      <WarehouseVisualization
        warehouse={warehouse}
        zones={zones}
        racks={racks}
        locations={locations}
      />

      {/* Modals */}
      <WarehouseFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleUpdate}
        initialData={warehouse}
        isLoading={updateMutation.isPending}
      />

      <DeactivateModal
        isOpen={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        entityName={warehouse.warehouseName}
        isLoading={deactivateMutation.isPending}
      />

      <ReactivateModal
        isOpen={reactivateOpen}
        onClose={() => setReactivateOpen(false)}
        onConfirm={handleReactivate}
        entityName={warehouse.warehouseName}
        isLoading={reactivateMutation.isPending}
      />
    </div>
  )
}
