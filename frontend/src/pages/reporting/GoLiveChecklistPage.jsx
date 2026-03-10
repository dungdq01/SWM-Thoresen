import { useState } from 'react'
import { useGoLiveGates, useUpdateGoLiveGate } from '@domains/reporting'
import { Badge, Button } from '@shared/ui'

const CATEGORY_COLORS = {
  DATA: 'bg-blue-50 border-blue-200',
  SECURITY: 'bg-purple-50 border-purple-200',
  FUNCTIONAL: 'bg-emerald-50 border-emerald-200',
  INTEGRITY: 'bg-indigo-50 border-indigo-200',
  BILLING: 'bg-amber-50 border-amber-200',
  INTEGRATION: 'bg-orange-50 border-orange-200',
  GOVERNANCE: 'bg-rose-50 border-rose-200',
}

const statusTone = (status) => {
  if (status === 'PASS') return 'success'
  if (status === 'FAIL') return 'danger'
  if (status === 'WAIVED') return 'warning'
  return 'default'
}

function GateCard({ gate, onUpdate }) {
  const [showWaiveInput, setShowWaiveInput] = useState(false)
  const [waiveReason, setWaiveReason] = useState(gate.waivedReason || '')
  const { mutate: update, isPending } = useUpdateGoLiveGate()

  const handleMark = (status) => {
    if (status === 'WAIVED') {
      setShowWaiveInput(true)
      return
    }
    update({ id: gate.id, data: { status } })
  }

  const handleSubmitWaive = () => {
    if (!waiveReason.trim()) return
    update({ id: gate.id, data: { status: 'WAIVED', waivedReason: waiveReason } })
    setShowWaiveInput(false)
    onUpdate?.()
  }

  const borderClass = CATEGORY_COLORS[gate.category] || 'bg-moon-50 border-moon-200'

  return (
    <div className={`border rounded-lg p-4 ${borderClass}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2">
          <span className="text-xs font-mono font-bold text-navy-500 mt-0.5 shrink-0">{gate.id}</span>
          <div>
            <p className="font-semibold text-navy-900 text-sm">{gate.name}</p>
            <p className="text-xs text-navy-500 mt-0.5">{gate.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusTone(gate.status)}>{gate.status}</Badge>
        </div>
      </div>

      {gate.status === 'WAIVED' && gate.waivedReason && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
          <span className="font-semibold">Waived reason:</span> {gate.waivedReason}
        </div>
      )}

      {gate.checkedAt && (
        <p className="text-xs text-navy-400 mb-2">
          Checked by <span className="font-medium">{gate.checkedBy}</span> at {new Date(gate.checkedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      )}

      {showWaiveInput && (
        <div className="mb-2 space-y-2">
          <textarea
            className="wrs-input w-full text-sm resize-none"
            rows={2}
            placeholder="Nhập lý do WAIVE (bắt buộc)..."
            value={waiveReason}
            onChange={(e) => setWaiveReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="warning" onClick={handleSubmitWaive} disabled={!waiveReason.trim() || isPending}>
              Xác nhận WAIVE
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowWaiveInput(false)}>
              Hủy
            </Button>
          </div>
        </div>
      )}

      {!showWaiveInput && gate.status === 'FAIL' && (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="success"
            onClick={() => handleMark('PASS')}
            disabled={isPending}
          >
            Mark PASS
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMark('WAIVED')}
            disabled={isPending}
          >
            Waive
          </Button>
        </div>
      )}

      {!showWaiveInput && gate.status === 'PASS' && (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMark('FAIL')}
            disabled={isPending}
          >
            Revert to FAIL
          </Button>
        </div>
      )}
    </div>
  )
}

export function GoLiveChecklistPage() {
  const { data: response, refetch, isLoading } = useGoLiveGates()
  const gates = response?.data || []

  const passCount = gates.filter((g) => g.status === 'PASS').length
  const waivedCount = gates.filter((g) => g.status === 'WAIVED').length
  const failCount = gates.filter((g) => g.status === 'FAIL').length
  const readyForGoLive = failCount === 0 && gates.length > 0

  const byCategory = gates.reduce((acc, g) => {
    if (!acc[g.category]) acc[g.category] = []
    acc[g.category].push(g)
    return acc
  }, {})

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Go-Live Checklist — 12 Gates</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* Status Banner */}
      {readyForGoLive ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-emerald-800">READY FOR GO-LIVE</p>
            <p className="text-sm text-emerald-700">Tất cả {gates.length} gates đã PASS hoặc WAIVED. Hệ thống sẵn sàng đưa vào production.</p>
          </div>
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-300 rounded-lg p-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">🚫</span>
          <div>
            <p className="font-bold text-rose-800">NOT READY — {failCount} gate(s) còn FAIL</p>
            <p className="text-sm text-rose-700">Hoàn thành tất cả gates hoặc WAIVE với lý do trước khi go-live.</p>
          </div>
        </div>
      )}

      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="wrs-card p-3 text-center">
          <p className="text-xl font-bold text-navy-900">{gates.length}</p>
          <p className="text-xs text-navy-500">Total Gates</p>
        </div>
        <div className="wrs-card p-3 text-center">
          <p className="text-xl font-bold text-emerald-600">{passCount}</p>
          <p className="text-xs text-navy-500">PASS</p>
        </div>
        <div className="wrs-card p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{waivedCount}</p>
          <p className="text-xs text-navy-500">WAIVED</p>
        </div>
        <div className="wrs-card p-3 text-center">
          <p className="text-xl font-bold text-rose-600">{failCount}</p>
          <p className="text-xs text-navy-500">FAIL</p>
        </div>
      </div>

      {/* Gates by Category */}
      {isLoading ? (
        <div className="wrs-card p-8 text-center text-navy-400 text-sm">Đang tải gates...</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byCategory).map(([category, categoryGates]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                {category}
                <span className="text-navy-300">({categoryGates.filter((g) => g.status === 'PASS' || g.status === 'WAIVED').length}/{categoryGates.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryGates.map((gate) => (
                  <GateCard key={gate.id} gate={gate} onUpdate={refetch} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
