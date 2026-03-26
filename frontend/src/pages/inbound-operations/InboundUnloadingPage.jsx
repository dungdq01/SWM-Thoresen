/**
 * Inbound Unloading Page — Dỡ hàng xuống kho
 *
 * Luồng: Cân gross (Trạm cân) → Dỡ hàng (trang này) → Cân tare (Trạm cân)
 */

import { useState, useCallback } from 'react'
import {
  useReceiptsForUnloading,
  useUnloadingStatus,
  useAvailableLocations,
  useStartUnloading,
  useUnloadItem,
  useUndoUnloadItem,
  useCompleteUnloading,
} from '@domains/inbound-operations/hooks/useInboundOperations'

const STATUS_BADGE = {
  CONFIRMED: { label: 'Xác nhận', cls: 'bg-gray-100 text-gray-800' },
  AWAITING_WEIGHING: { label: 'Chờ cân', cls: 'bg-orange-100 text-orange-800' },
  WEIGHING_1: { label: 'Chờ dỡ', cls: 'bg-blue-100 text-blue-800' },
  UNLOADING: { label: 'Đang dỡ', cls: 'bg-yellow-100 text-yellow-800' },
  UNLOADED: { label: 'Đã dỡ xong', cls: 'bg-teal-100 text-teal-800' },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-green-100 text-green-800' },
}

/**
 * Dropdown chọn vị trí dỡ hàng cho 1 line
 */
function LocationPicker({ receiptId, line, onUnload, isLoading }) {
  const [locationId, setLocationId] = useState('')
  const [confirmItem, setConfirmItem] = useState(null) // { lineId, locationId, locationCode }
  const { data: locations = [] } = useAvailableLocations(receiptId)

  const handleUnload = () => {
    if (!locationId) return
    const loc = locations.find((l) => l.locationId === locationId)
    setConfirmItem({ lineId: line.id, locationId, locationCode: loc?.locationCode || locationId })
  }

  const handleConfirm = () => {
    onUnload(confirmItem.lineId, confirmItem.locationId)
    setConfirmItem(null)
    setLocationId('')
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div>
        <div className="font-medium text-sm text-gray-900 dark:text-white">{line.itemName}</div>
        <div className="text-xs text-gray-500">{line.itemCode}</div>
      </div>

      {confirmItem ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
          <p className="text-sm text-blue-800">
            Xác nhận dỡ <span className="font-semibold">{line.itemName}</span> ({line.itemCode}) xuống vị trí <span className="font-semibold">{confirmItem.locationCode}</span>?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? 'Đang xử lý...' : 'Xác nhận dỡ hàng'}
            </button>
            <button
              onClick={() => setConfirmItem(null)}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">-- Chọn vị trí dỡ hàng --</option>
            {locations.map((loc) => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.locationCode} ({loc.locationType}){loc.capacityKg ? ` — ${loc.capacityKg.toLocaleString()} kg` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={handleUnload}
            disabled={!locationId || isLoading}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            Dỡ xuống kho
          </button>
        </div>
      )}
      {locations.length === 0 && (
        <div className="text-xs text-amber-600">Không tìm thấy vị trí lưu trữ trong kho này. Kiểm tra Master Data &gt; Vị trí.</div>
      )}
    </div>
  )
}

