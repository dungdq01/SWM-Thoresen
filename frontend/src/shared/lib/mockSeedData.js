/**
 * Default seed data cho mock storage.
 * Dùng cho Dashboard và các trang khác khi chưa kết nối API.
 */

// ============================================================
// Dashboard Stats
// ============================================================
export const dashboardStats = [
  { id: 'stat-1', key: 'totalProducts', label: 'Tổng sản phẩm', value: 12458, change: 2.5, changeType: 'positive' },
  { id: 'stat-2', key: 'inboundToday', label: 'Nhập kho hôm nay', value: 234, change: 12.3, changeType: 'positive' },
  { id: 'stat-3', key: 'outboundToday', label: 'Xuất kho hôm nay', value: 189, change: -3.1, changeType: 'negative' },
  { id: 'stat-4', key: 'lowStockAlerts', label: 'Cảnh báo tồn kho', value: 23, change: 5, changeType: 'warning' },
]

// ============================================================
// Inventory Flow (7 ngày gần nhất)
// ============================================================
export const inventoryFlow = [
  { id: 'flow-1', date: '04/03', inbound: 245, outbound: 180, dayLabel: 'T2' },
  { id: 'flow-2', date: '05/03', inbound: 312, outbound: 220, dayLabel: 'T3' },
  { id: 'flow-3', date: '06/03', inbound: 198, outbound: 290, dayLabel: 'T4' },
  { id: 'flow-4', date: '07/03', inbound: 420, outbound: 310, dayLabel: 'T5' },
  { id: 'flow-5', date: '08/03', inbound: 380, outbound: 275, dayLabel: 'T6' },
  { id: 'flow-6', date: '09/03', inbound: 156, outbound: 120, dayLabel: 'T7' },
  { id: 'flow-7', date: '10/03', inbound: 234, outbound: 189, dayLabel: 'CN' },
]

// ============================================================
// Warehouse Distribution
// ============================================================
export const warehouseDistribution = [
  { id: 'wh-1', name: 'Kho A', value: 4520, color: '#4DC3E8' },
  { id: 'wh-2', name: 'Kho B', value: 3280, color: '#1E3A5F' },
  { id: 'wh-3', name: 'Kho C', value: 2658, color: '#60A5FA' },
  { id: 'wh-4', name: 'Kho D', value: 2000, color: '#94A3B8' },
]

// ============================================================
// Low Stock Alerts
// ============================================================
export const lowStockAlerts = [
  { id: 'alert-1', name: 'Ốc vít M8x25', warehouse: 'Kho A', current: 12, min: 100, sku: 'OV-M8X25-001' },
  { id: 'alert-2', name: 'Bạc đạn 6205', warehouse: 'Kho B', current: 5, min: 50, sku: 'BD-6205-002' },
  { id: 'alert-3', name: 'Dầu nhớt Shell', warehouse: 'Kho A', current: 8, min: 30, sku: 'DN-SHELL-003' },
  { id: 'alert-4', name: 'Bulong M10', warehouse: 'Kho C', current: 15, min: 80, sku: 'BL-M10-004' },
  { id: 'alert-5', name: 'Vòng bi SKF', warehouse: 'Kho B', current: 3, min: 25, sku: 'VB-SKF-005' },
]

// ============================================================
// Top Outbound Products
// ============================================================
export const topOutboundProducts = [
  { id: 'top-1', name: 'Linh kiện điện tử A', quantity: 1250, growth: 15 },
  { id: 'top-2', name: 'Phụ tùng ô tô B', quantity: 980, growth: 8 },
  { id: 'top-3', name: 'Thiết bị công nghiệp C', quantity: 756, growth: -5 },
  { id: 'top-4', name: 'Vật liệu xây dựng D', quantity: 620, growth: 22 },
  { id: 'top-5', name: 'Hàng tiêu dùng E', quantity: 540, growth: 12 },
]

// ============================================================
// Recent Activities
// ============================================================
export const recentActivities = [
  { id: 'act-1', type: 'inbound', description: 'Nhập hàng từ NCC Samsung', quantity: '+150 SP', time: '5 phút trước', status: 'completed', timestamp: Date.now() - 5 * 60000 },
  { id: 'act-2', type: 'outbound', description: 'Xuất hàng cho KH Vingroup', quantity: '-85 SP', time: '12 phút trước', status: 'completed', timestamp: Date.now() - 12 * 60000 },
  { id: 'act-3', type: 'transfer', description: 'Chuyển kho A → B', quantity: '200 SP', time: '25 phút trước', status: 'in_progress', timestamp: Date.now() - 25 * 60000 },
  { id: 'act-4', type: 'adjustment', description: 'Điều chỉnh tồn kho Kho C', quantity: '-12 SP', time: '1 giờ trước', status: 'completed', timestamp: Date.now() - 60 * 60000 },
  { id: 'act-5', type: 'inbound', description: 'Nhập hàng từ NCC LG', quantity: '+320 SP', time: '2 giờ trước', status: 'completed', timestamp: Date.now() - 120 * 60000 },
  { id: 'act-6', type: 'outbound', description: 'Xuất hàng cho KH FPT', quantity: '-200 SP', time: '3 giờ trước', status: 'completed', timestamp: Date.now() - 180 * 60000 },
]

// ============================================================
// All seed data map
// ============================================================
export const ALL_SEED_DATA = {
  dashboard_stats: dashboardStats,
  inventory_flow: inventoryFlow,
  warehouse_distribution: warehouseDistribution,
  low_stock_alerts: lowStockAlerts,
  top_outbound: topOutboundProducts,
  recent_activities: recentActivities,
}
