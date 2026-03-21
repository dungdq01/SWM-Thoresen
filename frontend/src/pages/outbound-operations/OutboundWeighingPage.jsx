import { useState } from 'react'
import { Scale, RefreshCw, History } from 'lucide-react'
import {
  useShipments,
  useRecordTareWeight,
  useRecordGrossWeight,
  useWeighingHistory,
} from '@domains/outbound-operations'
import {
  Badge, Button, Input, Pagination, Modal,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow,
} from '@shared/ui'

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'CONFIRMED', label: 'Chờ cân' },
  { value: 'WEIGHING_1', label: 'Đang cân lần 1' },
  { value: 'WEIGHING_2', label: 'Đang cân lần 2' },
  { value: 'WEIGHED', label: 'Hoàn thành cân' },
]

const statusTone = (status) => {
  if (status === 'CONFIRMED') return 'info'
  if (['WEIGHING_1', 'WEIGHING_2'].includes(status)) return 'warning'
  if (status === 'WEIGHED') return 'success'
  return 'default'
}

const STATUS_LABELS = {
  CONFIRMED: 'Chờ cân',
  WEIGHING_1: 'Đang cân lần 1',
  WEIGHING_2: 'Đang cân lần 2',
  WEIGHED: 'Hoàn thành cân',
}

// ─── Tare Weight Modal ──────────────────────────────────────────────────────