export function InboundUnloadingPage() {
  const [selectedId, setSelectedId] = useState(null)
  const [unloadingCompleted, setUnloadingCompleted] = useState(false)

  const { data: receiptsData, isLoading: listLoading } = useReceiptsForUnloading()
  const { data: detail } = useUnloadingStatus(selectedId)
  const startMut = useStartUnloading()
  const unloadMut = useUnloadItem()
  const undoMut = useUndoUnloadItem()
  const completeMut = useCompleteUnloading()

  const receipts = receiptsData?.items || []
  // 4 groups: OPEN (on truck), UNLOADED (off truck, waiting weigh), WEIGHED (net known), RECEIVED (done)
  const openLines = detail?.lines?.filter((l) => l.lineStatus === 'OPEN') || []
  const unloadedLines = detail?.lines?.filter((l) => l.lineStatus === 'UNLOADED') || []
  const weighedLines = detail?.lines?.filter((l) => l.lineStatus === 'WEIGHED') || []
  const receivedLines = detail?.lines?.filter((l) => l.lineStatus === 'RECEIVED') || []
  const weighingHistory = detail?.weighingHistory || []

  const handleStart = useCallback(() => {
    if (!selectedId) return
    startMut.mutate(selectedId)
  }, [selectedId, startMut])

  const handleUnload = useCallback((lineId, locationId) => {
    unloadMut.mutate({ receiptId: selectedId, receiptLineId: lineId, locationId })
  }, [selectedId, unloadMut])

  const handleUndo = useCallback((lineId) => {
    undoMut.mutate({ receiptId: selectedId, receiptLineId: lineId })
  }, [selectedId, undoMut])

  const handleComplete = useCallback(() => {
    if (!selectedId) return
    completeMut.mutate(selectedId, {
      onSuccess: () => setUnloadingCompleted(true),
    })
  }, [selectedId, completeMut])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dỡ hàng</h1>
        <p className="text-sm text-gray-500 mt-1">Chọn mặt hàng để dỡ xuống kho</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Receipt list */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-medium text-gray-900 dark:text-white">Phiếu nhập</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[70vh] overflow-y-auto">
              {listLoading ? (
                <div className="p-4 text-center text-gray-500">Đang tải...</div>
              ) : receipts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Không có phiếu nhập nào</div>
              ) : (
                receipts.map((r) => {
                  const badge = STATUS_BADGE[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-800' }
                  const isActive = selectedId === r.id
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setSelectedId(r.id); setUnloadingCompleted(false) }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                        isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{r.asnId || r.receiptNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>Xe: {r.vehicleNumber}</div>
                        <div>Chủ hàng: {r.owner?.ownerCode}</div>
                        <div>{r.lines?.length || 0} mặt hàng</div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Unloading workspace */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-400">
              Chọn phiếu nhập bên trái để bắt đầu
            </div>
          ) : !detail ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info bar */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{detail.asnId || detail.receiptNumber}</span>
                  <span className="text-gray-500 text-sm ml-3">Xe: {detail.vehicleNumber}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${(STATUS_BADGE[detail.status] || {}).cls || 'bg-gray-100'}`}>
                  {(STATUS_BADGE[detail.status] || {}).label || detail.status}
                </span>
              </div>

              {/* Weighing history */}
              {weighingHistory.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white">Lịch sử cân ({weighingHistory.length} lần)</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                    {weighingHistory.map((w) => (
                      <div key={w.sequence} className="px-4 py-2 flex justify-between items-center">
                        <div>
                          <span className="font-medium">Lần {w.sequence}:</span>
                          <span className="ml-2">{w.weightKg.toLocaleString()} kg</span>
                          {w.sequence === 1 && <span className="ml-2 text-xs text-blue-600">(Gross)</span>}
                          {w.isFinal && <span className="ml-2 text-xs text-green-600">(Tare)</span>}
                        </div>
                        {w.netWeightKg != null && (
                          <span className="text-green-700 font-medium">Net: {w.netWeightKg.toLocaleString()} kg</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Start button — phải cân gross trước */}
              {(detail.status === 'CONFIRMED' || detail.status === 'WEIGHING_1' || detail.status === 'AWAITING_WEIGHING') && (
                <div className={`rounded-xl p-6 text-center border ${
                  detail.hasGross ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
                }`}>
                  {detail.hasGross ? (
                    <>
                      <p className="text-sm text-blue-700 mb-4">Xe đã cân gross. Bắt đầu dỡ hàng?</p>
                      <button onClick={handleStart} disabled={startMut.isPending}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                        {startMut.isPending ? 'Đang xử lý...' : 'Bắt đầu dỡ hàng'}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">Xe chưa cân. Vui lòng đưa xe đến Trạm cân trước khi dỡ hàng.</p>
                  )}
                </div>
              )}

              {/* OPEN items — trên xe, chọn vị trí dỡ (chỉ cho dỡ khi không có item UNLOADED chờ cân) */}
              {detail.status === 'UNLOADING' && openLines.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white">Trên xe ({openLines.length})</h3>
                  </div>
                  {unloadedLines.length > 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-500 text-center">
                      Đã dỡ 1 mặt hàng. Vui lòng đưa xe đi cân trước khi dỡ tiếp.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {openLines.map((line) => (
                        <LocationPicker key={line.id} receiptId={selectedId} line={line} onUnload={handleUnload} isLoading={unloadMut.isPending} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* UNLOADED items — đã dỡ, chờ cân */}
              {unloadedLines.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-700">
                  <div className="px-4 py-3 border-b border-yellow-200 dark:border-yellow-700">
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-400">✓ Đã dỡ — chờ cân ({unloadedLines.length})</h3>
                  </div>
                  <div className="divide-y divide-yellow-100 dark:divide-yellow-700">
                    {unloadedLines.map((line, i) => (
                      <div key={line.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center font-medium">✓</span>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white">{line.itemName}</div>
                            <div className="text-xs text-gray-500">
                              {line.itemCode}
                              {line.locationCode && <span className="ml-2 text-blue-600">→ Vị trí: {line.locationCode}</span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleUndo(line.id)} disabled={undoMut.isPending}
                          className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">Hoàn tác</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* "Đưa xe đi cân" reminder — when UNLOADED items exist */}
              {detail.status === 'UNLOADING' && unloadedLines.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-300 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <h4 className="font-semibold text-orange-800">Đưa xe đến Trạm cân</h4>
                  </div>
                  <p className="text-sm text-orange-700">
                    {openLines.length > 0
                      ? <>Đã dỡ <strong>{unloadedLines.map(l => l.itemName || l.itemCode).join(', ')}</strong> xuống kho. Đưa xe đến Trạm cân để tính khối lượng, sau đó quay lại dỡ {openLines.length} mặt hàng còn lại.</>
                      : <>Tất cả mặt hàng đã dỡ (<strong>{unloadedLines.map(l => l.itemName || l.itemCode).join(', ')}</strong>). Đưa xe đến Trạm cân để cân lần cuối (tare).</>
                    }
                  </p>
                  <a href="/app/weighbridge" className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
                    Đến Trạm cân →
                  </a>
                </div>
              )}

              {/* WEIGHED + RECEIVED items — đã cân xong */}
              {(weighedLines.length > 0 || receivedLines.length > 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-200 dark:border-green-700">
                  <div className="px-4 py-3 border-b border-green-200 dark:border-green-700">
                    <h3 className="font-medium text-green-700 dark:text-green-400">Đã hoàn thành ({weighedLines.length + receivedLines.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {[...weighedLines, ...receivedLines].map((line, i) => (
                      <div key={line.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center font-medium">{i + 1}</span>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white">{line.itemName}</div>
                            <div className="text-xs text-gray-500">
                              {line.itemCode} {line.locationCode && <span className="ml-2 text-blue-600">→ {line.locationCode}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-green-700">{line.netWeightKg > 0 ? `${line.netWeightKg.toLocaleString()} kg` : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COMPLETED status */}
              {detail.status === 'COMPLETED' && (
                <div className="bg-green-50 rounded-xl p-6 text-center border border-green-200">
                  <p className="text-green-800 font-medium mb-1">Đã hoàn thành</p>
                  <p className="text-sm text-green-600">Tất cả mặt hàng đã cân xong. Tồn kho đã được cập nhật.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
