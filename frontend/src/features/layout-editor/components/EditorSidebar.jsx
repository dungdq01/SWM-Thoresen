import { Undo2, RotateCw, Plus, Trash2 } from 'lucide-react'
import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { ZONE_TYPE_COLORS } from '../utils/layoutSerializer'

const ZONE_TYPES = ['RECEIVING', 'STORAGE', 'STAGING', 'SHIPPING', 'QC', 'DAMAGED', 'RETURNS']
const RACK_TYPES = ['SELECTIVE', 'DRIVE_IN', 'PUSH_BACK', 'PALLET_FLOW', 'CANTILEVER', 'MEZZANINE', 'FLOOR_STACK']

const inputCls = 'w-full border dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
const labelCls = 'block text-xs text-slate-500 dark:text-slate-400 mb-1'
const smallLabelCls = 'text-xs text-slate-400 dark:text-slate-500'

export default function EditorSidebar() {
  const { state, selectedElement, actions } = useLayoutEditor()

  if (!selectedElement) {
    return (
      <div className="w-56 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400 shrink-0 overflow-y-auto">
        <div className="font-medium text-slate-700 dark:text-slate-200 mb-3">Thuộc tính</div>
        <p>Chọn một đối tượng để xem/sửa thuộc tính</p>
        <div className="mt-6">
          <div className="font-medium text-slate-700 dark:text-slate-200 mb-2">Thống kê</div>
          <div className="space-y-1 text-xs">
            <div>Zone: {state.zones.length}</div>
            <div>Rack: {state.racks.length}</div>
            <div>Location: {state.locations.length}</div>
          </div>
        </div>
      </div>
    )
  }

  const updateProp = (key, value) => {
    if (state.selectedType === 'zone') actions.updateZoneProps(selectedElement.id, { [key]: value })
    else if (state.selectedType === 'rack') actions.updateRackProps(selectedElement.id, { [key]: value })
    else if (state.selectedType === 'location') actions.updateLocationProps(selectedElement.id, { [key]: value })
  }

  const handleRotate = () => {
    const w = selectedElement.widthM
    const d = selectedElement.depthM
    if (state.selectedType === 'zone') {
      actions.resizeZone(selectedElement.id, selectedElement.xM, selectedElement.yM, d, w)
    } else if (state.selectedType === 'rack') {
      actions.resizeRack(selectedElement.id, selectedElement.xM, selectedElement.yM, d, w)
    } else if (state.selectedType === 'location') {
      actions.updateLocationProps(selectedElement.id, { widthM: d, depthM: w })
    }
  }

  return (
    <div className="w-56 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 p-4 text-sm shrink-0 overflow-y-auto">
      <div className="font-medium text-slate-700 dark:text-slate-200 mb-3">
        {state.selectedType === 'zone' && `Zone: ${selectedElement.zoneCode}`}
        {state.selectedType === 'rack' && `Rack: ${selectedElement.rackCode}`}
        {state.selectedType === 'location' && `Location: ${selectedElement.locationCode}`}
      </div>

      <div className="space-y-3">
        {/* Position */}
        <div>
          <label className={labelCls}>Vị trí (m)</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className={smallLabelCls}>X</span>
              <input
                type="number"
                step="1"
                value={Math.round(selectedElement.xM) || 0}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value))
                  if (isNaN(v)) return
                  if (state.selectedType === 'zone') actions.moveZone(selectedElement.id, v, selectedElement.yM)
                  else if (state.selectedType === 'rack') actions.moveRack(selectedElement.id, v, selectedElement.yM)
                  else if (state.selectedType === 'location') actions.moveLocation(selectedElement.id, v, selectedElement.yM)
                }}
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <span className={smallLabelCls}>Y</span>
              <input
                type="number"
                step="1"
                value={Math.round(selectedElement.yM) || 0}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value))
                  if (isNaN(v)) return
                  if (state.selectedType === 'zone') actions.moveZone(selectedElement.id, selectedElement.xM, v)
                  else if (state.selectedType === 'rack') actions.moveRack(selectedElement.id, selectedElement.xM, v)
                  else if (state.selectedType === 'location') actions.moveLocation(selectedElement.id, selectedElement.xM, v)
                }}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Size + Rotate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Kích thước (m)</label>
            <button
              onClick={handleRotate}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded transition-colors"
              title="Xoay ngang/dọc (hoán đổi Rộng ↔ Dài)"
            >
              <RotateCw className="w-3 h-3" />
              Xoay
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className={smallLabelCls}>Rộng</span>
              <input
                type="number"
                step="1"
                min="1"
                value={Math.round(selectedElement.widthM) || 0}
                onChange={(e) => {
                  const v = Math.max(1, Math.round(Number(e.target.value)) || 1)
                  if (state.selectedType === 'zone')
                    actions.resizeZone(selectedElement.id, selectedElement.xM, selectedElement.yM, v, selectedElement.depthM)
                  else if (state.selectedType === 'rack')
                    actions.resizeRack(selectedElement.id, selectedElement.xM, selectedElement.yM, v, selectedElement.depthM)
                  else
                    actions.updateLocationProps(selectedElement.id, { widthM: v })
                }}
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <span className={smallLabelCls}>Dài</span>
              <input
                type="number"
                step="1"
                min="1"
                value={Math.round(selectedElement.depthM) || 0}
                onChange={(e) => {
                  const v = Math.max(1, Math.round(Number(e.target.value)) || 1)
                  if (state.selectedType === 'zone')
                    actions.resizeZone(selectedElement.id, selectedElement.xM, selectedElement.yM, selectedElement.widthM, v)
                  else if (state.selectedType === 'rack')
                    actions.resizeRack(selectedElement.id, selectedElement.xM, selectedElement.yM, selectedElement.widthM, v)
                  else
                    actions.updateLocationProps(selectedElement.id, { depthM: v })
                }}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Zone-specific */}
        {state.selectedType === 'zone' && (
          <>
            <div>
              <label className={labelCls}>Loại zone</label>
              <select
                value={selectedElement.zoneType || 'STORAGE'}
                onChange={(e) => {
                  const zt = e.target.value
                  updateProp('zoneType', zt)
                  updateProp('displayColor', ZONE_TYPE_COLORS[zt] || '#3b82f6')
                }}
                className={inputCls}
              >
                {ZONE_TYPES.map((zt) => (
                  <option key={zt} value={zt}>{zt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Màu</label>
              <input
                type="color"
                value={selectedElement.displayColor || '#3b82f6'}
                onChange={(e) => updateProp('displayColor', e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Rack-specific */}
        {state.selectedType === 'rack' && (
          <>
            <div>
              <label className={labelCls}>Loại rack</label>
              <select
                value={selectedElement.rackType || 'SELECTIVE'}
                onChange={(e) => updateProp('rackType', e.target.value)}
                className={inputCls}
              >
                {RACK_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>Tầng</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={selectedElement.levels || 1}
                  onChange={(e) => updateProp('levels', parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Bay/tầng</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={selectedElement.baysPerLevel || 1}
                  onChange={(e) => updateProp('baysPerLevel', parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
              </div>
            </div>
          </>
        )}

        {/* Location-specific */}
        {state.selectedType === 'location' && (
          <>
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <div>Loại: {selectedElement.locationType}</div>
              <div>Profile: {selectedElement.locationProfile}</div>
            </div>

            {/* Door config */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls}>Cửa (3D)</label>
                <button
                  onClick={() => {
                    const current = selectedElement.doorConfig || { doors: [{ wall: 'front' }] }
                    if (current.doors.length >= 4) return
                    updateProp('doorConfig', { doors: [...current.doors, { wall: 'front' }] })
                  }}
                  disabled={(selectedElement.doorConfig?.doors?.length || 1) >= 4}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded transition-colors disabled:opacity-40"
                >
                  <Plus className="w-2.5 h-2.5" /> Thêm
                </button>
              </div>
              {(selectedElement.doorConfig?.doors || [{ wall: 'front' }]).map((door, i, arr) => (
                <div key={i} className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 w-8">#{i + 1}</span>
                  <select
                    value={door.wall}
                    onChange={(e) => {
                      const doors = [...arr]
                      doors[i] = { wall: e.target.value }
                      updateProp('doorConfig', { doors })
                    }}
                    className={inputCls + ' flex-1'}
                  >
                    <option value="front">Trước</option>
                    <option value="back">Sau</option>
                    <option value="left">Trái</option>
                    <option value="right">Phải</option>
                  </select>
                  <button
                    onClick={() => {
                      const doors = arr.filter((_, j) => j !== i)
                      updateProp('doorConfig', { doors })
                    }}
                    className="p-0.5 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(selectedElement.doorConfig?.doors?.length || 1) === 0 && (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">Không có cửa</div>
              )}
            </div>
          </>
        )}

        {/* Unplace button */}
        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              actions.unplaceElement(selectedElement.id, state.selectedType)
            }}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-md transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Gỡ khỏi sơ đồ
          </button>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Đưa lại panel trái để xếp lại
          </div>
        </div>
      </div>
    </div>
  )
}