function TareWeightModal({ isOpen, onClose, shipment, onSubmit, isLoading }) {
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = () => {
    if (!weight || isNaN(weight)) return
    onSubmit({
      shipmentId: shipment?.id,
      tareWeight: Number(weight),
      notes: notes || undefined,
    })
    setWeight('')
    setNotes('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cân bì — ${shipment?.shipmentNumber || ''}`} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Cân nặng bì (kg) <span className="text-red-500">*</span></label>
          <Input
            type="number"
            placeholder="Nhập cân nặng bì..."
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Ghi chú</label>
          <Input
            placeholder="Ghi chú (tùy chọn)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
          <Button variant="accent" onClick={handleSubmit} isLoading={isLoading} disabled={!weight || isNaN(weight)}>
            Ghi cân bì
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Gross Weight Modal ─────────────────────────────────────────────────────

function GrossWeightModal({ isOpen, onClose, shipment, onSubmit, isLoading }) {
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = () => {
    if (!weight || isNaN(weight)) return
    onSubmit({
      shipmentId: shipment?.id,
      grossWeight: Number(weight),
      notes: notes || undefined,
    })
    setWeight('')
    setNotes('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cân tổng — ${shipment?.shipmentNumber || ''}`} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Cân nặng tổng (kg) <span className="text-red-500">*</span></label>
          <Input
            type="number"
            placeholder="Nhập cân nặng tổng..."
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Ghi chú</label>
          <Input
            placeholder="Ghi chú (tùy chọn)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
          <Button variant="accent" onClick={handleSubmit} isLoading={isLoading} disabled={!weight || isNaN(weight)}>
            Ghi cân tổng
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Weighing History Modal ─────────────────────────────────────────────────

function WeighingHistoryModal({ isOpen, onClose, shipmentId }) {
  const { data: response, isLoading } = useWeighingHistory(
    shipmentId ? { shipmentId } : {}
  )
  const history = response?.data || response || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lịch sử cân" size="md">
      {isLoading ? (
        <p className="text-center text-navy-400 py-4">Đang tải...</p>
      ) : history.length === 0 ? (
        <p className="text-center text-navy-400 py-4">Chưa có lịch sử cân.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {history.map((item, idx) => (
            <div key={item.id || idx} className="border border-moon-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-navy-800">
                  {item.type === 'TARE' ? 'Cân bì' : item.type === 'GROSS' ? 'Cân tổng' : item.type}
                </span>
                <span className="text-xs text-navy-400">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                </span>
              </div>
              <p className="text-lg font-semibold text-navy-900 mt-1">
                {Number(item.weight || 0).toLocaleString('vi-VN')} kg
              </p>
              {item.notes && <p className="text-xs text-navy-400 mt-1">{item.notes}</p>}
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={onClose}>Đóng</Button>
      </div>
    </Modal>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function OutboundWeighingPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '' })
  const [tareModal, setTareModal] = useState({ isOpen: false, shipment: null })
  const [grossModal, setGrossModal] = useState({ isOpen: false, shipment: null })
  const [historyModal, setHistoryModal] = useState({ isOpen: false, shipmentId: null })

  const { data: response, isLoading, refetch } = useShipments({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
  })
  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const recordTare = useRecordTareWeight()
  const recordGross = useRecordGrossWeight()

  const handleTareSubmit = async (data) => {
    await recordTare.mutateAsync(data)
    setTareModal({ isOpen: false, shipment: null })
  }

  const handleGrossSubmit = async (data) => {
    await recordGross.mutateAsync(data)
    setGrossModal({ isOpen: false, shipment: null })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ice/10">
            <Scale className="w-5 h-5 text-ice" />
          </div>
          <div>
            <h2 className="section-title">Cân hàng xuất</h2>
            <p className="text-sm text-navy-400">Ghi nhận cân bì và cân tổng cho phiếu xuất</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilters((prev) => ({ ...prev, status: s.value, page: 1 }))}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filters.status === s.value
                  ? 'bg-ice text-navy-950 border-ice'
                  : 'bg-transparent text-navy-400 border-moon-200 hover:border-ice hover:text-ice',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Input
          placeholder="Tìm theo số phiếu, biển số xe..."
          value={filters.keyword}
          onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
        />

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Phiếu xuất</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead align="right">Cân bì (kg)</TableHead>
              <TableHead align="right">Cân tổng (kg)</TableHead>
              <TableHead align="right">Cân hàng (kg)</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={8} />}
            {!isLoading && rows.length === 0 && (
              <TableEmpty colSpan={8} message="Không có phiếu xuất nào trong giai đoạn cân." />
            )}
            {!isLoading && rows.map((shp) => {
              const tare = Number(shp.tareWeight || 0)
              const gross = Number(shp.grossWeight || 0)
              const net = gross > 0 && tare > 0 ? gross - tare : 0
              return (
                <TableRow key={shp.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{shp.shipmentNumber || '—'}</p>
                    <p className="text-xs text-navy-400">{shp.soNumber || ''}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-navy-700">{shp.vehicleNumber || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{shp.owner?.ownerCode || '—'}</p>
                    <p className="text-xs text-navy-400">{shp.owner?.ownerName || ''}</p>
                  </TableCell>
                  <TableCell align="right">
                    <span className={tare > 0 ? 'font-medium text-navy-900 tabular-nums' : 'text-navy-400'}>
                      {tare > 0 ? tare.toLocaleString('vi-VN') : '—'}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span className={gross > 0 ? 'font-medium text-navy-900 tabular-nums' : 'text-navy-400'}>
                      {gross > 0 ? gross.toLocaleString('vi-VN') : '—'}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span className={net > 0 ? 'font-semibold text-emerald-600 tabular-nums' : 'text-navy-400'}>
                      {net > 0 ? net.toLocaleString('vi-VN') : '—'}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={statusTone(shp.status)}>
                      {STATUS_LABELS[shp.status] || shp.status}
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center gap-1">
                      {['CONFIRMED', 'WEIGHING_1'].includes(shp.status) && (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => setTareModal({ isOpen: true, shipment: shp })}
                          title="Ghi cân bì"
                        >
                          Cân bì
                        </Button>
                      )}
                      {['WEIGHING_1', 'WEIGHING_2'].includes(shp.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGrossModal({ isOpen: true, shipment: shp })}
                          title="Ghi cân tổng"
                        >
                          Cân tổng
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistoryModal({ isOpen: true, shipmentId: shp.id })}
                        title="Lịch sử cân"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* Modals */}
      <TareWeightModal
        isOpen={tareModal.isOpen}
        onClose={() => setTareModal({ isOpen: false, shipment: null })}
        shipment={tareModal.shipment}
        onSubmit={handleTareSubmit}
        isLoading={recordTare.isPending}
      />
      <GrossWeightModal
        isOpen={grossModal.isOpen}
        onClose={() => setGrossModal({ isOpen: false, shipment: null })}
        shipment={grossModal.shipment}
        onSubmit={handleGrossSubmit}
        isLoading={recordGross.isPending}
      />
      <WeighingHistoryModal
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal({ isOpen: false, shipmentId: null })}
        shipmentId={historyModal.shipmentId}
      />
    </>
  )
}
