import {
  DEFAULT_GEOMETRY,
  DEFAULT_DOCKS,
  DEFAULT_ROOF,
  DEFAULT_SPECS,
  WAREHOUSE_TYPE_GEOMETRY,
} from './constants'

/**
 * Derive geometry (length, width, height) from warehouse data.
 * Warehouse DB has totalAreaM2, usableAreaM2, maxHeightM but NOT length/width.
 * We estimate using a typical industrial L:W ratio of ~1.5:1.
 */
export function deriveGeometry(warehouse) {
  const totalArea = Number(warehouse?.totalAreaM2) || DEFAULT_GEOMETRY.length * DEFAULT_GEOMETRY.width
  const height = Number(warehouse?.maxHeightM) || DEFAULT_GEOMETRY.height

  // Typical warehouse aspect ratio 1.5:1 (length:width)
  const aspectRatio = 1.5
  const width = Math.sqrt(totalArea / aspectRatio)
  const length = totalArea / width

  const usableArea = Number(warehouse?.usableAreaM2) || totalArea * 0.9

  // Estimate columns based on area
  const colSpacing = DEFAULT_GEOMETRY.columnSpacingM
  const colsAlong = Math.max(Math.floor(length / colSpacing) - 1, 0)
  const colsAcross = Math.max(Math.floor(width / colSpacing) - 1, 0)
  const columnsCount = colsAlong * colsAcross

  return {
    length: Math.round(length * 10) / 10,
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
    totalArea: Math.round(totalArea),
    usableArea: Math.round(usableArea),
    columnsCount,
    columnSpacingM: colSpacing,
  }
}

/**
 * Build dock positions along the SOUTH wall (default for covered warehouses).
 */
export function deriveDocks(warehouse, geometry) {
  const typeConfig = WAREHOUSE_TYPE_GEOMETRY[warehouse?.warehouseType] || WAREHOUSE_TYPE_GEOMETRY.COVERED
  const dockCount = typeConfig.dockCount || DEFAULT_DOCKS.count

  if (dockCount === 0) return { count: 0, positions: [] }

  const dockWidth = DEFAULT_DOCKS.widthM
  const totalDocksWidth = dockCount * dockWidth
  const gap = (geometry.length - totalDocksWidth) / (dockCount + 1)

  const positions = Array.from({ length: dockCount }, (_, i) => ({
    side: 'SOUTH',
    offsetM: gap + i * (dockWidth + gap),
    widthM: dockWidth,
    heightM: DEFAULT_DOCKS.heightM,
    index: i,
  }))

  return {
    count: dockCount,
    type: DEFAULT_DOCKS.type,
    positions,
  }
}

/**
 * Derive roof config based on warehouse type.
 */
export function deriveRoof(warehouse) {
  const typeConfig = WAREHOUSE_TYPE_GEOMETRY[warehouse?.warehouseType] || WAREHOUSE_TYPE_GEOMETRY.COVERED
  return {
    type: typeConfig.roofType || DEFAULT_ROOF.type,
    material: DEFAULT_ROOF.material,
    slopePercent: typeConfig.slopePercent || DEFAULT_ROOF.slopePercent,
    skylightPercent: DEFAULT_ROOF.skylightPercent,
  }
}

/**
 * Derive specs (sprinkler, fire system) based on warehouse type.
 */
export function deriveSpecs(warehouse) {
  const typeConfig = WAREHOUSE_TYPE_GEOMETRY[warehouse?.warehouseType] || WAREHOUSE_TYPE_GEOMETRY.COVERED
  return {
    sprinkler: typeConfig.hasSprinkler ? 'YES' : 'NO',
    fireSystem: DEFAULT_SPECS.fireSystem,
    sprinklerSpacingM: DEFAULT_SPECS.sprinklerSpacingM,
  }
}

/**
 * Calculate column positions in a grid layout.
 */
export function computeColumnPositions(geometry) {
  const { length, width, columnSpacingM } = geometry
  if (!columnSpacingM || columnSpacingM <= 0) return []

  const positions = []
  const colsAlong = Math.max(Math.floor(length / columnSpacingM) - 1, 0)
  const colsAcross = Math.max(Math.floor(width / columnSpacingM) - 1, 0)

  const startX = columnSpacingM
  const startZ = columnSpacingM

  for (let i = 0; i < colsAlong; i++) {
    for (let j = 0; j < colsAcross; j++) {
      positions.push({
        x: startX + i * columnSpacingM - length / 2,
        z: startZ + j * columnSpacingM - width / 2,
      })
    }
  }

  return positions
}

/**
 * Build complete visualization data from warehouse record.
 */
export function buildVisualizationData(warehouse) {
  const geometry = deriveGeometry(warehouse)
  const docks = deriveDocks(warehouse, geometry)
  const roof = deriveRoof(warehouse)
  const specs = deriveSpecs(warehouse)
  const columnPositions = computeColumnPositions(geometry)

  return {
    warehouse,
    geometry,
    docks,
    roof,
    specs,
    columnPositions,
  }
}

/**
 * Format number for Vietnamese locale.
 */
export function formatNumber(num) {
  if (num == null) return '—'
  return new Intl.NumberFormat('vi-VN').format(num)
}
