import { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { WH_DATA, getTotalStock, getTotalArea, getAverageUsage } from '../data/warehouseData';

const Warehouse3DContext = createContext(null);

const initialState = {
  cameraMode: 'overview',
  isDay: true,
  heatmapActive: false,
  effectsOn: true,
  settings: { labels: true, vehicles: true, grid: true, fog: true, shadows: true },
  hoveredWhIndex: null,
  selectedWhIndex: null,
  searchQuery: '',
  filters: { owner: 'all', type: 'all', usage: 'all' },
  isModalOpen: false,
  sceneReady: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CAMERA_MODE':
      return { ...state, cameraMode: action.payload };
    case 'TOGGLE_HEATMAP':
      return { ...state, heatmapActive: !state.heatmapActive };
    case 'TOGGLE_DAY_NIGHT':
      return { ...state, isDay: !state.isDay };
    case 'TOGGLE_EFFECTS':
      return { ...state, effectsOn: !state.effectsOn };
    case 'TOGGLE_SETTING':
      return { ...state, settings: { ...state.settings, [action.payload]: !state.settings[action.payload] } };
    case 'SET_HOVERED_WH':
      return { ...state, hoveredWhIndex: action.payload };
    case 'SET_SELECTED_WH':
      return { ...state, selectedWhIndex: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.payload.key]: action.payload.value } };
    case 'OPEN_MODAL':
      return { ...state, isModalOpen: true, selectedWhIndex: action.payload ?? state.selectedWhIndex };
    case 'CLOSE_MODAL':
      return { ...state, isModalOpen: false };
    case 'SET_SCENE_READY':
      return { ...state, sceneReady: true };
    default:
      return state;
  }
}

export function Warehouse3DStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(() => ({
    setCameraMode: (mode) => dispatch({ type: 'SET_CAMERA_MODE', payload: mode }),
    toggleHeatmap: () => dispatch({ type: 'TOGGLE_HEATMAP' }),
    toggleDayNight: () => dispatch({ type: 'TOGGLE_DAY_NIGHT' }),
    toggleEffects: () => dispatch({ type: 'TOGGLE_EFFECTS' }),
    toggleSetting: (key) => dispatch({ type: 'TOGGLE_SETTING', payload: key }),
    setHoveredWh: (idx) => dispatch({ type: 'SET_HOVERED_WH', payload: idx }),
    setSelectedWh: (idx) => dispatch({ type: 'SET_SELECTED_WH', payload: idx }),
    setSearch: (q) => dispatch({ type: 'SET_SEARCH', payload: q }),
    setFilter: (key, value) => dispatch({ type: 'SET_FILTER', payload: { key, value } }),
    openModal: (idx) => dispatch({ type: 'OPEN_MODAL', payload: idx }),
    closeModal: () => dispatch({ type: 'CLOSE_MODAL' }),
    setSceneReady: () => dispatch({ type: 'SET_SCENE_READY' }),
  }), []);

  const computed = useMemo(() => ({
    totalStock: getTotalStock(),
    totalArea: getTotalArea(),
    averageUsage: getAverageUsage(),
    activeWarehouses: WH_DATA.length,
    filteredWarehouses: WH_DATA.filter(wh => {
      if (state.filters.owner !== 'all' && wh.owner !== state.filters.owner) return false;
      if (state.filters.type !== 'all' && !wh.type.includes(state.filters.type)) return false;
      if (state.filters.usage !== 'all') {
        if (state.filters.usage === 'high' && wh.fill < 80) return false;
        if (state.filters.usage === 'mid' && (wh.fill < 40 || wh.fill >= 80)) return false;
        if (state.filters.usage === 'low' && wh.fill >= 40) return false;
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        return wh.code.toLowerCase().includes(q) || wh.name.toLowerCase().includes(q);
      }
      return true;
    }),
    hoveredWarehouse: state.hoveredWhIndex !== null ? WH_DATA[state.hoveredWhIndex] : null,
    selectedWarehouse: state.selectedWhIndex !== null ? WH_DATA[state.selectedWhIndex] : null,
  }), [state.filters, state.searchQuery, state.hoveredWhIndex, state.selectedWhIndex]);

  const value = useMemo(() => ({ state, actions, computed }), [state, actions, computed]);

  return (
    <Warehouse3DContext.Provider value={value}>
      {children}
    </Warehouse3DContext.Provider>
  );
}

export function useWarehouse3D() {
  const ctx = useContext(Warehouse3DContext);
  if (!ctx) throw new Error('useWarehouse3D must be used within Warehouse3DStoreProvider');
  return ctx;
}
