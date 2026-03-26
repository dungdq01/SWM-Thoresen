import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWarehouseLayout, useSaveWarehouseLayout } from '@domains/master-data/hooks/useLayout'
import { LayoutEditorProvider, useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { fromApiLayout, toSavePayload } from '../utils/layoutSerializer'
import EditorToolbar from '../components/EditorToolbar'
import EditorCanvas from '../components/EditorCanvas'
import EditorSidebar from '../components/EditorSidebar'

function EditorContent() {
  const { id: warehouseId } = useParams()
  const navigate = useNavigate()
  const { data: layoutData, isLoading, error } = useWarehouseLayout(warehouseId)
  const saveLayout = useSaveWarehouseLayout()
  const { state, actions } = useLayoutEditor()

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
      <div className="flex items-center justify-center h-screen text-slate-400">
        Đang tải layout kho...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500 gap-2">
        <div>Lỗi tải dữ liệu: {error.message}</div>
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">
          Quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 text-sm"
        >
          ← Quay lại
        </button>
        <div className="w-px h-5 bg-slate-300" />
        <h1 className="text-sm font-semibold text-slate-800">
          Layout Editor: {state.warehouse?.code} - {state.warehouse?.name}
        </h1>
        <span className="text-xs text-slate-400">
          ({state.warehouse?.lengthM?.toFixed(0)} x {state.warehouse?.widthM?.toFixed(0)} m)
        </span>
      </div>

      {/* Toolbar */}
      <EditorToolbar onSave={handleSave} isSaving={saveLayout.isPending} />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <EditorCanvas />
        <EditorSidebar />
      </div>
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
