import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Warehouse,
  MapPin,
  Scale,
  Ruler,
  Box,
  Search,
  ChevronDown,
} from 'lucide-react'
import { useWarehouseList } from '@domains/master-data'
import { WarehouseMonitoringVisualization } from '@features/warehouse-monitoring'
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

function WarehouseSelector({ warehouses, selectedId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = warehouses?.find(w => w.id === selectedId)
  const filtered = useMemo(() => {
    if (!warehouses) return []
    if (!search) return warehouses
    const lower = search.toLowerCase()
    return warehouses.filter(
      w => w.warehouseName?.toLowerCase().includes(lower) || w.warehouseCode?.toLowerCase().includes(lower)
    )
  }, [warehouses, search])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-navy-200 rounded-xl hover:border-navy-300 transition-colors min-w-[280px]"
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Warehouse className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-navy-900">{selected?.warehouseName || 'Chọn kho'}</p>
          <p className="text-xs text-navy-500">{selected?.warehouseCode || 'Chưa chọn kho nào'}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-navy-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-navy-200 rounded-xl shadow-lg z-20 overflow-hidden">
            <div className="p-2 border-b border-navy-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kho..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-navy-200 rounded-lg focus:outline-none focus:border-blue-400"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-navy-500 text-center">Không tìm thấy kho</p>
              ) : (
                filtered.map(w => (
                  <button
                    key={w.id}
                    onClick={() => {
                      onSelect(w.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-navy-50 transition-colors ${
                      w.id === selectedId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center">
                      <Warehouse className="w-3.5 h-3.5 text-navy-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-navy-900">{w.warehouseName}</p>
                      <p className="text-xs text-navy-500">{w.warehouseCode} · {w.warehouseType}</p>
                    </div>
                    {w.id === selectedId && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function WarehouseMonitoringPage() {
  const navigate = useNavigate()
  const { data: warehousesResponse, isLoading } = useWarehouseList()

  const warehouses = useMemo(() => {
    if (!warehousesResponse) return []
    return warehousesResponse?.data || warehousesResponse || []
  }, [warehousesResponse])

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null)

  const selectedWarehouse = useMemo(() => {
    if (!selectedWarehouseId) {
      // Auto-select first warehouse
      if (warehouses.length > 0 && !selectedWarehouseId) {
        return warehouses[0]
      }
      return null
    }
    return warehouses.find(w => w.id === selectedWarehouseId)
  }, [selectedWarehouseId, warehouses])

  // Auto-select first warehouse on load
  useMemo(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id)
    }
  }, [warehouses, selectedWarehouseId])

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

  if (!warehouses.length) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <Warehouse className="w-12 h-12 text-navy-300 mx-auto mb-3" />
          <p className="text-navy-600 font-medium">Chưa có kho nào</p>
          <p className="text-sm text-navy-400 mt-1">Vui lòng tạo kho trong phần Dữ liệu nền trước.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/app/master-data/warehouses')}>
            Đi đến danh sách kho
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <WarehouseSelector
            warehouses={warehouses}
            selectedId={selectedWarehouseId}
            onSelect={setSelectedWarehouseId}
          />
        </div>
      </div>

      {selectedWarehouse && (
        <>
          {/* Info cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoCard
              icon={Ruler}
              label="Diện tích tổng"
              value={formatNumber(selectedWarehouse.totalAreaM2)}
              unit="m²"
            />
            <InfoCard
              icon={Box}
              label="DT sử dụng"
              value={formatNumber(selectedWarehouse.usableAreaM2)}
              unit="m²"
            />
            <InfoCard
              icon={Ruler}
              label="Chiều cao tối đa"
              value={selectedWarehouse.maxHeightM || '—'}
              unit={selectedWarehouse.maxHeightM ? 'm' : ''}
            />
            <InfoCard
              icon={Scale}
              label="Sức chứa tối đa"
              value={formatNumber(selectedWarehouse.maxCapacityMt)}
              unit="MT"
            />
          </div>

          {/* Address */}
          {selectedWarehouse.address && (
            <div className="flex items-start gap-2 px-4 py-3 bg-navy-50/50 rounded-xl">
              <MapPin className="w-4 h-4 text-navy-400 mt-0.5 shrink-0" />
              <p className="text-sm text-navy-700">{selectedWarehouse.address}</p>
            </div>
          )}

          {/* 3D Visualization */}
          <WarehouseMonitoringVisualization warehouse={selectedWarehouse} />
        </>
      )}
    </div>
  )
}
