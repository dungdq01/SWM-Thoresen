/**
 * Coordinate transformation utilities for 2D layout editor.
 * Warehouse coordinates: (0,0) = top-left corner, units in meters.
 * Canvas coordinates: (0,0) = top-left of Konva stage, units in pixels.
 */

export function metersToPixels(meters, pixelsPerMeter) {
  return meters * pixelsPerMeter
}

export function pixelsToMeters(pixels, pixelsPerMeter) {
  return pixels / pixelsPerMeter
}

export function snapToGrid(value, gridSize) {
  if (!gridSize || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

export function snapPointToGrid(x, y, gridSize) {
  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  }
}

/**
 * Convert warehouse-local meters to canvas pixels
 */
export function warehouseToCanvas(xM, yM, pixelsPerMeter) {
  return {
    xPx: xM * pixelsPerMeter,
    yPx: yM * pixelsPerMeter,
  }
}

/**
 * Convert canvas pixels to warehouse-local meters
 */
export function canvasToWarehouse(xPx, yPx, pixelsPerMeter) {
  return {
    xM: xPx / pixelsPerMeter,
    yM: yPx / pixelsPerMeter,
  }
}

/**
 * Calculate pixelsPerMeter to fit warehouse in container
 */
export function calculateScale(warehouseLengthM, warehouseWidthM, containerWidth, containerHeight, padding = 60) {
  const availableWidth = containerWidth - padding * 2
  const availableHeight = containerHeight - padding * 2
  const scaleX = availableWidth / warehouseLengthM
  const scaleY = availableHeight / warehouseWidthM
  return Math.min(scaleX, scaleY)
}

/**
 * Check if a rect is within warehouse bounds
 */
export function isWithinBounds(x, y, width, height, warehouseLengthM, warehouseWidthM) {
  return x >= 0 && y >= 0 && (x + width) <= warehouseLengthM && (y + height) <= warehouseWidthM
}

/**
 * Check if two rectangles overlap
 */
export function rectsOverlap(r1, r2) {
  return !(r1.x + r1.width <= r2.x || r2.x + r2.width <= r1.x || r1.y + r1.height <= r2.y || r2.y + r2.height <= r1.y)
}

/**
 * Snap element edges to nearby edges of other elements + warehouse bounds.
 *
 * @param {number} x - current left position (meters)
 * @param {number} y - current top position (meters)
 * @param {number} w - element width (meters)
 * @param {number} h - element depth (meters)
 * @param {object} state - layout editor state (warehouse, zones, racks, locations)
 * @param {string} excludeId - id of element being dragged (exclude from edge collection)
 * @param {number} threshold - snap distance in meters (default 1.5)
 * @returns {{ x: number, y: number, snappedX: boolean, snappedY: boolean }}
 */
export function snapToEdges(x, y, w, h, state, excludeId, threshold = 1.5) {
  const xEdges = [] // vertical edges
  const yEdges = [] // horizontal edges

  // Warehouse bounds
  const whL = state.warehouse?.lengthM || 100
  const whW = state.warehouse?.widthM || 100
  xEdges.push(0, whL)
  yEdges.push(0, whW)

  // Collect edges from all placed elements
  const allItems = [
    ...(state.zones || []).filter((z) => z.isPlaced).map((z) => ({ id: z.id, x: z.xM, y: z.yM, w: z.widthM, h: z.depthM })),
    ...(state.racks || []).filter((r) => r.isPlaced).map((r) => ({ id: r.id, x: r.xM, y: r.yM, w: r.widthM, h: r.depthM })),
    ...(state.locations || []).filter((l) => l.isPlaced).map((l) => ({ id: l.id, x: l.xM, y: l.yM, w: l.widthM || 3, h: l.depthM || 3 })),
  ]

  for (const item of allItems) {
    if (item.id === excludeId) continue
    xEdges.push(item.x, item.x + item.w)
    yEdges.push(item.y, item.y + item.h)
  }

  // Snap X: check left edge and right edge of dragged element
  let snapX = x
  let snappedX = false
  let bestDx = threshold

  for (const edge of xEdges) {
    // left edge → edge
    const dLeft = Math.abs(x - edge)
    if (dLeft < bestDx) { bestDx = dLeft; snapX = edge; snappedX = true }
    // right edge → edge
    const dRight = Math.abs(x + w - edge)
    if (dRight < bestDx) { bestDx = dRight; snapX = edge - w; snappedX = true }
  }

  // Snap Y: check top edge and bottom edge of dragged element
  let snapY = y
  let snappedY = false
  let bestDy = threshold

  for (const edge of yEdges) {
    const dTop = Math.abs(y - edge)
    if (dTop < bestDy) { bestDy = dTop; snapY = edge; snappedY = true }
    const dBottom = Math.abs(y + h - edge)
    if (dBottom < bestDy) { bestDy = dBottom; snapY = edge - h; snappedY = true }
  }

  return { x: snapX, y: snapY, snappedX, snappedY }
}
