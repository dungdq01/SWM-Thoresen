import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layers, Box } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useWarehouseDetail } from '@domains/master-data'
import { useZoneList } from '@domains/master-data/hooks/useZones'
import { useLocationList } from '@domains/master-data/hooks/useLocations'
import { useRackList } from '@domains/master-data/hooks/useRacks'
import { warehouseApi, zoneApi, locationApi, rackApi } from '@domains/master-data/api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '@domains/master-data/model/constants'
import { LayoutEditorProvider, useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { fromApiLayout, toSavePayload } from '../utils/layoutSerializer'
import EditorToolbar from '../components/EditorToolbar'
import EditorCanvas from '../components/EditorCanvas'
import EditorSidebar from '../components/EditorSidebar'
import ElementPalette from '../components/ElementPalette'

const LayoutPreview3D = lazy(() => import('../components/preview-3d/LayoutPreview3D'))

function EditorContent() {
  const { id: warehouseId } = useParams()
  const navigate = useNavigate()
  const { data: warehouseRes, isLoading: whLoading, error } = useWarehouseDetail(warehouseId)
  const { data: zoneRes, isLoading: zLoading } = useZoneList({ warehouseId, pageSize: 200 })
  const { data: rackRes, isLoading: rLoading } = useRackList({ warehouseId, pageSize: 200 })
  const { data: locRes, isLoading: lLoading } = useLocationList({ warehouseId, pageSize: 500 })

  const queryClient = useQueryClient()

  const { state, actions } = useLayoutEditor()
  const [viewMode, setViewMode] = useState('2d')
  const [isSaving, setIsSaving] = useState(false)
  const hasInitRef = useRef(false)

  const isLoading = whLoading || zLoading || rLoading || lLoading
  const warehouse = warehouseRes?.id ? warehouseRes : (warehouseRes?.data || null)
  const zones = zoneRes?.data || []
  const racks = rackRes?.data || []
  const locations = locRes?.data || []

  // Load data from master data into editor state — only on first load
  useEffect(() => {
    if (warehouse && !isLoading && !hasInitRef.current) {
      hasInitRef.current = true
      const editorData = fromApiLayout({ warehouse, zones, racks, locations })
      actions.initFromApi(editorData)
    }
  }, [warehouse?.id, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = toSavePayload(state)
      let failCount = 0

      // 1. Update warehouse dimensions
      if (payload.lengthM != null || payload.widthM != null) {
        await warehouseApi.update(warehouseId, {
          lengthM: payload.lengthM,
          widthM: payload.widthM,
          rowVersion: payload.rowVersion,
        })
      }

      // 2. Update zones (parallel)
      if (payload.zones.length > 0) {
        const zoneResults = await Promise.allSettled(
          payload.zones.map((z) =>
            zoneApi.update(z.id, {
              xCoord: z.xCoord,
              yCoord: z.yCoord,
              zoneWidthM: z.zoneWidthM,
              zoneDepthM: z.zoneDepthM,
              rotationDeg: z.rotationDeg,
              displayColor: z.displayColor,
              sortOrder: z.sortOrder,
              rowVersion: z.rowVersion ?? 0,
            })
          )
        )
        const zoneFails = zoneResults.filter((r) => r.status === 'rejected')
        failCount += zoneFails.length
        if (zoneFails.length) console.warn('[LayoutEditor] Zone save failures:', zoneFails.length, zoneFails[0].reason)
      }

      // 3. Upsert racks (parallel)
      if (payload.racks.length > 0) {
        const rackResults = await Promise.allSettled(
          payload.racks.map((r) =>
            r.id
              ? rackApi.update(r.id, {
                  rackCode: r.rackCode, rackName: r.rackName, rackType: r.rackType, zoneId: r.zoneId,
                  xCoord: r.xCoord, yCoord: r.yCoord,
                  rackWidthM: r.rackWidthM, rackDepthM: r.rackDepthM, rackHeightM: r.rackHeightM,
                  rotationDeg: r.rotationDeg, levels: r.levels, baysPerLevel: r.baysPerLevel,
                  displayColor: r.displayColor, rowVersion: r.rowVersion ?? 0,
                })
              : rackApi.create({
                  warehouseId, rackCode: r.rackCode, rackName: r.rackName, rackType: r.rackType, zoneId: r.zoneId,
                  xCoord: r.xCoord, yCoord: r.yCoord,
                  rackWidthM: r.rackWidthM, rackDepthM: r.rackDepthM, rackHeightM: r.rackHeightM,
                  rotationDeg: r.rotationDeg, levels: r.levels, baysPerLevel: r.baysPerLevel,
                  displayColor: r.displayColor,
                })
          )
        )
        const rackFails = rackResults.filter((r) => r.status === 'rejected')
        failCount += rackFails.length
        if (rackFails.length) console.warn('[LayoutEditor] Rack save failures:', rackFails.length, rackFails[0].reason)
      }

      // 4. Update locations (parallel)
      if (payload.locations.length > 0) {
        const locResults = await Promise.allSettled(
          payload.locations.map((l) =>
            locationApi.update(l.id, {
              xCoord: l.xCoord, yCoord: l.yCoord,
              locationWidthM: l.locationWidthM, locationDepthM: l.locationDepthM,
              rotationDeg: l.rotationDeg, displayColor: l.displayColor,
              rowVersion: l.rowVersion ?? 0,
            })
          )
        )
        const locFails = locResults.filter((r) => r.status === 'rejected')
        failCount += locFails.length
        if (locFails.length) console.warn('[LayoutEditor] Location save failures:', locFails.length, locFails[0].reason)
      }

      // Invalidate queries so detail page sees fresh data when navigating back
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouses })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.zones })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.racks })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locations })

      // Mark saved + bump rowVersions in editor state to stay in sync with DB
      actions.markSaved()

      if (failCount > 0) {
        toast.error(`Lưu layout: ${failCount} mục bị lỗi (có thể do dữ liệu đã thay đổi). Thử reload và lưu lại.`)
      } else {
        toast.success('Đã lưu layout kho')
      }
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Lỗi máy chủ'
      console.error('[LayoutEditor] Save FAILED:', err)
      toast.error('Lưu layout thất bại: ' + msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center text-slate-400" style={{ height: 'calc(100vh - 10rem)' }}>
        Đang tải layout kho...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-red-500 gap-2" style={{ height: 'calc(100vh - 10rem)' }}>
        <div>Lỗi tải dữ liệu: {error.message}</div>
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">
          Quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ height: 'calc(100vh - 10rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 overflow-x-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm flex-shrink-0"
        >
          ← <span className="hidden sm:inline">Quay lại</span>
        </button>
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
        <h1 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          <span className="hidden sm:inline">Layout Editor: </span>{state.warehouse?.code} - {state.warehouse?.name}
        </h1>
        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 hidden md:inline">
          ({state.warehouse?.lengthM?.toFixed(0)} x {state.warehouse?.widthM?.toFixed(0)} m)
        </span>

        {/* 2D/3D Toggle */}
        <div className="ml-auto sm:ml-4 flex items-center bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5 flex-shrink-0">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === '2d'
                ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            2D
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === '3d'
                ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D
          </button>
        </div>
      </div>

      {/* Toolbar (hide drawing tools when 3D) */}
      {viewMode === '2d' && (
        <EditorToolbar onSave={handleSave} isSaving={isSaving} />
      )}
      {viewMode === '3d' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex-1" />
          {state.isDirty && <span className="text-xs text-amber-600 mr-2">Chưa lưu</span>}
          <button
            onClick={handleSave}
            disabled={!state.isDirty || isSaving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu Layout'}
          </button>
        </div>
      )}

      {/* Main area */}
      {viewMode === '2d' ? (
        <div className="flex flex-1 overflow-hidden">
          <ElementPalette />
          <EditorCanvas />
          <EditorSidebar />
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-3" />
              Đang tải 3D...
            </div>
          }
        >
          <LayoutPreview3D />
        </Suspense>
      )}
    </div>
  )
}

export default function WarehouseLayoutEditor() {
  return (
    <LayoutEditorProvider>
      <EditorContent />
    </LayoutEditorProvider>
  )
}
