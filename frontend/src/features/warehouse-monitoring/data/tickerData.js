// Mock activity ticker data for the live activity bar

export const TICKER_ITEMS = [
  { time: '14:32', type: 'nhap', tag: 'NHẬP', message: 'Xe 51C-123.45 cân vào WH5.2 — Gross: 38.5T', color: '#10b981' },
  { time: '14:28', type: 'nhap', tag: 'NHẬP', message: 'Phiếu RC-2026-0347 hoàn tất WH5.1 — Net: 25.3T', color: '#10b981' },
  { time: '14:25', type: 'xuat', tag: 'XUẤT', message: 'Phiếu SH-2026-0217 đang xếp hàng WH5.4', color: '#f59e0b' },
  { time: '14:22', type: 'move', tag: 'DI CHUYỂN', message: 'Xe nâng FK-23 Zone A → B WH5.4', color: '#3b82f6' },
  { time: '14:18', type: 'warning', tag: 'CẢNH BÁO', message: 'WH5.7 đạt 95% — Cần kiểm tra', color: '#ef4444' },
  { time: '14:15', type: 'can', tag: 'CÂN', message: 'Trạm cân #1: Xe 72B-456.78 — Tare: 12.8T', color: '#a78bfa' },
  { time: '14:10', type: 'nhap', tag: 'NHẬP', message: 'PO-2026-0112 xác nhận — 500T Phân NPK', color: '#10b981' },
  { time: '14:05', type: 'xuat', tag: 'XUẤT', message: 'SO-2026-0085 tạo shipment — 200T Xi măng', color: '#f59e0b' },
];

export const TICKER_ICONS = {
  nhap: 'ArrowDownCircle',
  xuat: 'ArrowUpCircle',
  move: 'Shuffle',
  warning: 'AlertTriangle',
  can: 'Scale',
};
