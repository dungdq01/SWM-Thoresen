import { useLayoutEditor } from '../hooks/useLayoutEditorStore'

const tools = [
  { id: 'select', icon: '↖', label: 'Chọn (V)' },
  { id: 'pan', icon: '✋', label: 'Di chuyển (H)' },
  { id: 'draw-zone', icon: '▭', label: 'Vẽ Zone (Z)' },
  { id: 'draw-rack', icon: '▦', label: 'Vẽ Rack (R)' },
  { id: 'draw-location', icon: '▪', label: 'Vẽ Location (L)' },
]

export default function EditorToolbar({ onSave, isSaving }) {
  const { state, actions } = useLayoutEditor()

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
      {/* Tools */}
      <div className="flex items-center gap-1 mr-3">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => actions.setActiveTool(tool.id)}
            className={`px-2.5 py-1.5 text-sm rounded transition-colors ${
              state.activeTool === tool.id
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1" />

      {/* Grid & Snap */}
      <button
        onClick={actions.toggleGrid}
        className={`px-2 py-1.5 text-xs rounded ${
          state.showGrid ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
        title="Hiện lưới"
      >
        Grid
      </button>
      <button
        onClick={actions.toggleSnap}
        className={`px-2 py-1.5 text-xs rounded ${
          state.snapEnabled ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
        title="Snap vào lưới"
      >
        Snap
      </button>
      <select
        value={state.gridSize}
        onChange={(e) => actions.setGridSize(Number(e.target.value))}
        className="ml-1 text-xs border dark:border-slate-600 rounded px-1 py-1 bg-white dark:bg-slate-700 dark:text-slate-200"
      >
        <option value={0.5}>0.5m</option>
        <option value={1}>1m</option>
        <option value={2}>2m</option>
        <option value={5}>5m</option>
      </select>

      <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={actions.undo}
        disabled={state.undoStack.length === 0}
        className="px-2 py-1.5 text-sm rounded disabled:opacity-30 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        title="Hoàn tác (Ctrl+Z)"
      >
        ↩
      </button>
      <button
        onClick={actions.redo}
        disabled={state.redoStack.length === 0}
        className="px-2 py-1.5 text-sm rounded disabled:opacity-30 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        title="Làm lại (Ctrl+Y)"
      >
        ↪
      </button>

      {/* Delete */}
      {state.selectedId && (
        <>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1" />
          <button
            onClick={() => {
              if (state.selectedType === 'zone') actions.deleteZone(state.selectedId)
              else if (state.selectedType === 'rack') actions.deleteRack(state.selectedId)
              else if (state.selectedType === 'location') actions.deleteLocation(state.selectedId)
            }}
            className="px-2 py-1.5 text-sm rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            title="Xóa (Delete)"
          >
            Xóa
          </button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status & Save */}
      {state.isDirty && (
        <span className="text-xs text-amber-600 mr-2">Chưa lưu</span>
      )}
      <button
        onClick={onSave}
        disabled={!state.isDirty || isSaving}
        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
      >
        {isSaving ? 'Đang lưu...' : 'Lưu Layout'}
      </button>
    </div>
  )
}
