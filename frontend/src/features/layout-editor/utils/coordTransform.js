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
