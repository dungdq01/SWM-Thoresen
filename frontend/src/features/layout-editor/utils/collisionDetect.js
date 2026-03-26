/**
 * Collision detection utilities for layout editor.
 * Prevents zones from overlapping each other.
 */

/**
 * Check if two axis-aligned rectangles overlap.
 * Each rect: { xM, yM, widthM, depthM }
 */
export function rectsOverlap(a, b) {
  return !(
    a.xM + a.widthM <= b.xM ||
    b.xM + b.widthM <= a.xM ||
    a.yM + a.depthM <= b.yM ||
    b.yM + b.depthM <= a.yM
  )
}

/**
 * Check if a zone collides with any other zone in the list.
 * @param {object} zone - the zone to check { id, xM, yM, widthM, depthM }
 * @param {array} allZones - list of all zones
 * @returns {{ collides: boolean, collidingWith: string|null }}
 */
export function checkZoneCollision(zone, allZones) {
  for (const other of allZones) {
    if (other.id === zone.id) continue
    if (rectsOverlap(zone, other)) {
      return { collides: true, collidingWith: other.zoneCode || other.id }
    }
  }
  return { collides: false, collidingWith: null }
}

/**
 * Check if a rect is within warehouse bounds.
 * @param {object} rect - { xM, yM, widthM, depthM }
 * @param {number} warehouseLengthM
 * @param {number} warehouseWidthM
 * @returns {boolean}
 */
export function isWithinWarehouseBounds(rect, warehouseLengthM, warehouseWidthM) {
  return (
    rect.xM >= 0 &&
    rect.yM >= 0 &&
    rect.xM + rect.widthM <= warehouseLengthM &&
    rect.yM + rect.depthM <= warehouseWidthM
  )
}

/**
 * Clamp a rect position to keep it within warehouse bounds.
 */
export function clampToWarehouse(xM, yM, widthM, depthM, warehouseLengthM, warehouseWidthM) {
  return {
    xM: Math.max(0, Math.min(xM, warehouseLengthM - widthM)),
    yM: Math.max(0, Math.min(yM, warehouseWidthM - depthM)),
  }
}
