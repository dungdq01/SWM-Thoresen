import { createContext, useContext, useReducer, useMemo, useCallback } from 'react'

const LayoutEditorContext = createContext(null)

const initialState = {
  // Canvas
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  gridSize: 1, // meters
  showGrid: true,
  snapEnabled: true,

  // Tool
  activeTool: 'select', // 'select' | 'draw-zone' | 'draw-rack' | 'draw-location' | 'pan'
  isDrawing: false,
  drawStart: null,

  // Selection
  selectedId: null,
  selectedType: null, // 'zone' | 'rack' | 'location'

  // Data
  warehouse: null,
  zones: [],
  racks: [],
  locations: [],

  // Undo/Redo
  undoStack: [],
  redoStack: [],

  // Dirty tracking
  isDirty: false,
  pixelsPerMeter: 10,
}

function pushUndo(state) {
  return {
    undoStack: [
      ...state.undoStack.slice(-29), // keep max 30
      { zones: state.zones, racks: state.racks, locations: state.locations },
    ],
    redoStack: [],
  }
}

function layoutEditorReducer(state, action) {
  switch (action.type) {
    case 'INIT_FROM_API': {
      const { warehouse, zones, racks, locations } = action.payload
      return {
        ...state,
        warehouse,
        zones,
        racks,
        locations,
        isDirty: false,
        undoStack: [],
        redoStack: [],
        selectedId: null,
        selectedType: null,
      }
    }
    case 'SET_PIXELS_PER_METER':
      return { ...state, pixelsPerMeter: action.payload }
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload, selectedId: null, selectedType: null }
    case 'SET_SCALE':
      return { ...state, scale: action.payload }
    case 'SET_OFFSET':
      return { ...state, offsetX: action.payload.x, offsetY: action.payload.y }
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid }
    case 'TOGGLE_SNAP':
      return { ...state, snapEnabled: !state.snapEnabled }
    case 'SET_GRID_SIZE':
      return { ...state, gridSize: action.payload }

    case 'SELECT_ELEMENT':
      return { ...state, selectedId: action.payload.id, selectedType: action.payload.type }
    case 'DESELECT':
      return { ...state, selectedId: null, selectedType: null }

    case 'MOVE_ZONE': {
      const { id, xM, yM } = action.payload
      return {
        ...state,
        ...pushUndo(state),
        zones: state.zones.map((z) => (z.id === id ? { ...z, xM, yM } : z)),
        isDirty: true,
      }
    }
    case 'RESIZE_ZONE': {
      const { id, xM, yM, widthM, depthM } = action.payload
      return {
        ...state,
        ...pushUndo(state),
        zones: state.zones.map((z) => (z.id === id ? { ...z, xM, yM, widthM, depthM } : z)),
        isDirty: true,
      }
    }
    case 'ADD_ZONE': {
      return {
        ...state,
        ...pushUndo(state),
        zones: [...state.zones, action.payload],
        isDirty: true,
      }
    }
    case 'DELETE_ZONE': {
      return {
        ...state,
        ...pushUndo(state),
        zones: state.zones.filter((z) => z.id !== action.payload),
        selectedId: state.selectedId === action.payload ? null : state.selectedId,
        selectedType: state.selectedId === action.payload ? null : state.selectedType,
        isDirty: true,
      }
    }
    case 'UPDATE_ZONE_PROPS': {
      const { id, ...props } = action.payload
      return {
        ...state,
        ...pushUndo(state),
        zones: state.zones.map((z) => (z.id === id ? { ...z, ...props } : z)),
        isDirty: true,
      }
    }

    case 'MOVE_RACK': {
      const { id, xM, yM } = action.payload
      return {
        ...state,
        ...pushUndo(state),
        racks: state.racks.map((r) => (r.id === id ? { ...r, xM, yM } : r)),
        isDirty: true,
      }
    }
    case 'RESIZE_RACK': {
      const { id, xM, yM, widthM, depthM } = action.payload
      return {
        ...state,
        ...pushUndo(state),
        racks: state.racks.map((r) => (r.id === id ? { ...r, xM, yM, widthM, depthM } : r)),
        isDirty: true,
      }
    }
    case 'ADD_RACK': {
      return {
        ...state,
        ...pushUndo(state),
        racks: [...state.racks, action.payload],
        isDirty: true,
      }
    }
    case 'DELETE_RACK': {
      return {
        ...state,
        ...pushUndo(state),
        racks: state.racks.filter((r) => r.id !== action.payload),
        selectedId: state.selectedId === action.payload ? null : state.selectedId,
        selectedType: state.selectedId === action.payload ? null : state.selectedType,
        isDirty: true,
      }
    }
    case 'UPDATE_RACK_PROPS': {
      const { id, ...props } = action.payload
      return {
        ...state,
        ...pushUndo(state),
        racks: state.racks.map((r) => (r.id === id ? { ...r, ...props } : r)),
        isDirty: true,
      }
    }

    case 'MOVE_LOCATION': {
      const { id, xM, yM } = action.payload
      return {
        ...state,
        ...pushUndo(state),
        locations: state.locations.map((l) => (l.id === id ? { ...l, xM, yM } : l)),
        isDirty: true,
      }
    }
    case 'ADD_LOCATION': {
      return {
        ...state,
        ...pushUndo(state),
        locations: [...state.locations, action.payload],
        isDirty: true,
      }
    }
    case 'DELETE_LOCATION': {
      return {
        ...state,
        ...pushUndo(state),
        locations: state.locations.filter((l) => l.id !== action.payload),
        selectedId: state.selectedId === action.payload ? null : state.selectedId,
        selectedType: state.selectedId === action.payload ? null : state.selectedType,
        isDirty: true,
      }
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state
      const prev = state.undoStack[state.undoStack.length - 1]
      return {
        ...state,
        zones: prev.zones,
        racks: prev.racks,
        locations: prev.locations,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          ...state.redoStack,
          { zones: state.zones, racks: state.racks, locations: state.locations },
        ],
        isDirty: true,
      }
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state
      const next = state.redoStack[state.redoStack.length - 1]
      return {
        ...state,
        zones: next.zones,
        racks: next.racks,
        locations: next.locations,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [
          ...state.undoStack,
          { zones: state.zones, racks: state.racks, locations: state.locations },
        ],
        isDirty: true,
      }
    }
    case 'MARK_SAVED':
      return { ...state, isDirty: false }

    case 'SET_DRAWING':
      return { ...state, isDrawing: action.payload.isDrawing, drawStart: action.payload.drawStart || null }

    default:
      return state
  }
}

