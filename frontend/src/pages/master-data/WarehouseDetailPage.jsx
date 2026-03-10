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
  const updateMutation = useUpdateWarehouse()
  const deactivateMutation = useDeactivateWarehouse()
  const reactivateMutation = useReactivateWarehouse()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)

  const warehouse = response?.data || null

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
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-navy-100 rounded" />
          <div className="h-[500px] bg-navy-50 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!warehouse) {
    return (
      <div className="p-6">
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
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/master-data/warehouses')}
            className="p-2 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-navy-900">{warehouse.warehouseName}</h1>
                <StatusBadge isActive={warehouse.isActive} />
              </div>
              <div className="flex items-center gap-2 text-sm text-navy-500">
                <span className="font-mono">{warehouse.warehouseCode}</span>
                <span>·</span>
                <WarehouseTypeBadge type={warehouse.warehouseType} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Chỉnh sửa
          </Button>
          {warehouse.isActive ? (
            <Button variant="outline" size="sm" onClick={() => setDeactivateOpen(true)} className="text-red-600 border-red-200 hover:bg-red-50">
              <ToggleLeft className="w-3.5 h-3.5 mr-1.5" />
              Ngừng hoạt động
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setReactivateOpen(true)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              <ToggleRight className="w-3.5 h-3.5 mr-1.5" />
              Kích hoạt lại
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      <WarehouseVisualization warehouse={warehouse} />

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
