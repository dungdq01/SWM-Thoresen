// ==================== 3D INDUSTRIAL COLORS ====================
export const INDUSTRIAL_COLORS = {
  // Surfaces
  floor: '#94A3B8',
  ground: '#64748B',
  wall: '#D6D3D1',
  wallInner: '#B8C4D0',
  baseBand: '#78716C',

  // Structure
  column: '#1E3A5F',
  truss: '#1E3A5F',
  trussRafter: '#334155',
  trussWeb: '#475569',

  // Roof
  roofA: '#5B7A94',
  roofB: '#52728C',
  ridge: '#3D5A6E',
  gutter: '#4A6274',
  skylight: '#7DD3FC',

  // Dock
  dock: '#F59E0B',
  dockFrame: '#92400E',
  dockPanel: '#7C8A96',
  shutterLine: '#5C6B78',
  bumper: '#1F2937',
  leveler: '#6B7280',
  warning: '#FBBF24',

  // Interior
  racking: '#374151',
  pallet: '#D4A76A',
  cargo: '#6366F1',
}

// ==================== 2D FLOOR PLAN COLORS ====================
export const FLOOR_PLAN_COLORS = {
  // Backgrounds
  floor: '#F8F6F1',
  floorStroke: '#94A3B8',
  usableArea: 'rgba(59, 130, 246, 0.08)',
  usableStroke: 'rgba(59, 130, 246, 0.3)',

  // Walls
  wallFill: '#D6D3D1',
  wallStroke: '#A8A29E',
  baseBand: '#78716C',

  // Elements
  column: '#1E3A5F',
  columnStroke: '#0F172A',

  // Dock
  dock: '#F59E0B',
  dockStroke: '#D97706',
  dockPanel: '#94A3B8',
  dockShutter: '#64748B',
  dockBumper: '#1F2937',
  dockLeveler: '#9CA3AF',
  dockWarning: '#FBBF24',
  dockLabel: '#92400E',

  // Utilities
  sprinkler: '#3B82F6',

  // Annotations
  dimension: '#94A3B8',
  dimensionText: '#64748B',
  grid: 'rgba(148, 163, 184, 0.12)',

  // UI
  compassBg: 'rgba(15, 23, 42, 0.06)',
  compassText: '#94A3B8',
}

// ==================== 3D SCENE CONFIG ====================
export const SCENE_CONFIG = {
  bgColor: '#1a1a2e',
  fogColor: '#1a1a2e',
  fogNear: 80,
  fogFar: 300,
  ambientIntensity: 0.4,
  keyLightIntensity: 0.8,
  fillLightIntensity: 0.4,
  hemisphereIntensity: 0.3,
  shadowMapSize: 2048,
}

// ==================== DEFAULT GEOMETRY ====================
export const DEFAULT_GEOMETRY = {
  length: 60,
  width: 40,
  height: 8,
  columnsCount: 12,
  columnSpacingM: 6,
}

export const DEFAULT_DOCKS = {
  count: 4,
  type: 'LEVELER',
  widthM: 3.5,
  heightM: 4,
}

export const DEFAULT_ROOF = {
  type: 'PITCHED',
  material: 'METAL_SHEET',
  slopePercent: 15,
  skylightPercent: 5,
}

export const DEFAULT_SPECS = {
  fireSystem: 'YES',
  sprinkler: 'YES',
  sprinklerSpacingM: 8,
}

// ==================== WAREHOUSE TYPE CONFIGS ====================
export const WAREHOUSE_TYPE_GEOMETRY = {
  COVERED: {
    roofType: 'PITCHED',
    slopePercent: 15,
    hasDocks: true,
    dockCount: 4,
    hasSprinkler: true,
    hasColumns: true,
  },
  OPEN: {
    roofType: 'FLAT',
    slopePercent: 0,
    hasDocks: false,
    dockCount: 0,
    hasSprinkler: false,
    hasColumns: false,
  },
  COLD: {
    roofType: 'PITCHED',
    slopePercent: 10,
    hasDocks: 2,
    dockCount: 2,
    hasSprinkler: true,
    hasColumns: true,
  },
  HAZMAT: {
    roofType: 'PITCHED',
    slopePercent: 12,
    hasDocks: true,
    dockCount: 2,
    hasSprinkler: true,
    hasColumns: true,
  },
}

// ==================== 2D PADDING & SIZING ====================
export const FLOOR_PLAN_CONFIG = {
  padding: 60,
  wallThickness: 0.3,
  columnRadius: 0.3,
  dockWidth: 3.5,
  dockDepth: 2.5,
  minFontSize: 8,
}
