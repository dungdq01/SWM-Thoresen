// Truck and forklift route definitions

export const TRUCK_COLORS = [0x1e3a5f, 0x374151, 0x1c3a2e, 0x3b1c1c, 0x2d1b69];

export const TRUCK_ROUTE_DEFINITIONS = [
  [[-300, -210], [-110, -210], [-110, -50], [20, -50], [20, -210], [140, -210], [140, -50], [240, -50], [240, -210], [-300, -210]],
  [[-300, -50], [-110, -50], [-110, 95], [20, 95], [140, 95], [140, -50], [20, -50], [-110, -50], [-300, -50]],
  [[-240, 95], [-110, 95], [20, 95], [140, 95], [240, 95], [240, 230], [140, 230], [20, 230], [-110, 230], [-240, 230], [-240, 95]],
  [[300, -210], [140, -210], [20, -210], [-110, -210], [-240, -210], [-240, -50], [-110, -50], [20, -50], [140, -50], [300, -50], [300, -210]],
  [[-240, 230], [-110, 230], [20, 230], [140, 230], [240, 230], [240, 350], [140, 350], [20, 350], [-110, 350], [-240, 350], [-240, 230]],
];

export const FORKLIFT_PATHS = [
  { path: [[-180, -165], [-110, -165], [-110, -50], [-180, -50], [-180, -165]], speed: 0.15 },
  { path: [[-180, -25], [-110, -25], [-110, 65], [-180, 65], [-180, -25]], speed: 0.12 },
  { path: [[-180, 115], [-110, 115], [-50, 115], [-50, 205], [-110, 205], [-180, 205], [-180, 115]], speed: 0.13 },
];

// 4D mode: truck docking positions near warehouse doors
// Each entry maps truckIdx → warehouse for loading/unloading
import { WH_DATA } from './warehouseData'

export const TRUCK_4D_OPERATIONS = [
  { truckIdx: 0, whIdx: 0, type: 'inbound', label: 'Nhập hàng → WH5.1' },
  { truckIdx: 1, whIdx: 3, type: 'inbound', label: 'Nhập hàng → WH5.4' },
  { truckIdx: 2, whIdx: 6, type: 'outbound', label: 'Xuất hàng ← WH5.6.1' },
  { truckIdx: 3, whIdx: 1, type: 'inbound', label: 'Nhập hàng → WH5.2' },
  { truckIdx: 4, whIdx: 8, type: 'outbound', label: 'Xuất hàng ← WH5.7' },
]

// Compute docking position for each 4D operation (truck parks near warehouse door)
export function getTruck4DDockingPos(opIdx) {
  const op = TRUCK_4D_OPERATIONS[opIdx]
  if (!op) return null
  const wh = WH_DATA[op.whIdx]
  if (!wh) return null
  const doorX = wh.pos[0] + wh.width * 0.26
  const doorZ = wh.pos[2] + wh.depth / 2 + 15
  // Face toward warehouse (angle pointing -Z)
  const angle = Math.PI
  return { x: doorX, z: doorZ, angle }
}

export function precomputeSegments(waypoints) {
  const segDists = [];
  let totalDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1][0] - waypoints[i][0];
    const dz = waypoints[i + 1][1] - waypoints[i][1];
    const d = Math.sqrt(dx * dx + dz * dz);
    segDists.push(d);
    totalDist += d;
  }
  return { segDists, totalDist };
}

export function getPositionOnRoute(waypoints, segDists, totalDist, progress) {
  const modProgress = ((progress % totalDist) + totalDist) % totalDist;
  let accumulated = 0;
  for (let i = 0; i < segDists.length; i++) {
    if (accumulated + segDists[i] >= modProgress) {
      const t = (modProgress - accumulated) / segDists[i];
      const x = waypoints[i][0] + (waypoints[i + 1][0] - waypoints[i][0]) * t;
      const z = waypoints[i][1] + (waypoints[i + 1][1] - waypoints[i][1]) * t;
      const angle = Math.atan2(
        waypoints[i + 1][0] - waypoints[i][0],
        waypoints[i + 1][1] - waypoints[i][1]
      );
      return { x, z, angle };
    }
    accumulated += segDists[i];
  }
  return { x: waypoints[0][0], z: waypoints[0][1], angle: 0 };
}
