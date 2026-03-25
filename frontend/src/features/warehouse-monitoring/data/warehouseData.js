// SWM TVL — Warehouse Data (11 warehouses, real-scale positions)

export const WH_DATA = [
  { code: 'WH5.1', name: 'Kho 5.1 (Bulk)', owner: 'TVL', area: 8000, width: 100, depth: 80, fill: 78, stock: 5230, zones: 6, type: 'Hàng rời (Bulk)', pos: [-180, 0, -120], color: 0x2563eb, items: [['Phân bón NPK', 2100, 'tấn'], ['Xi măng PCB40', 1800, 'tấn'], ['Clinker', 1330, 'tấn']], temp: 28, humid: 65 },
  { code: 'WH5.2', name: 'Kho 5.2 (Bagged)', owner: 'TVL', area: 9500, width: 110, depth: 86, fill: 65, stock: 6800, zones: 8, type: 'Hàng bao (Bagged)', pos: [-40, 0, -120], color: 0x7c3aed, items: [['Xi măng PCB40', 3200, 'tấn'], ['Phân DAP', 2100, 'tấn'], ['Phân Ure', 1500, 'tấn']], temp: 27, humid: 60 },
  { code: 'WH5.3', name: 'Kho 5.3 (Mixed)', owner: 'Partner A', area: 7200, width: 90, depth: 80, fill: 82, stock: 8200, zones: 5, type: 'Hàng hỗn hợp', pos: [100, 0, -120], color: 0x0891b2, items: [['Clinker OPC', 5200, 'tấn'], ['Xi măng PCB50', 2100, 'tấn'], ['Clinker MH', 900, 'tấn']], temp: 30, humid: 70 },
  { code: 'WH5.4', name: 'Kho 5.4 (Bulk)', owner: 'TVL', area: 8800, width: 100, depth: 88, fill: 45, stock: 3100, zones: 7, type: 'Hàng rời (Bulk)', pos: [-180, 0, 20], color: 0x059669, items: [['Phân Ure 46%', 1850, 'tấn'], ['Phân NPK', 900, 'tấn'], ['Phân DAP', 350, 'tấn']], temp: 29, humid: 63 },
  { code: 'WH5.5.1', name: 'Kho 5.5.1', owner: 'Partner B', area: 6500, width: 80, depth: 81, fill: 90, stock: 4800, zones: 4, type: 'Clinker', pos: [-40, 0, 20], color: 0xd97706, items: [['Clinker OPC', 3500, 'tấn'], ['Clinker PPC', 1300, 'tấn']], temp: 32, humid: 55 },
  { code: 'WH5.5.2', name: 'Kho 5.5.2', owner: 'Partner B', area: 6800, width: 85, depth: 80, fill: 55, stock: 3200, zones: 4, type: 'Clinker', pos: [80, 0, 20], color: 0xdc2626, items: [['Clinker SH', 2100, 'tấn'], ['Clinker HT', 1100, 'tấn']], temp: 31, humid: 57 },
  { code: 'WH5.6.1', name: 'Kho 5.6.1 (Cont)', owner: 'TVL', area: 7500, width: 90, depth: 83, fill: 70, stock: 4200, zones: 6, type: 'Container', pos: [-180, 0, 160], color: 0x0284c7, items: [['Container 20ft', 80, 'TEU'], ['Container 40ft', 45, 'TEU']], temp: 26, humid: 62 },
  { code: 'WH5.6.2', name: 'Kho 5.6.2 (Pallet)', owner: 'TVL', area: 7000, width: 88, depth: 80, fill: 38, stock: 1800, zones: 5, type: 'Pallet', pos: [-50, 0, 160], color: 0x16a34a, items: [['Pallet NPK', 800, 'tấn'], ['Pallet Xi măng', 600, 'tấn'], ['Pallet khác', 400, 'tấn']], temp: 27, humid: 64 },
  { code: 'WH5.7', name: 'Kho 5.7 (VAS)', owner: 'Partner A', area: 6200, width: 78, depth: 79, fill: 95, stock: 4950, zones: 3, type: 'VAS / Đóng bao', pos: [70, 0, 160], color: 0xea580c, items: [['Hàng đóng bao', 2800, 'tấn'], ['Hàng pha trộn', 1500, 'tấn'], ['Hàng chờ VAS', 650, 'tấn']], temp: 33, humid: 72 },
  { code: 'WH5.8', name: 'Kho 5.8 (Jumbo)', owner: 'TVL', area: 7500, width: 90, depth: 83, fill: 60, stock: 3600, zones: 5, type: 'Jumbo Bag', pos: [185, 0, 160], color: 0x7c3aed, items: [['Jumbo bag NPK', 2000, 'tấn'], ['Jumbo bag DAP', 1000, 'tấn'], ['Jumbo bag khác', 600, 'tấn']], temp: 28, humid: 66 },
  { code: 'WH5.9', name: 'Kho 5.9 (Temp)', owner: 'TVL', area: 6500, width: 80, depth: 81, fill: 72, stock: 3350, zones: 4, type: 'Hàng tạm', pos: [-40, 0, 290], color: 0x0891b2, items: [['Hàng tạm HK', 1800, 'tấn'], ['Hàng chờ xuất', 1200, 'tấn'], ['Hàng phân loại', 350, 'tấn']], temp: 29, humid: 68 },
];

export const CAM_PRESETS = {
  overview: { pos: [0, 320, 380], target: [0, 0, 60] },
  topdown: { pos: [0, 550, 1], target: [0, 0, 60] },
};

export const WALL_HEIGHT = 22;
export const WALL_THICK = 1.5;
export const DOOR_WIDTH = 16;
export const DOOR_HEIGHT = 15;
export const ROOF_PEAK = 10;
export const ROOF_OVERHANG = 5;

export const ZONE_COLORS = [0x1e40af, 0x047857, 0x92400e, 0x6d28d9, 0x0e7490, 0x9f1239, 0x166534, 0x7e22ce];

export const TREE_POSITIONS = [
  [-480, -250], [-490, -150], [-480, -50], [-490, 50], [-480, 150], [-490, 250],
  [380, -250], [390, -150], [380, -50], [390, 50], [380, 150], [390, 250],
  [-250, -350], [-150, -340], [-50, -350], [50, -340], [150, -350], [250, -340],
  [-250, 390], [-150, 380], [-50, 390], [50, 380], [150, 390], [250, 380],
  [-300, -120], [-300, 100], [300, -120], [300, 100],
];

export function getTotalStock() {
  return WH_DATA.reduce((sum, wh) => sum + wh.stock, 0);
}

export function getTotalArea() {
  return WH_DATA.reduce((sum, wh) => sum + wh.area, 0);
}

export function getAverageUsage() {
  return Math.round(WH_DATA.reduce((sum, wh) => sum + wh.fill, 0) / WH_DATA.length);
}
