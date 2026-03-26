import { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { WH_DATA, getTotalStock, getTotalArea, getAverageUsage } from '../data/warehouseData';

const Warehouse3DContext = createContext(null);

const initialState = {
  cameraMode: 'overview',
  isDay: true,
  heatmapActive: false,
  effectsOn: true,
  settings: { labels: true, vehicles: true, grid: true, fog: true, shadows: true, roof: true },
  hoveredWhIndex: null,
  selectedWhIndex: null,
  mode4D: false,
  searchQuery: '',
  filters: { owner: 'all', type: 'all', usage: 'all' },
  isModalOpen: false,
  sceneReady: false,
  // API-driven warehouse data (null = fallback to WH_DATA mock)
  warehouseData: null,
  dataSource: 'mock', // 'mock' | 'api'
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
    case 'TOGGLE_4D':
      return { ...state, mode4D: !state.mode4D };
    case 'SET_SCENE_READY':
      return { ...state, sceneReady: true };
    case 'SET_WAREHOUSE_DATA':
      return { ...state, warehouseData: action.payload, dataSource: 'api' };
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
    toggle4D: () => dispatch({ type: 'TOGGLE_4D' }),
    setSceneReady: () => dispatch({ type: 'SET_SCENE_READY' }),
    setWarehouseData: (data) => dispatch({ type: 'SET_WAREHOUSE_DATA', payload: data }),
  }), []);

  // Use API data if available, otherwise fallback to mock WH_DATA
  const activeData = state.warehouseData || WH_DATA;

  const computed = useMemo(() => {
    const data = activeData;
    return {
      totalStock: data.reduce((sum, wh) => sum + (wh.stock || 0), 0),
      totalArea: data.reduce((sum, wh) => sum + (wh.area || 0), 0),
      averageUsage: data.length > 0 ? Math.round(data.reduce((sum, wh) => sum + (wh.fill || 0), 0) / data.length) : 0,
      activeWarehouses: data.length,
      filteredWarehouses: data.filter(wh => {
        if (state.filters.owner !== 'all' && wh.owner !== state.filters.owner) return false;
        if (state.filters.type !== 'all' && !wh.type?.includes(state.filters.type)) return false;
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
      hoveredWarehouse: state.hoveredWhIndex !== null ? data[state.hoveredWhIndex] : null,
      selectedWarehouse: state.selectedWhIndex !== null ? data[state.selectedWhIndex] : null,
      dataSource: state.dataSource,
    };
  }, [activeData, state.filters, state.searchQuery, state.hoveredWhIndex, state.selectedWhIndex, state.dataSource]);

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
