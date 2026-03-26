import { useLayoutEditor } from '../hooks/useLayoutEditorStore'
import { ZONE_TYPE_COLORS } from '../utils/layoutSerializer'

const ZONE_TYPES = ['RECEIVING', 'STORAGE', 'STAGING', 'SHIPPING', 'QC', 'DAMAGED', 'RETURNS']
const RACK_TYPES = ['SELECTIVE', 'DRIVE_IN', 'PUSH_BACK', 'PALLET_FLOW', 'CANTILEVER', 'MEZZANINE', 'FLOOR_STACK']

export default function EditorSidebar() {
  const { state, selectedElement, actions } = useLayoutEditor()

  if (!selectedElement) {
    return (
      <div className="w-64 bg-white border-l border-slate-200 p-4 text-sm text-slate-500 shrink-0 overflow-y-auto">
        <div className="font-medium text-slate-700 mb-3">Thuộc tính</div>
        <p>Chọn một đối tượng để xem/sửa thuộc tính</p>
        <div className="mt-6">
          <div className="font-medium text-slate-700 mb-2">Thống kê</div>
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
  }

  return (
    <div className="w-64 bg-white border-l border-slate-200 p-4 text-sm shrink-0 overflow-y-auto">
      <div className="font-medium text-slate-700 mb-3">
        {state.selectedType === 'zone' && `Zone: ${selectedElement.zoneCode}`}
        {state.selectedType === 'rack' && `Rack: ${selectedElement.rackCode}`}
        {state.selectedType === 'location' && `Location: ${selectedElement.locationCode}`}
      </div>

      <div className="space-y-3">
        {/* Position */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Vị trí (m)</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className="text-xs text-slate-400">X</span>
              <input
                type="number"
                step="0.5"
                value={selectedElement.xM?.toFixed(1) || 0}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (isNaN(v)) return
                  if (state.selectedType === 'zone') actions.moveZone(selectedElement.id, v, selectedElement.yM)
                  else if (state.selectedType === 'rack') actions.moveRack(selectedElement.id, v, selectedElement.yM)
                  else if (state.selectedType === 'location') actions.moveLocation(selectedElement.id, v, selectedElement.yM)
                }}
                className="w-full border rounded px-2 py-1 text-xs"
              />
            </div>
            <div className="flex-1">
              <span className="text-xs text-slate-400">Y</span>
              <input
                type="number"
                step="0.5"
                value={selectedElement.yM?.toFixed(1) || 0}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (isNaN(v)) return
                  if (state.selectedType === 'zone') actions.moveZone(selectedElement.id, selectedElement.xM, v)
                  else if (state.selectedType === 'rack') actions.moveRack(selectedElement.id, selectedElement.xM, v)
                  else if (state.selectedType === 'location') actions.moveLocation(selectedElement.id, selectedElement.xM, v)
                }}
                className="w-full border rounded px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Size (zone & rack only) */}
        {(state.selectedType === 'zone' || state.selectedType === 'rack') && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Kích thước (m)</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <span className="text-xs text-slate-400">W</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={selectedElement.widthM?.toFixed(1) || 0}
                  onChange={(e) => {
                    const v = Math.max(1, parseFloat(e.target.value) || 1)
                    if (state.selectedType === 'zone')
                      actions.resizeZone(selectedElement.id, selectedElement.xM, selectedElement.yM, v, selectedElement.depthM)
                    else
                      actions.resizeRack(selectedElement.id, selectedElement.xM, selectedElement.yM, v, selectedElement.depthM)
                  }}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="flex-1">
                <span className="text-xs text-slate-400">D</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={selectedElement.depthM?.toFixed(1) || 0}
                  onChange={(e) => {
                    const v = Math.max(1, parseFloat(e.target.value) || 1)
                    if (state.selectedType === 'zone')
                      actions.resizeZone(selectedElement.id, selectedElement.xM, selectedElement.yM, selectedElement.widthM, v)
                    else
                      actions.resizeRack(selectedElement.id, selectedElement.xM, selectedElement.yM, selectedElement.widthM, v)
                  }}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Zone-specific */}
        {state.selectedType === 'zone' && (
          <>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Loại zone</label>
              <select
                value={selectedElement.zoneType || 'STORAGE'}
                onChange={(e) => {
                  const zt = e.target.value
                  updateProp('zoneType', zt)
                  updateProp('displayColor', ZONE_TYPE_COLORS[zt] || '#3b82f6')
                }}
                className="w-full border rounded px-2 py-1 text-xs"
              >
                {ZONE_TYPES.map((zt) => (
                  <option key={zt} value={zt}>{zt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Màu</label>
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
              <label className="block text-xs text-slate-500 mb-1">Loại rack</label>
              <select
                value={selectedElement.rackType || 'SELECTIVE'}
                onChange={(e) => updateProp('rackType', e.target.value)}
                className="w-full border rounded px-2 py-1 text-xs"
              >
                {RACK_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Tầng</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={selectedElement.levels || 1}
                  onChange={(e) => updateProp('levels', parseInt(e.target.value) || 1)}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Bay/tầng</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={selectedElement.baysPerLevel || 1}
                  onChange={(e) => updateProp('baysPerLevel', parseInt(e.target.value) || 1)}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          </>
        )}

        {/* Location info (read-only) */}
        {state.selectedType === 'location' && (
          <div className="space-y-1 text-xs text-slate-500">
            <div>Loại: {selectedElement.locationType}</div>
            <div>Profile: {selectedElement.locationProfile}</div>
          </div>
        )}
      </div>
    </div>
  )
}
