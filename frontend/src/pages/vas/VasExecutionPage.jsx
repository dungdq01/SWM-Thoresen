import { useState } from 'react'
import { useVasWorkOrders, useVasSessions, useStartVasSession, useEndVasSession, useRecordBag, useCompleteVasWorkOrder } from '@domains/vas'
import { Badge, Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'COMPLETED' || status === 'CLOSED') return 'success'
  if (status === 'IN_PROGRESS' || status === 'ACTIVE') return 'warning'
  return 'default'
}

export function VasExecutionPage() {
  const [selectedWoId, setSelectedWoId] = useState('')
  const [bagWeight, setBagWeight] = useState('50')
  const [bagCount, setBagCount] = useState('1')

  const { data: woResponse, refetch: refetchWo } = useVasWorkOrders({ status: 'IN_PROGRESS' })
  const { data: sessionsResponse, refetch: refetchSessions } = useVasSessions({ workOrderId: selectedWoId })

  const startSession = useStartVasSession()
  const endSession = useEndVasSession()
  const recordBag = useRecordBag()
  const completeWorkOrder = useCompleteVasWorkOrder()

  const workOrders = woResponse?.data || []
  const sessions = sessionsResponse?.data || []
  const selectedWo = workOrders.find((w) => w.id === selectedWoId)
  const activeSession = sessions.find((s) => s.status === 'ACTIVE')

  const handleStartSession = async () => {
    await startSession.mutateAsync({ workOrderId: selectedWoId })
    refetchSessions()
  }

  const handleEndSession = async () => {
    if (activeSession) {
      await endSession.mutateAsync(activeSession.id)
      refetchSessions()
    }
  }

  const handleRecordBag = async () => {
    if (activeSession) {
      const count = Math.max(1, Math.floor(Number(bagCount) || 1))
      for (let i = 0; i < count; i++) {
        await recordBag.mutateAsync({ sessionId: activeSession.id, data: { weightKg: Number(bagWeight) } })
      }
      refetchSessions()
      refetchWo()
    }
  }

  const handleCompleteWorkOrder = async () => {
    if (selectedWoId && selectedWo) {
      await completeWorkOrder.mutateAsync({ id: selectedWoId, data: { actualBagsProduced: selectedWo.actualBagsProduced } })
      refetchWo()
      setSelectedWoId('')
    }
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">VAS Execution</h2>
        <Button variant="outline" size="sm" onClick={() => { refetchWo(); refetchSessions() }}>Refresh</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="wrs-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-navy-900">Work Orders In Progress</h3>
          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Work Order</TableHead>
                <TableHead align="right">Progress</TableHead>
                <TableHead align="center">Select</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => (
                <TableRow key={wo.id} className={selectedWoId === wo.id ? 'bg-ice/10' : ''}>
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
                    <Button variant={selectedWoId === wo.id ? 'gold' : 'outline'} size="sm" onClick={() => setSelectedWoId(wo.id)}>
                      {selectedWoId === wo.id ? 'Selected' : 'Select'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-5">
          {selectedWo ? (
            <>
              <div className="wrs-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-navy-900">{selectedWo.woNumber}</h3>
                    <p className="text-xs text-navy-400">{selectedWo.vasType} · {selectedWo.sourceItem?.code}</p>
                  </div>
                  <Badge variant={statusTone(selectedWo.status)}>{selectedWo.status}</Badge>
                </div>
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
              </div>

              <div className="wrs-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-navy-900">Session Control</h3>
                {activeSession ? (
                  <>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-navy-900">{activeSession.sessionNumber}</p>
                          <p className="text-xs text-navy-500">Active · {activeSession.bagsRecorded} bags recorded</p>
                        </div>
                        <Badge variant="success">ACTIVE</Badge>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Input label="Bag Weight (kg)" type="number" value={bagWeight} onChange={(e) => setBagWeight(e.target.value)} className="flex-1" />
                      <Input label="Số lượng (bao)" type="number" min="1" value={bagCount} onChange={(e) => setBagCount(e.target.value)} className="w-28" />
                      <Button variant="accent" onClick={handleRecordBag} disabled={recordBag.isPending} className="self-end">
                        {recordBag.isPending ? 'Đang ghi...' : `Record ${Number(bagCount) > 1 ? bagCount + ' Bags' : 'Bag'}`}
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleEndSession}>End Session</Button>
                  </>
                ) : (
                  <Button variant="accent" className="w-full" onClick={handleStartSession}>Start New Session</Button>
                )}
              </div>

              <div className="wrs-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-navy-900">Session History</h3>
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between border-b border-moon-200 pb-2">
                    <div>
                      <p className="font-medium text-navy-800">{session.sessionNumber}</p>
                      <p className="text-xs text-navy-500">{session.bagsRecorded} bags · {session.totalWeightKg?.toLocaleString()} kg</p>
                    </div>
                    <Badge variant={statusTone(session.status)}>{session.status}</Badge>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="wrs-card p-8 text-center">
              <p className="text-navy-500">Select a Work Order to start execution.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
