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
  const [sessionDraft, setSessionDraft] = useState({ sessionQtyKg: '', sessionBagCount: '', shiftCode: 'DAY', workHours: '' })

  const { data: woResponse, refetch: refetchWo } = useVasWorkOrders({ status: 'IN_PROGRESS' })

  const addSession = useAddVasSession()
  const completeWorkOrder = useCompleteVasWorkOrder()

  const workOrders = woResponse?.data || []
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
        <h2 className="section-title">VAS Execution</h2>
        <Button variant="outline" size="sm" onClick={refetchWo}>Refresh</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Work Order</TableHead>
              <TableHead align="right">Progress</TableHead>
              <TableHead align="center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((wo) => (
              <TableRow key={wo.id} onClick={() => openDetail(wo.id)}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{wo.woNumber}</p>
                  <p className="text-xs text-navy-400">{wo.sourceItem?.code}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{wo.actualBagsProduced} / {wo.targetQty}</p>
                  <div className="w-full bg-moon-200 rounded-full h-1.5 mt-1">
                    <div className="bg-ice h-1.5 rounded-full" style={{ width: `${wo.targetQty > 0 ? (wo.actualBagsProduced / wo.targetQty) * 100 : 0}%` }} />
                  </div>
                </TableCell>
                <TableCell align="center">
                  <Button variant="ghost" size="sm" onClick={() => openDetail(wo.id)}>Execute</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={!!selectedWo}
        onClose={closeDetail}
        title={`Work Order: ${selectedWo?.woNumber || ''}`}
        description={`${selectedWo?.vasType || ''} · ${selectedWo?.sourceItem?.code || ''}`}
        size="lg"
      >
        {selectedWo && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-xl font-bold text-navy-900">{selectedWo.sourceQty?.toLocaleString()}</p>
                <p className="text-xs text-navy-500">Source (kg)</p>
              </div>
              <div className="rounded-xl bg-moon-50 p-3">
                <p className="text-xl font-bold text-navy-900">{selectedWo.targetQty?.toLocaleString()}</p>
                <p className="text-xs text-navy-500">Target (bags)</p>
              </div>
              <div className="rounded-xl bg-ice/10 p-3">
                <p className="text-xl font-bold text-ice">{selectedWo.actualBagsProduced?.toLocaleString()}</p>
                <p className="text-xs text-navy-500">Produced</p>
              </div>
            </div>

            {selectedWo.actualBagsProduced >= selectedWo.targetQty && (
              <Button variant="accent" className="w-full" onClick={handleCompleteWorkOrder}>Complete Work Order</Button>
            )}

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Add Session</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Qty (kg)" type="number" value={sessionDraft.sessionQtyKg} onChange={(e) => setSessionDraft((prev) => ({ ...prev, sessionQtyKg: e.target.value }))} />
                <Input label="Bag Count" type="number" value={sessionDraft.sessionBagCount} onChange={(e) => setSessionDraft((prev) => ({ ...prev, sessionBagCount: e.target.value }))} />
                <Input label="Work Hours" type="number" value={sessionDraft.workHours} onChange={(e) => setSessionDraft((prev) => ({ ...prev, workHours: e.target.value }))} />
                <Input label="Shift" value={sessionDraft.shiftCode} onChange={(e) => setSessionDraft((prev) => ({ ...prev, shiftCode: e.target.value }))} />
              </div>
              <Button variant="accent" className="w-full" onClick={handleAddSession} disabled={addSession.isPending}>
                {addSession.isPending ? 'Adding...' : 'Add Session'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
