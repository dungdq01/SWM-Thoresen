import { useState } from 'react'
import { useVasWorkOrders, useAddVasSession, useCompleteVasWorkOrder } from '@domains/vas'
import { Badge, Button, Input, Modal, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'COMPLETED' || status === 'CLOSED') return 'success'
  if (status === 'IN_PROGRESS' || status === 'ACTIVE') return 'warning'
  return 'default'
}

export function VasExecutionPage() {
  const [selectedWoId, setSelectedWoId] = useState(null)
  const [sessionDraft, setSessionDraft] = useState({ sessionQtyKg: '', sessionBagCount: '', shiftCode: 'MORNING', workHours: '' })

  // Show both CONFIRMED (ready to execute) and IN_PROGRESS work orders
  const { data: woResponse, refetch: refetchWo } = useVasWorkOrders({ })

  const addSession = useAddVasSession()
  const completeWorkOrder = useCompleteVasWorkOrder()

  // Filter to show only CONFIRMED and IN_PROGRESS work orders for execution
  const allWorkOrders = woResponse?.data || []
  const workOrders = allWorkOrders.filter((wo) => ['CONFIRMED', 'IN_PROGRESS'].includes(wo.status))
  const selectedWo = workOrders.find((w) => w.id === selectedWoId)

  const openDetail = (id) => setSelectedWoId(id)
  const closeDetail = () => setSelectedWoId(null)

  const handleAddSession = async () => {
    if (!selectedWoId) return
    await addSession.mutateAsync({
      woId: selectedWoId,
      data: {
        sessionDate: new Date().toISOString().slice(0, 10),
        shiftCode: sessionDraft.shiftCode,
        sessionQtyKg: Number(sessionDraft.sessionQtyKg) || 0,
        sessionBagCount: Number(sessionDraft.sessionBagCount) || 0,
        workHours: Number(sessionDraft.workHours) || 0,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      },
    })
    setSessionDraft({ sessionQtyKg: '', sessionBagCount: '', shiftCode: 'DAY', workHours: '' })
    refetchWo()
  }

  const handleCompleteWorkOrder = async () => {
    if (selectedWoId && selectedWo) {
      await completeWorkOrder.mutateAsync({ id: selectedWoId, data: { actualBagsProduced: selectedWo.actualBagsProduced } })
      refetchWo()
      closeDetail()
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Thực Hiện VAS</h2>
        <Button variant="outline" size="sm" onClick={refetchWo}>Làm Mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Đơn Hàng</TableHead>
              <TableHead align="right">Tiến Độ</TableHead>
              <TableHead align="center">Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((wo) => (
              <TableRow key={wo.id} onClick={() => openDetail(wo.id)}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{wo.woNumber}</p>
                  <p className="text-xs text-navy-400">{wo.bulkSourceItem?.itemCode || '-'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{wo.actualBagCount || 0} / {wo.packagingQtyPlanned || 0}</p>
                  <div className="w-full bg-moon-200 rounded-full h-1.5 mt-1">
                    <div className="bg-ice h-1.5 rounded-full" style={{ width: `${wo.packagingQtyPlanned > 0 ? ((wo.actualBagCount || 0) / wo.packagingQtyPlanned) * 100 : 0}%` }} />
                  </div>
                </TableCell>
                <TableCell align="center">
                  <Button variant="ghost" size="sm" onClick={() => openDetail(wo.id)}>Thực Hiện</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={!!selectedWo}
        onClose={closeDetail}
        title={`Đơn Hàng: ${selectedWo?.woNumber || ''}`}
        description={`Đóng Bao · ${selectedWo?.bulkSourceItem?.itemCode || '-'}`}
        size="lg"
      >
        {selectedWo && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-xl font-bold text-navy-900">{selectedWo.plannedQtyKg ? Number(selectedWo.plannedQtyKg).toLocaleString() : '-'}</p>
                <p className="text-xs text-navy-500">Nguồn (kg)</p>
              </div>
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-xl font-bold text-navy-900">{selectedWo.packagingQtyPlanned?.toLocaleString() || '-'}</p>
                <p className="text-xs text-navy-500">Mục Tiêu (bao)</p>
              </div>
              <div className="rounded-xl bg-ice/10 p-3">
                <p className="text-xl font-bold text-ice">{(selectedWo.actualBagCount || 0).toLocaleString()}</p>
                <p className="text-xs text-navy-500">Sản Xuất</p>
              </div>
            </div>

            {(selectedWo.actualBagCount || 0) >= (selectedWo.packagingQtyPlanned || 0) && selectedWo.packagingQtyPlanned > 0 && (
              <Button variant="accent" className="w-full" onClick={handleCompleteWorkOrder}>Hoàn Thành Đơn Hàng</Button>
            )}

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Thêm Phiên Làm Việc</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Khối Lượng (kg)" type="number" value={sessionDraft.sessionQtyKg} onChange={(e) => setSessionDraft((prev) => ({ ...prev, sessionQtyKg: e.target.value }))} />
                <Input label="Số Bao" type="number" value={sessionDraft.sessionBagCount} onChange={(e) => setSessionDraft((prev) => ({ ...prev, sessionBagCount: e.target.value }))} />
                <Input label="Giờ Làm Việc" type="number" value={sessionDraft.workHours} onChange={(e) => setSessionDraft((prev) => ({ ...prev, workHours: e.target.value }))} />
                <select className="w-full px-3 py-2 border border-moon-300 rounded-lg text-sm" value={sessionDraft.shiftCode} onChange={(e) => setSessionDraft((prev) => ({ ...prev, shiftCode: e.target.value }))}>
                  <option value="MORNING">Sáng</option>
                  <option value="AFTERNOON">Chiều</option>
                  <option value="NIGHT">Đêm</option>
                </select>
              </div>
              <Button variant="accent" className="w-full" onClick={handleAddSession} disabled={addSession.isPending}>
                {addSession.isPending ? 'Đang thêm...' : 'Thêm Phiên'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
