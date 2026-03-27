import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layers, Box } from 'lucide-react'
import { useWarehouseLayout, useSaveWarehouseLayout } from '@domains/master-data/hooks/useLayout'
import { LayoutEditorProvider, useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { fromApiLayout, toSavePayload } from '../utils/layoutSerializer'
import EditorToolbar from '../components/EditorToolbar'
import EditorCanvas from '../components/EditorCanvas'
import EditorSidebar from '../components/EditorSidebar'

const LayoutPreview3D = lazy(() => import('../components/preview-3d/LayoutPreview3D'))

function EditorContent() {
  const { id: warehouseId } = useParams()
  const navigate = useNavigate()
  const { data: layoutData, isLoading, error } = useWarehouseLayout(warehouseId)
  const saveLayout = useSaveWarehouseLayout()
  const { state, actions } = useLayoutEditor()
  const [viewMode, setViewMode] = useState('2d')

  // Load data from API into editor state
  useEffect(() => {
    if (layoutData) {
      const editorData = fromApiLayout(layoutData)
      actions.initFromApi(editorData)
    }
  }, [layoutData]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const payload = toSavePayload(state)
    saveLayout.mutate(
      { warehouseId, data: payload },
      {
        onSuccess: () => {
          actions.markSaved()
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen h-dvh text-slate-400">
        Đang tải layout kho...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen h-dvh text-red-500 gap-2">
        <div>Lỗi tải dữ liệu: {error.message}</div>
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">
          Quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen h-dvh bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 text-sm flex-shrink-0"
        >
          ← <span className="hidden sm:inline">Quay lại</span>
        </button>
        <div className="w-px h-5 bg-slate-300 flex-shrink-0" />
        <h1 className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
          <span className="hidden sm:inline">Layout Editor: </span>{state.warehouse?.code} - {state.warehouse?.name}
        </h1>
        <span className="text-xs text-slate-400 flex-shrink-0 hidden md:inline">
          ({state.warehouse?.lengthM?.toFixed(0)} x {state.warehouse?.widthM?.toFixed(0)} m)
        </span>

        {/* 2D/3D Toggle */}
        <div className="ml-auto sm:ml-4 flex items-center bg-slate-200 rounded-lg p-0.5 flex-shrink-0">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === '2d'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            2D
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === '3d'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D
          </button>
        </div>
      </div>

      {/* Toolbar (hide drawing tools when 3D) */}
      {viewMode === '2d' && (
        <EditorToolbar onSave={handleSave} isSaving={saveLayout.isPending} />
      )}
      {viewMode === '3d' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 shrink-0">
          <div className="flex-1" />
          {state.isDirty && <span className="text-xs text-amber-600 mr-2">Chưa lưu</span>}
          <button
            onClick={handleSave}
            disabled={!state.isDirty || saveLayout.isPending}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saveLayout.isPending ? 'Đang lưu...' : 'Lưu Layout'}
          </button>
        </div>
      )}

      {/* Main area */}
      {viewMode === '2d' ? (
        <div className="flex flex-1 overflow-hidden">
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
