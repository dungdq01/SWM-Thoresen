/**
 * Outbound Loading Page — Xếp hàng lên xe
 *
 * Luồng: Cân tare (Trạm cân) → Xếp hàng (trang này) → Cân gross (Trạm cân)
 */

import { useState, useCallback } from 'react'
import {
  useShipmentsForLoading,
  useLoadingStatus,
  useStartLoading,
  useLoadItem,
  useUnloadItem,
  useCompleteLoading,
  useLocationsWithStock,
} from '@domains/outbound-operations/hooks/useOutboundOperations'

const STATUS_BADGE = {
  CONFIRMED: { label: 'Chờ xếp', cls: 'bg-blue-100 text-blue-800' },
  LOADING: { label: 'Đang xếp', cls: 'bg-yellow-100 text-yellow-800' },
  LOADED: { label: 'Đã xếp xong', cls: 'bg-teal-100 text-teal-800' },
  SHIPPED: { label: 'Đã xuất', cls: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-green-100 text-green-800' },
}

/**
 * Dropdown chọn vị trí lấy hàng cho 1 line
 */
function LocationPicker({ shipmentId, line, onLoad, isLoading }) {
  const [locationId, setLocationId] = useState('')
  const { data: locations = [] } = useLocationsWithStock(shipmentId, line.itemId)

  const handleLoad = () => {
    if (!locationId) return
    onLoad(line.id, locationId)
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
          <option value="">-- Chọn vị trí lấy hàng --</option>
          {locations.map((loc) => (
            <option key={loc.locationId} value={loc.locationId}>
              {loc.locationCode} (tồn: {loc.availableQty.toLocaleString()} {loc.uomCode})
            </option>
          ))}
        </select>
        <button
          onClick={handleLoad}
          disabled={!locationId || isLoading}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          Xếp lên xe
        </button>
      </div>
      {locations.length === 0 && (
        <div className="text-xs text-amber-600">Không tìm thấy vị trí có tồn kho cho mặt hàng này</div>
      )}
    </div>
  )
}

export function OutboundLoadingPage() {
  const [selectedId, setSelectedId] = useState(null)

  const { data: shipmentsData, isLoading: listLoading } = useShipmentsForLoading()
  const { data: detail } = useLoadingStatus(selectedId)
  const startMut = useStartLoading()
  const loadMut = useLoadItem()
  const unloadMut = useUnloadItem()
  const completeMut = useCompleteLoading()

  const shipments = shipmentsData?.items || []
  const pendingLines = detail?.lines?.filter((l) => !l.isLoaded) || []
  const loadedLines = detail?.lines?.filter((l) => l.isLoaded) || []

  const handleStart = useCallback(() => {
    if (!selectedId) return
    startMut.mutate(selectedId)
  }, [selectedId, startMut])

  const handleLoad = useCallback((lineId, locationId) => {
    loadMut.mutate({ shipmentId: selectedId, shipmentLineId: lineId, locationId })
  }, [selectedId, loadMut])

  const handleUnload = useCallback((lineId) => {
    unloadMut.mutate({ shipmentId: selectedId, shipmentLineId: lineId })
  }, [selectedId, unloadMut])

  const handleComplete = useCallback(() => {
    if (!selectedId) return
    completeMut.mutate(selectedId)
  }, [selectedId, completeMut])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Xếp hàng</h1>
        <p className="text-sm text-gray-500 mt-1">Chọn mặt hàng để xếp lên xe</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Shipment list */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-medium text-gray-900 dark:text-white">Phiếu xuất</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[70vh] overflow-y-auto">
              {listLoading ? (
                <div className="p-4 text-center text-gray-500">Đang tải...</div>
              ) : shipments.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Không có phiếu xuất nào</div>
              ) : (
                shipments.map((s) => {
                  const badge = STATUS_BADGE[s.status] || { label: s.status, cls: 'bg-gray-100 text-gray-800' }
                  const isActive = selectedId === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                        isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{s.shipmentNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>Xe: {s.vehicleNumber}</div>
                        <div>Chủ hàng: {s.owner?.ownerCode}</div>
                        <div>{s.lines?.length || 0} mặt hàng</div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Loading workspace */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-400">
              Chọn phiếu xuất bên trái để bắt đầu
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
                  <span className="font-medium text-gray-900 dark:text-white">{detail.shipmentNumber}</span>
                  <span className="text-gray-500 text-sm ml-3">Xe: {detail.vehicleNumber}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${(STATUS_BADGE[detail.status] || {}).cls || 'bg-gray-100'}`}>
                  {(STATUS_BADGE[detail.status] || {}).label || detail.status}
                </span>
              </div>

              {/* Weighing status cards — chỉ hiện trạng thái, KHÔNG hiện số kg để tránh gian lận */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 ${detail.hasTare ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">Cân lần 1 — Tare (xe rỗng)</div>
                  {detail.hasTare ? (
                    <div className="text-sm font-semibold text-green-700">Đã cân</div>
                  ) : (
                    <div className="text-sm font-medium text-red-600">Chưa cân — đưa xe đến Trạm cân</div>
                  )}
                </div>
                <div className={`rounded-xl border p-4 ${detail.hasGross ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">Cân lần 2 — Gross (xe có hàng)</div>
                  {detail.hasGross ? (
                    <div className="text-sm font-semibold text-green-700">Đã cân</div>
                  ) : (
                    <div className="text-sm text-gray-400">Chờ xếp hàng xong</div>
                  )}
                </div>
              </div>

              {/* Start button — xe phải cân tare trước */}
              {detail.status === 'CONFIRMED' && (
                <div className={`rounded-xl p-6 text-center border ${
                  detail.hasTare
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'bg-red-50 border-red-200'
                }`}>
                  {detail.hasTare ? (
                    <>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                        Xe đã cân tare. Bắt đầu xếp hàng?
                      </p>
                      <button
                        onClick={handleStart}
                        disabled={startMut.isPending}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                      >
                        {startMut.isPending ? 'Đang xử lý...' : 'Bắt đầu xếp hàng'}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">
                      Xe chưa cân tare. Vui lòng đưa xe đến Trạm cân trước khi xếp hàng.
                    </p>
                  )}
                </div>
              )}

              {/* Pending items — chọn vị trí lấy hàng */}
              {detail.status === 'LOADING' && pendingLines.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white">Chưa xếp ({pendingLines.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {pendingLines.map((line) => (
                      <LocationPicker
                        key={line.id}
                        shipmentId={selectedId}
                        line={line}
                        onLoad={handleLoad}
                        isLoading={loadMut.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Loaded items */}
              {loadedLines.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-green-700 dark:text-green-400">Đã xếp ({loadedLines.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loadedLines.map((line, i) => (
                      <div key={line.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center font-medium">
                            {line.loadSequence || i + 1}
                          </span>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white">{line.itemName}</div>
                            <div className="text-xs text-gray-500">
                              {line.itemCode}
                              {line.locationCode && (
                                <span className="ml-2 text-blue-600">@ {line.locationCode}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {detail.status === 'LOADING' && (
                          <button
                            onClick={() => handleUnload(line.id)}
                            disabled={unloadMut.isPending}
                            className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            Bỏ xếp
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete button */}
              {detail.status === 'LOADING' && pendingLines.length === 0 && loadedLines.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    Tất cả mặt hàng đã xếp lên xe
                  </p>
                  <button
                    onClick={handleComplete}
                    disabled={completeMut.isPending}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                  >
                    {completeMut.isPending ? 'Đang xử lý...' : 'Hoàn thành xếp hàng'}
                  </button>
                </div>
              )}

              {/* Loaded — remind to go weigh */}
              {detail.status === 'LOADED' && !detail.hasGross && (
                <div className="bg-yellow-50 rounded-xl p-6 text-center border border-yellow-200">
                  <p className="text-yellow-800 font-medium mb-1">Đã xếp hàng xong</p>
                  <p className="text-sm text-yellow-600">Vui lòng đưa xe đến Trạm cân để cân lần 2 (gross)</p>
                </div>
              )}

              {detail.status === 'LOADED' && detail.hasGross && (
                <div className="bg-green-50 rounded-xl p-6 text-center border border-green-200">
                  <p className="text-green-700 font-medium">Hoàn tất — đã cân lần 2, sẵn sàng xuất hàng</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