export function LayoutEditorProvider({ children }) {
  const [state, dispatch] = useReducer(layoutEditorReducer, initialState)

  const actions = useMemo(
    () => ({
      initFromApi: (data) => dispatch({ type: 'INIT_FROM_API', payload: data }),
      setPixelsPerMeter: (v) => dispatch({ type: 'SET_PIXELS_PER_METER', payload: v }),
      setActiveTool: (t) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: t }),
      setScale: (s) => dispatch({ type: 'SET_SCALE', payload: s }),
      setOffset: (x, y) => dispatch({ type: 'SET_OFFSET', payload: { x, y } }),
      toggleGrid: () => dispatch({ type: 'TOGGLE_GRID' }),
      toggleSnap: () => dispatch({ type: 'TOGGLE_SNAP' }),
      setGridSize: (s) => dispatch({ type: 'SET_GRID_SIZE', payload: s }),
      selectElement: (id, type) => dispatch({ type: 'SELECT_ELEMENT', payload: { id, type } }),
      deselect: () => dispatch({ type: 'DESELECT' }),
      // Zone
      moveZone: (id, xM, yM) => dispatch({ type: 'MOVE_ZONE', payload: { id, xM, yM } }),
      resizeZone: (id, xM, yM, widthM, depthM) => dispatch({ type: 'RESIZE_ZONE', payload: { id, xM, yM, widthM, depthM } }),
      addZone: (zone) => dispatch({ type: 'ADD_ZONE', payload: zone }),
      deleteZone: (id) => dispatch({ type: 'DELETE_ZONE', payload: id }),
      updateZoneProps: (id, props) => dispatch({ type: 'UPDATE_ZONE_PROPS', payload: { id, ...props } }),
      // Rack
      moveRack: (id, xM, yM) => dispatch({ type: 'MOVE_RACK', payload: { id, xM, yM } }),
      resizeRack: (id, xM, yM, widthM, depthM) => dispatch({ type: 'RESIZE_RACK', payload: { id, xM, yM, widthM, depthM } }),
      addRack: (rack) => dispatch({ type: 'ADD_RACK', payload: rack }),
      deleteRack: (id) => dispatch({ type: 'DELETE_RACK', payload: id }),
      updateRackProps: (id, props) => dispatch({ type: 'UPDATE_RACK_PROPS', payload: { id, ...props } }),
      // Location
      moveLocation: (id, xM, yM) => dispatch({ type: 'MOVE_LOCATION', payload: { id, xM, yM } }),
      addLocation: (loc) => dispatch({ type: 'ADD_LOCATION', payload: loc }),
      deleteLocation: (id) => dispatch({ type: 'DELETE_LOCATION', payload: id }),
      // Undo/Redo
      undo: () => dispatch({ type: 'UNDO' }),
      redo: () => dispatch({ type: 'REDO' }),
      markSaved: () => dispatch({ type: 'MARK_SAVED' }),
      setDrawing: (isDrawing, drawStart) => dispatch({ type: 'SET_DRAWING', payload: { isDrawing, drawStart } }),
    }),
    [],
  )

  const selectedElement = useMemo(() => {
    if (!state.selectedId) return null
    if (state.selectedType === 'zone') return state.zones.find((z) => z.id === state.selectedId) || null
    if (state.selectedType === 'rack') return state.racks.find((r) => r.id === state.selectedId) || null
    if (state.selectedType === 'location') return state.locations.find((l) => l.id === state.selectedId) || null
    return null
  }, [state.selectedId, state.selectedType, state.zones, state.racks, state.locations])

  const value = useMemo(() => ({ state, actions, selectedElement }), [state, actions, selectedElement])

  return <LayoutEditorContext.Provider value={value}>{children}</LayoutEditorContext.Provider>
}

export function useLayoutEditor() {
  const ctx = useContext(LayoutEditorContext)
  if (!ctx) throw new Error('useLayoutEditor must be used within LayoutEditorProvider')
  return ctx
}
