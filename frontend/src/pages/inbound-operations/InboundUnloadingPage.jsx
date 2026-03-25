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
  UNLOADED: { label: 'Đã dỡ xong', cls: 'bg-green-100 text-green-800' },
}

/**
 * Dropdown chọn vị trí dỡ hàng cho 1 line
 */
function LocationPicker({ receiptId, line, onUnload, isLoading }) {
  const [locationId, setLocationId] = useState('')
  const { data: locations = [] } = useAvailableLocations(receiptId)

  const handleUnload = () => {
    if (!locationId) return
    onUnload(line.id, locationId)
    setLocationId('')
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div>
        <div className="font-medium text-sm text-gray-900 dark:text-white">{line.itemName}</div>
        <div className="text-xs text-gray-500">{line.itemCode}</div>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">-- Chọn vị trí dỡ hàng --</option>
          {locations.map((loc) => (
            <option key={loc.locationId} value={loc.locationId}>
              {loc.locationCode}
              {loc.capacityKg ? ` (sức chứa: ${loc.capacityKg.toLocaleString()} kg)` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={handleUnload}
          disabled={!locationId || isLoading}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          Dỡ xuống kho
        </button>
      </div>
      {locations.length === 0 && (
        <div className="text-xs text-amber-600">Không tìm thấy vị trí lưu trữ trong kho</div>
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
  const pendingLines = detail?.lines?.filter((l) => !l.isUnloaded) || []
  const unloadedLines = detail?.lines?.filter((l) => l.isUnloaded) || []

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
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{r.receiptNumber}</span>
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
                  <span className="font-medium text-gray-900 dark:text-white">{detail.receiptNumber}</span>
                  <span className="text-gray-500 text-sm ml-3">Xe: {detail.vehicleNumber}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${(STATUS_BADGE[detail.status] || {}).cls || 'bg-gray-100'}`}>
                  {(STATUS_BADGE[detail.status] || {}).label || detail.status}
                </span>
              </div>

              {/* Weighing status — chỉ hiện trạng thái, KHÔNG hiện số kg */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 ${detail.hasGross ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">Cân lần 1 — Gross (xe có hàng)</div>
                  {detail.hasGross ? (
                    <div className="text-sm font-semibold text-green-700">Đã cân</div>
                  ) : (
                    <div className="text-sm font-medium text-red-600">Chưa cân — đưa xe đến Trạm cân</div>
                  )}
                </div>
                <div className={`rounded-xl border p-4 ${detail.hasTare ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">Cân lần 2 — Tare (xe rỗng)</div>
                  {detail.hasTare ? (
                    <div className="text-sm font-semibold text-green-700">Đã cân</div>
                  ) : (
                    <div className="text-sm text-gray-400">Chờ dỡ hàng xong</div>
                  )}
                </div>
              </div>

              {/* Start button — phải cân gross trước */}
              {(detail.status === 'CONFIRMED' || detail.status === 'WEIGHING_1') && (
                <div className={`rounded-xl p-6 text-center border ${
                  detail.hasGross
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'bg-red-50 border-red-200'
                }`}>
                  {detail.hasGross ? (
                    <>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                        Xe đã cân gross. Bắt đầu dỡ hàng?
                      </p>
                      <button
                        onClick={handleStart}
                        disabled={startMut.isPending}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                      >
                        {startMut.isPending ? 'Đang xử lý...' : 'Bắt đầu dỡ hàng'}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">
                      Xe chưa cân. Vui lòng đưa xe đến Trạm cân trước khi dỡ hàng.
                    </p>
                  )}
                </div>
              )}

              {/* Pending items — chọn vị trí dỡ hàng */}
              {detail.status === 'UNLOADING' && pendingLines.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white">Chưa dỡ ({pendingLines.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {pendingLines.map((line) => (
                      <LocationPicker
                        key={line.id}
                        receiptId={selectedId}
                        line={line}
                        onUnload={handleUnload}
                        isLoading={unloadMut.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unloaded items */}
              {unloadedLines.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-green-700 dark:text-green-400">Đã dỡ ({unloadedLines.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {unloadedLines.map((line, i) => (
                      <div key={line.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center font-medium">
                            {line.unloadSequence || i + 1}
                          </span>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white">{line.itemName}</div>
                            <div className="text-xs text-gray-500">
                              {line.itemCode}
                              {line.locationCode && (
                                <span className="ml-2 text-blue-600">→ {line.locationCode}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {detail.status === 'UNLOADING' && !unloadingCompleted && !detail.hasTare && (
                          <button
                            onClick={() => handleUndo(line.id)}
                            disabled={undoMut.isPending}
                            className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            Hoàn tác
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete button */}
              {detail.status === 'UNLOADING' && pendingLines.length === 0 && unloadedLines.length > 0 && !unloadingCompleted && !detail.hasTare && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    Tất cả mặt hàng đã dỡ xuống kho
                  </p>
                  <button
                    onClick={handleComplete}
                    disabled={completeMut.isPending}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                  >
                    {completeMut.isPending ? 'Đang xử lý...' : 'Hoàn thành dỡ hàng'}
                  </button>
                </div>
              )}

              {/* Completed — already weighed tare */}
              {detail.hasTare && (
                <div className="bg-green-50 rounded-xl p-6 text-center border border-green-200">
                  <p className="text-green-800 font-medium mb-1">Đã hoàn thành</p>
                  <p className="text-sm text-green-600">Xe đã cân tare. Phiếu nhập đã được xử lý xong.</p>
                </div>
              )}

              {/* Completed — remind to go weigh tare */}
              {detail.status === 'UNLOADING' && unloadingCompleted && !detail.hasTare && (
                <div className="bg-yellow-50 rounded-xl p-6 text-center border border-yellow-200">
                  <p className="text-yellow-800 font-medium mb-1">Đã dỡ hàng xong</p>
                  <p className="text-sm text-yellow-600">Vui lòng đưa xe đến Trạm cân để cân lần 2 (tare — xe rỗng)</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
