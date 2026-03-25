/* ===================================================
   SWM TVL — Module Pages
   =================================================== */

function getModulePage(route) {
  // Route dispatch
  if (route.startsWith('settings/')) return getSettingsPage(route);
  if (route.startsWith('master-data/')) return getMasterDataPage(route);
  if (route.startsWith('inbound/')) return getInboundPage(route);
  if (route.startsWith('outbound/')) return getOutboundPage(route);
  if (route.startsWith('inventory-core/')) return getInventoryCorePageHTML(route);
  if (route.startsWith('inventory-control/')) return getInventoryControlPage(route);
  if (route.startsWith('work-execution/')) return getWorkExecutionPage(route);
  if (route === 'weighbridge') return getWeighbridgePage();
  if (route.startsWith('integration/')) return getIntegrationPage(route);
  if (route === 'ocr' || route.startsWith('ocr/')) return getOcrPage(route);
  if (route.startsWith('vas/')) return getVasPage(route);
  if (route.startsWith('billing/')) return getBillingPage(route);
  if (route.startsWith('reporting/')) return getReportingPage(route);
  if (route === 'goods-split') return getGoodsSplitPage();
  return null;
}

// ===== SHARED HELPERS =====
function pageHeader(title, subtitle, btnLabel, btnAction) {
  return `<div class="page-header">
    <div class="page-header-left">
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>
    <div class="page-header-right">
      ${btnLabel ? `<button class="btn btn-primary" onclick="${btnAction || 'showToast(\"Tính năng đang phát triển\",\"info\")'}">${btnLabel}</button>` : ''}
      <button class="btn btn-secondary"><i class="fas fa-download"></i> Xuất Excel</button>
    </div>
  </div>`;
}

function filterBar(placeholder = 'Tìm kiếm...', extraFilters = '') {
  return `<div class="filter-bar">
    <div class="filter-input" style="flex:2">
      <i class="fas fa-search"></i>
      <input type="text" placeholder="${placeholder}">
    </div>
    ${extraFilters}
    <button class="btn btn-secondary"><i class="fas fa-filter"></i> Bộ lọc</button>
    <button class="btn btn-secondary"><i class="fas fa-sync-alt"></i></button>
  </div>`;
}

function tablePagination(total, current = 1) {
  return `<div class="pagination">
    <span class="pagination-info">Hiển thị 20 / ${total.toLocaleString('vi-VN')} bản ghi</span>
    <div class="pagination-controls">
      <button class="page-btn">◀</button>
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">3</button>
      <button class="page-btn" style="color:var(--color-text-muted)">...</button>
      <button class="page-btn">${Math.ceil(total/20)}</button>
      <button class="page-btn">▶</button>
    </div>
  </div>`;
}

// ===== SETTINGS =====
function getSettingsPage(route) {
  const sub = route.replace('settings/', '');
  if (sub === 'users') return getUsersPage();
  if (sub === 'roles') return getRolesPage();
  if (sub === 'permissions') return getPermissionsPage();
  if (sub === 'number-sequences') return getNumberSequencesPage();
  if (sub === 'governance') return getGovernancePage();
  if (sub === 'logs') return getAuditLogsPage();
  return genericListPage('Cài đặt', sub);
}

function getUsersPage() {
  const users = [
    { name: 'Nguyễn Văn Admin', username: 'admin', role: 'ADMIN', email: 'admin@tvl.vn', lastLogin: '25/03/2026 14:32', status: 'active' },
    { name: 'Trần Thị Manager', username: 'wh.manager', role: 'WH_MANAGER', email: 'manager@tvl.vn', lastLogin: '25/03/2026 13:15', status: 'active' },
    { name: 'Lê Văn Keeper', username: 'wh.keeper01', role: 'WH_KEEPER', email: 'keeper1@tvl.vn', lastLogin: '25/03/2026 12:00', status: 'active' },
    { name: 'Phạm Thị Operator', username: 'wb.op01', role: 'WB_OPERATOR', email: 'wbop@tvl.vn', lastLogin: '24/03/2026 17:30', status: 'active' },
    { name: 'Đặng Văn Billing', username: 'billing01', role: 'BILLING_OFC', email: 'billing@tvl.vn', lastLogin: '24/03/2026 16:00', status: 'active' },
    { name: 'Hoàng Thị Governance', username: 'gov.mgr', role: 'GOVERNANCE_MANAGER', email: 'gov@tvl.vn', lastLogin: '23/03/2026 09:00', status: 'active' },
    { name: 'Nguyễn Khách Hàng', username: 'cust.view01', role: 'CUST_VIEWER', email: 'customer@abc.vn', lastLogin: '22/03/2026 11:00', status: 'inactive' },
  ];
  const roleColors = {
    'ADMIN': '#ef4444', 'WH_MANAGER': '#8b5cf6', 'WH_KEEPER': '#10b981',
    'WB_OPERATOR': '#3b82f6', 'BILLING_OFC': '#f59e0b', 'GOVERNANCE_MANAGER': '#06b6d4', 'CUST_VIEWER': '#94a3b8'
  };
  return `<div class="page-container">
    ${pageHeader('Quản lý người dùng', `${users.length} người dùng trong hệ thống`, '<i class="fas fa-plus"></i> Tạo người dùng')}
    ${filterBar('Tìm theo tên, username...',
      `<select class="filter-select"><option>Tất cả vai trò</option><option>ADMIN</option><option>WH_MANAGER</option><option>WH_KEEPER</option></select>
       <select class="filter-select"><option>Tất cả trạng thái</option><option>Hoạt động</option><option>Vô hiệu</option></select>`
    )}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr>
          <th>Họ và tên</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Email</th><th>Đăng nhập cuối</th><th>Trạng thái</th><th>Thao tác</th>
        </tr></thead>
        <tbody>
          ${users.map(u => `<tr>
            <td><div style="display:flex;align-items:center;gap:10px">
              <div style="width:32px;height:32px;border-radius:8px;background:${roleColors[u.role]}22;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:${roleColors[u.role]}">${u.name.charAt(0)}</div>
              <div><div style="font-weight:600;color:var(--color-text-primary)">${u.name}</div></div>
            </div></td>
            <td><code style="font-size:12px;color:var(--color-ice)">${u.username}</code></td>
            <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${roleColors[u.role]}22;color:${roleColors[u.role]}">${u.role}</span></td>
            <td>${u.email}</td>
            <td style="font-size:12px">${u.lastLogin}</td>
            <td><span class="badge ${u.status === 'active' ? 'badge-active' : 'badge-cancelled'}">${u.status === 'active' ? 'Hoạt động' : 'Vô hiệu'}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-secondary" onclick="showToast('Đang chỉnh sửa người dùng','info')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="showToast('Xác nhận vô hiệu hóa?','warning')"><i class="fas fa-ban"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${tablePagination(users.length)}
    </div>
  </div>`;
}

function getRolesPage() {
  const roles = [
    { code: 'ADMIN', name: 'Quản trị viên', desc: 'Toàn quyền hệ thống', users: 1, perms: 'Tất cả' },
    { code: 'WH_MANAGER', name: 'Quản lý kho', desc: 'Quản lý vận hành kho, phê duyệt ngoại lệ', users: 3, perms: '87/120' },
    { code: 'WH_KEEPER', name: 'Thủ kho', desc: 'Nhận hàng, xuất hàng, kiểm kê', users: 8, perms: '52/120' },
    { code: 'WB_OPERATOR', name: 'Vận hành cân', desc: 'Vận hành trạm cân, xác nhận trọng lượng', users: 4, perms: '23/120' },
    { code: 'OPS_SUPER', name: 'Giám sát vận hành', desc: 'Giám sát, báo cáo, xem toàn bộ', users: 2, perms: '68/120' },
    { code: 'BILLING_OFC', name: 'Nhân viên Billing', desc: 'Quản lý hợp đồng, tạo debit note', users: 2, perms: '35/120' },
    { code: 'GOVERNANCE_MANAGER', name: 'Quản lý Governance', desc: 'Business rules, audit, go-live', users: 1, perms: '45/120' },
    { code: 'CUST_VIEWER', name: 'Khách hàng', desc: 'Xem tồn kho và báo cáo của mình', users: 15, perms: '12/120' },
  ];
  return `<div class="page-container">
    ${pageHeader('Vai trò hệ thống', 'Quản lý RBAC — phân quyền theo vai trò', '<i class="fas fa-plus"></i> Tạo vai trò')}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Mã vai trò</th><th>Tên vai trò</th><th>Mô tả</th><th>Số người dùng</th><th>Quyền hạn</th><th>Thao tác</th></tr></thead>
        <tbody>
          ${roles.map(r => `<tr>
            <td><code style="color:var(--color-ice);font-size:12px">${r.code}</code></td>
            <td style="font-weight:600">${r.name}</td>
            <td style="color:var(--color-text-muted)">${r.desc}</td>
            <td><span style="font-size:13px;font-weight:700;color:var(--color-text-primary)">${r.users}</span></td>
            <td><span style="font-size:12px;color:var(--color-text-muted)">${r.perms}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-secondary"><i class="fas fa-edit"></i> Chỉnh sửa</button>
              <button class="btn btn-sm btn-secondary"><i class="fas fa-key"></i> Phân quyền</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function getPermissionsPage() {
  return genericListPage('Quyền hạn', 'Quản lý permission codes theo module.resource.action');
}
function getNumberSequencesPage() {
  return genericListPage('Chuỗi số tự động', 'Quản lý mẫu số thứ tự cho các chứng từ');
}
function getGovernancePage() {
  return genericListPage('Business Rules & Governance', 'Quản lý quy tắc nghiệp vụ, decision log');
}
function getAuditLogsPage() {
  return genericListPage('Audit Logs', 'Lịch sử thao tác và sự kiện hệ thống');
}

// ===== MASTER DATA =====
function getMasterDataPage(route) {
  const sub = route.replace('master-data/', '');
  if (sub === 'owners') return getOwnersPage();
  if (sub === 'items') return getItemsPage();
  if (sub === 'warehouses') return getWarehousesPage();
  if (sub === 'vendors') return genericListPage('Nhà cung cấp', 'Quản lý danh sách nhà cung cấp');
  if (sub === 'customers') return genericListPage('Khách hàng', 'Quản lý danh sách khách hàng');
  if (sub === 'zones') return getZonesPage();
  if (sub === 'locations') return genericListPage('Vị trí kho', 'Quản lý vị trí trong kho');
  if (sub === 'vessels') return genericListPage('Tàu biển', 'Quản lý danh sách tàu và B/L');
  if (sub === 'lots') return genericListPage('Lô hàng', 'Quản lý thông tin lô hàng');
  return genericListPage('Dữ liệu nền tảng', sub);
}

function getOwnersPage() {
  const owners = [
    { code: 'OWN-001', name: 'Công ty CP Phân bón Việt Nam', short: 'PVNF', items: 12, balance: '8,230 tấn', status: 'active' },
    { code: 'OWN-002', name: 'Tập đoàn Xi măng Vicem', short: 'VICEM', items: 8, balance: '15,450 tấn', status: 'active' },
    { code: 'OWN-003', name: 'Công ty Hóa chất Cần Thơ', short: 'CTCHEM', items: 5, balance: '3,120 tấn', status: 'active' },
    { code: 'OWN-004', name: 'Công ty Thép Miền Nam', short: 'SMC', items: 4, balance: '2,800 tấn', status: 'active' },
    { code: 'OWN-005', name: 'Tổng Công ty Lương thực', short: 'VINAFOOD', items: 6, balance: '5,600 tấn', status: 'inactive' },
  ];
  return `<div class="page-container">
    ${pageHeader('Chủ hàng', `${owners.length} chủ hàng đang hoạt động`, '<i class="fas fa-plus"></i> Thêm chủ hàng')}
    ${filterBar('Tìm theo tên, mã chủ hàng...')}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Mã</th><th>Tên chủ hàng</th><th>Tên ngắn</th><th>Mặt hàng</th><th>Tổng tồn kho</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>
          ${owners.map(o => `<tr>
            <td><code style="color:var(--color-ice);font-size:12px">${o.code}</code></td>
            <td style="font-weight:600">${o.name}</td>
            <td><span style="background:rgba(56,189,248,0.1);color:#38bdf8;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${o.short}</span></td>
            <td>${o.items} loại</td>
            <td style="font-weight:600;font-family:'JetBrains Mono',monospace">${o.balance}</td>
            <td><span class="badge ${o.status === 'active' ? 'badge-active' : 'badge-cancelled'}">${o.status === 'active' ? 'Hoạt động' : 'Vô hiệu'}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-secondary"><i class="fas fa-eye"></i></button>
              <button class="btn btn-sm btn-secondary"><i class="fas fa-edit"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${tablePagination(owners.length)}
    </div>
  </div>`;
}

function getItemsPage() {
  const items = [
    { code: 'ITM-NPK-001', name: 'Phân bón NPK 15-15-15', group: 'Phân bón', uom: 'TAN', owner: 'PVNF', onhand: '5,230 tấn', status: 'active' },
    { code: 'ITM-CEM-001', name: 'Xi măng PCB40', group: 'Xi măng', uom: 'TAN', owner: 'VICEM', onhand: '8,450 tấn', status: 'active' },
    { code: 'ITM-CLI-001', name: 'Clinker OPC', group: 'Clinker', uom: 'TAN', owner: 'VICEM', onhand: '12,300 tấn', status: 'active' },
    { code: 'ITM-URE-001', name: 'Phân Ure 46%', group: 'Phân bón', uom: 'TAN', owner: 'PVNF', onhand: '3,120 tấn', status: 'active' },
    { code: 'ITM-DAP-001', name: 'Phân DAP 18-46-0', group: 'Phân bón', uom: 'TAN', owner: 'PVNF', onhand: '1,850 tấn', status: 'active' },
    { code: 'ITM-STE-001', name: 'Sắt thép cuộn CB240', group: 'Kim loại', uom: 'TAN', owner: 'SMC', onhand: '2,800 tấn', status: 'active' },
    { code: 'ITM-SUL-001', name: 'Lưu huỳnh bột', group: 'Hóa chất', uom: 'TAN', owner: 'CTCHEM', onhand: '980 tấn', status: 'active' },
  ];
  return `<div class="page-container">
    ${pageHeader('Hàng hóa / SKU', `${items.length} mặt hàng trong danh mục`, '<i class="fas fa-plus"></i> Thêm hàng hóa')}
    ${filterBar('Tìm mã hàng, tên hàng...',
      `<select class="filter-select"><option>Tất cả nhóm</option><option>Phân bón</option><option>Xi măng</option><option>Kim loại</option></select>`
    )}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Mã hàng</th><th>Tên hàng hóa</th><th>Nhóm</th><th>Đơn vị</th><th>Chủ hàng</th><th>Tồn kho</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          ${items.map(it => `<tr>
            <td><code style="color:var(--color-ice);font-size:12px">${it.code}</code></td>
            <td style="font-weight:600">${it.name}</td>
            <td><span style="font-size:11px;color:var(--color-text-muted)">${it.group}</span></td>
            <td><span style="font-family:'JetBrains Mono';font-size:12px">${it.uom}</span></td>
            <td><span style="font-size:11px;background:rgba(56,189,248,0.1);color:#38bdf8;padding:1px 6px;border-radius:4px">${it.owner}</span></td>
            <td style="font-weight:600;font-family:'JetBrains Mono',monospace">${it.onhand}</td>
            <td><span class="badge badge-active">Hoạt động</span></td>
            <td><button class="btn btn-sm btn-secondary"><i class="fas fa-ellipsis-h"></i></button></td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${tablePagination(items.length)}
    </div>
  </div>`;
}

function getWarehousesPage() {
  const whs = [
    { code: 'WH5.1', name: 'Kho 5.1 (Bulk)', area: 8000, zones: 6, fill: 78 },
    { code: 'WH5.2', name: 'Kho 5.2 (Bagged)', area: 9500, zones: 8, fill: 65 },
    { code: 'WH5.3', name: 'Kho 5.3 (Mixed)', area: 7200, zones: 5, fill: 82 },
    { code: 'WH5.4', name: 'Kho 5.4 (Bulk)', area: 8800, zones: 7, fill: 45 },
    { code: 'WH5.5.1', name: 'Kho 5.5.1 (Clinker)', area: 6500, zones: 4, fill: 90 },
    { code: 'WH5.5.2', name: 'Kho 5.5.2 (Clinker)', area: 6800, zones: 4, fill: 55 },
    { code: 'WH5.6.1', name: 'Kho 5.6.1 (Container)', area: 7500, zones: 6, fill: 70 },
    { code: 'WH5.6.2', name: 'Kho 5.6.2 (Pallet)', area: 7000, zones: 5, fill: 38 },
    { code: 'WH5.7', name: 'Kho 5.7 (VAS)', area: 6200, zones: 3, fill: 95 },
    { code: 'WH5.8', name: 'Kho 5.8 (Jumbo Bag)', area: 7500, zones: 5, fill: 60 },
    { code: 'WH5.9', name: 'Kho 5.9 (Temp)', area: 6500, zones: 4, fill: 72 },
  ];
  const fillColor = (f) => f >= 90 ? '#ef4444' : f >= 75 ? '#f59e0b' : f >= 50 ? '#3b82f6' : '#10b981';
  return `<div class="page-container">
    ${pageHeader('Nhà kho', '11 nhà kho — tổng diện tích 81,500 m²')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:24px">
      ${whs.map(wh => `
        <div class="summary-card" style="cursor:pointer;flex-direction:column;align-items:stretch" onclick="showToast('Mở chi tiết ${wh.code}','info')">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--color-text-primary)">${wh.code}</div>
              <div style="font-size:12px;color:var(--color-text-muted)">${wh.name}</div>
            </div>
            <span class="badge badge-active">Hoạt động</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            <div style="font-size:11px;color:var(--color-text-muted)">Diện tích: <strong style="color:var(--color-text-primary)">${wh.area.toLocaleString('vi-VN')} m²</strong></div>
            <div style="font-size:11px;color:var(--color-text-muted)">Zones: <strong style="color:var(--color-text-primary)">${wh.zones}</strong></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
              <span style="color:var(--color-text-muted)">Tỷ lệ sử dụng</span>
              <span style="font-weight:700;color:${fillColor(wh.fill)}">${wh.fill}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${wh.fill}%;background:${fillColor(wh.fill)}"></div></div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function getZonesPage() {
  return genericListPage('Khu vực kho (Zones)', 'Quản lý zones trong từng nhà kho');
}

// ===== INBOUND =====
function getInboundPage(route) {
  const sub = route.replace('inbound/', '');
  if (sub === 'purchase-orders') return getPOPage();
  if (sub === 'receipts') return getReceiptsPage();
  if (sub === 'unloading') return getUnloadingPage();
  return genericListPage('Nhập kho', sub);
}

function getPOPage() {
  const pos = [
    { code: 'PO-2026-0112', owner: 'PVNF', vendor: 'Cty Phân bón Bình Điền', item: 'Phân NPK 15-15-15', qty: '500 tấn', vessel: 'MV Pacific Star', bl: 'BL2026-0892', status: 'confirmed', date: '20/03/2026' },
    { code: 'PO-2026-0111', owner: 'VICEM', vendor: 'Cty Xi măng Hà Tiên', item: 'Xi măng PCB40', qty: '1,200 tấn', vessel: 'MV Ocean Glory', bl: 'BL2026-0891', status: 'partially_received', date: '19/03/2026' },
    { code: 'PO-2026-0110', owner: 'PVNF', vendor: 'Cty Hóa chất Đình Vũ', item: 'Phân DAP 18-46-0', qty: '300 tấn', vessel: 'MV Sea Fortune', bl: 'BL2026-0890', status: 'received', date: '18/03/2026' },
    { code: 'PO-2026-0109', owner: 'SMC', vendor: 'Cty Thép Hòa Phát', item: 'Thép cuộn CB240', qty: '200 tấn', vessel: '—', bl: '—', status: 'draft', date: '17/03/2026' },
    { code: 'PO-2026-0108', owner: 'VICEM', vendor: 'Cty Clinker VN', item: 'Clinker OPC', qty: '2,000 tấn', vessel: 'MV Eastern Star', bl: 'BL2026-0889', status: 'confirmed', date: '15/03/2026' },
  ];
  const statusMap = {
    'draft': ['badge-draft','Nháp'], 'confirmed': ['badge-confirmed','Xác nhận'],
    'partially_received': ['badge-processing','Nhận một phần'], 'received': ['badge-received','Đã nhận'],
    'cancelled': ['badge-cancelled','Đã hủy'],
  };
  return `<div class="page-container">
    ${pageHeader('Đơn mua hàng (PO)', `${pos.length} PO đang hoạt động`, '<i class="fas fa-plus"></i> Tạo PO mới')}
    ${filterBar('Tìm mã PO, nhà cung cấp...',
      `<select class="filter-select"><option>Tất cả trạng thái</option><option>Nháp</option><option>Xác nhận</option><option>Đã nhận</option></select>
       <select class="filter-select"><option>Tất cả chủ hàng</option><option>PVNF</option><option>VICEM</option></select>`
    )}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Mã PO</th><th>Chủ hàng</th><th>Nhà cung cấp</th><th>Hàng hóa</th><th>Số lượng</th><th>Tàu / B/L</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr></thead>
        <tbody>
          ${pos.map(po => {
            const [cls, lbl] = statusMap[po.status] || ['badge-draft', po.status];
            return `<tr>
              <td><a href="#" style="color:var(--color-ice);font-weight:600;font-family:'JetBrains Mono',monospace;font-size:12px" onclick="showToast('Mở chi tiết ${po.code}','info')">${po.code}</a></td>
              <td><span style="font-size:11px;background:rgba(56,189,248,0.1);color:#38bdf8;padding:1px 6px;border-radius:4px">${po.owner}</span></td>
              <td>${po.vendor}</td>
              <td>${po.item}</td>
              <td style="font-weight:600;font-family:'JetBrains Mono',monospace">${po.qty}</td>
              <td style="font-size:12px"><div>${po.vessel}</div><div style="color:var(--color-text-muted)">${po.bl}</div></td>
              <td><span class="badge ${cls}">${lbl}</span></td>
              <td style="color:var(--color-text-muted)">${po.date}</td>
              <td><button class="btn btn-sm btn-secondary"><i class="fas fa-ellipsis-h"></i></button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${tablePagination(pos.length)}
    </div>
  </div>`;
}

function getReceiptsPage() {
  const receipts = [
    { code: 'RC-2026-0347', po: 'PO-2026-0112', owner: 'PVNF', item: 'Phân NPK 15-15-15', vehicle: '51C-123.45', gross: '38.5 tấn', tare: '12.8 tấn', net: '25.7 tấn', wh: 'WH5.1', status: 'received' },
    { code: 'RC-2026-0346', po: 'PO-2026-0111', owner: 'VICEM', item: 'Xi măng PCB40', vehicle: '72B-456.78', gross: '—', tare: '—', net: '—', wh: 'WH5.2', status: 'processing' },
    { code: 'RC-2026-0345', po: 'PO-2026-0110', owner: 'PVNF', item: 'Phân DAP 18-46-0', vehicle: '50H-789.01', gross: '42.1 tấn', tare: '13.2 tấn', net: '28.9 tấn', wh: 'WH5.1', status: 'received' },
    { code: 'RC-2026-0344', po: 'PO-2026-0112', owner: 'PVNF', item: 'Phân NPK 15-15-15', vehicle: '51D-234.56', gross: '39.8 tấn', tare: '—', net: '—', wh: 'WH5.1', status: 'weighed_in' },
    { code: 'RC-2026-0343', po: 'PO-2026-0109', owner: 'SMC', item: 'Thép cuộn CB240', vehicle: '43C-111.22', gross: '31.5 tấn', tare: '9.5 tấn', net: '22.0 tấn', wh: 'WH5.6.1', status: 'rejected' },
  ];
  const statusMap = {
    'draft': ['badge-draft','Nháp'], 'awaiting_weighing': ['badge-pending','Chờ cân'],
    'weighed_in': ['badge-pending','Đã cân vào'], 'processing': ['badge-processing','Đang xử lý'],
    'received': ['badge-received','Đã nhận'], 'rejected': ['badge-rejected','Từ chối'],
  };
  return `<div class="page-container">
    ${pageHeader('Phiếu nhập kho', 'Quản lý luồng nhập: PO → Receipt → Weighing → Received', '<i class="fas fa-plus"></i> Tạo phiếu nhập')}
    ${filterBar('Tìm mã phiếu, biển số xe...',
      `<select class="filter-select"><option>Tất cả trạng thái</option><option>Chờ cân</option><option>Đang xử lý</option><option>Đã nhận</option></select>`
    )}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Mã phiếu</th><th>PO</th><th>Chủ hàng</th><th>Hàng hóa</th><th>Xe</th><th>Trọng lượng (G/T/Net)</th><th>Kho</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          ${receipts.map(r => {
            const [cls, lbl] = statusMap[r.status] || ['badge-draft', r.status];
            return `<tr>
              <td><a href="#" style="color:var(--color-ice);font-weight:600;font-family:'JetBrains Mono',monospace;font-size:12px">${r.code}</a></td>
              <td><code style="font-size:11px;color:var(--color-text-muted)">${r.po}</code></td>
              <td><span style="font-size:11px;background:rgba(56,189,248,0.1);color:#38bdf8;padding:1px 6px;border-radius:4px">${r.owner}</span></td>
              <td>${r.item}</td>
              <td><span style="font-family:'JetBrains Mono';font-size:12px">${r.vehicle}</span></td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:12px">
                <span style="color:#10b981">${r.gross}</span> /
                <span style="color:#64748b">${r.tare}</span> /
                <span style="color:#38bdf8;font-weight:700">${r.net}</span>
              </td>
              <td><span style="font-size:11px;padding:2px 8px;background:rgba(56,189,248,0.1);color:#38bdf8;border-radius:4px">${r.wh}</span></td>
              <td><span class="badge ${cls}">${lbl}</span></td>
              <td><button class="btn btn-sm btn-secondary"><i class="fas fa-ellipsis-h"></i></button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${tablePagination(receipts.length)}
    </div>
  </div>`;
}

function getUnloadingPage() {
  return genericListPage('Dỡ hàng', 'Theo dõi và quản lý hoạt động dỡ hàng từ xe vào kho');
}

// ===== OUTBOUND =====
function getOutboundPage(route) {
  const sub = route.replace('outbound/', '');
  if (sub === 'sales-orders') return getSOPage();
  if (sub === 'shipments') return getShipmentsPage();
  return genericListPage('Xuất kho', sub);
}

function getSOPage() {
  const sos = [
    { code: 'SO-2026-0085', owner: 'PVNF', customer: 'Cty TNHH Nông nghiệp Mekong', item: 'Phân NPK 15-15-15', qty: '200 tấn', status: 'confirmed', date: '24/03/2026' },
    { code: 'SO-2026-0084', owner: 'VICEM', customer: 'Đại lý Xi măng Bình Dương', item: 'Xi măng PCB40', qty: '150 tấn', status: 'partially_shipped', date: '23/03/2026' },
    { code: 'SO-2026-0083', owner: 'SMC', customer: 'CTCP Xây dựng Đà Nẵng', item: 'Thép cuộn CB240', qty: '80 tấn', status: 'shipped', date: '22/03/2026' },
    { code: 'SO-2026-0082', owner: 'PVNF', customer: 'Tổng đại lý Miền Bắc', item: 'Phân Ure 46%', qty: '300 tấn', status: 'draft', date: '21/03/2026' },
  ];
  const statusMap = {
    'draft': ['badge-draft','Nháp'], 'confirmed': ['badge-confirmed','Xác nhận'],
    'partially_shipped': ['badge-processing','Xuất một phần'], 'shipped': ['badge-shipped','Đã xuất'],
    'cancelled': ['badge-cancelled','Đã hủy'],
  };
  return `<div class="page-container">
    ${pageHeader('Đơn bán hàng (SO)', 'Quản lý luồng xuất từ SO → Shipment', '<i class="fas fa-plus"></i> Tạo SO mới')}
    ${filterBar('Tìm mã SO, khách hàng...')}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Mã SO</th><th>Chủ hàng</th><th>Khách hàng</th><th>Hàng hóa</th><th>Số lượng</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr></thead>
        <tbody>
          ${sos.map(so => {
            const [cls, lbl] = statusMap[so.status] || ['badge-draft', so.status];
            return `<tr>
              <td><a href="#" style="color:var(--color-ice);font-weight:600;font-family:'JetBrains Mono',monospace;font-size:12px">${so.code}</a></td>
              <td><span style="font-size:11px;background:rgba(56,189,248,0.1);color:#38bdf8;padding:1px 6px;border-radius:4px">${so.owner}</span></td>
              <td>${so.customer}</td>
              <td>${so.item}</td>
              <td style="font-weight:600;font-family:'JetBrains Mono',monospace">${so.qty}</td>
              <td><span class="badge ${cls}">${lbl}</span></td>
              <td style="color:var(--color-text-muted)">${so.date}</td>
              <td><button class="btn btn-sm btn-secondary"><i class="fas fa-ellipsis-h"></i></button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${tablePagination(sos.length)}
    </div>
  </div>`;
}

function getShipmentsPage() {
  return genericListPage('Phiếu xuất kho', 'Quản lý Shipment từ DRAFT → SHIPPED');
}

// ===== INVENTORY CORE =====
function getInventoryCorePageHTML(route) {
  const sub = route.replace('inventory-core/', '');
  if (sub === 'on-hand') return getOnHandPage();
  if (sub === 'transactions') return getInventoryTransPage();
  return genericListPage('Tồn kho', sub);
}

function getOnHandPage() {
  const rows = [
    { dim: 'WH5.1 / Zone-A / LOC-A01', owner: 'PVNF', item: 'Phân NPK 15-15-15', physical: '2,100.5', reserved: '200.0', available: '1,900.5', uom: 'TAN', updated: '25/03/2026' },
    { dim: 'WH5.2 / Zone-B / LOC-B03', owner: 'VICEM', item: 'Xi măng PCB40', physical: '4,580.0', reserved: '150.0', available: '4,430.0', uom: 'TAN', updated: '25/03/2026' },
    { dim: 'WH5.3 / Zone-A / LOC-A05', owner: 'VICEM', item: 'Clinker OPC', physical: '8,200.0', reserved: '0.0', available: '8,200.0', uom: 'TAN', updated: '25/03/2026' },
    { dim: 'WH5.4 / Zone-C / LOC-C02', owner: 'PVNF', item: 'Phân Ure 46%', physical: '1,850.3', reserved: '300.0', available: '1,550.3', uom: 'TAN', updated: '24/03/2026' },
    { dim: 'WH5.6.1 / Zone-A / LOC-A01', owner: 'SMC', item: 'Thép cuộn CB240', physical: '980.0', reserved: '80.0', available: '900.0', uom: 'TAN', updated: '24/03/2026' },
  ];
  return `<div class="page-container">
    ${pageHeader('Tồn kho hiện tại (On-Hand)', 'Ledger-based · InventDim → OnHand · Cập nhật thời gian thực')}
    <div class="summary-cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="summary-card blue"><div class="summary-icon blue"><i class="fas fa-boxes"></i></div><div class="summary-content"><div class="summary-value">45,230</div><div class="summary-label">Tổng tồn kho (tấn)</div></div></div>
      <div class="summary-card green"><div class="summary-icon green"><i class="fas fa-check-circle"></i></div><div class="summary-content"><div class="summary-value">43,180</div><div class="summary-label">Có thể xuất (tấn)</div></div></div>
      <div class="summary-card yellow"><div class="summary-icon yellow"><i class="fas fa-lock"></i></div><div class="summary-content"><div class="summary-value">2,050</div><div class="summary-label">Đang giữ (tấn)</div></div></div>
      <div class="summary-card purple"><div class="summary-icon purple"><i class="fas fa-percentage"></i></div><div class="summary-content"><div class="summary-value">72%</div><div class="summary-label">Tỷ lệ sử dụng</div></div></div>
    </div>
    ${filterBar('Tìm hàng hóa, vị trí...',
      `<select class="filter-select"><option>Tất cả kho</option><option>WH5.1</option><option>WH5.2</option><option>WH5.3</option></select>
       <select class="filter-select"><option>Tất cả chủ hàng</option><option>PVNF</option><option>VICEM</option><option>SMC</option></select>`
    )}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Vị trí (Kho/Zone/Location)</th><th>Chủ hàng</th><th>Hàng hóa</th><th>Tồn thực tế</th><th>Đang giữ</th><th>Có thể xuất</th><th>Đơn vị</th><th>Cập nhật</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td><code style="font-size:12px;color:var(--color-ice)">${r.dim}</code></td>
            <td><span style="font-size:11px;background:rgba(56,189,248,0.1);color:#38bdf8;padding:1px 6px;border-radius:4px">${r.owner}</span></td>
            <td style="font-weight:500">${r.item}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--color-text-primary)">${r.physical}</td>
            <td style="font-family:'JetBrains Mono',monospace;color:#f59e0b">${r.reserved}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#10b981">${r.available}</td>
            <td><span style="font-size:11px">${r.uom}</span></td>
            <td style="color:var(--color-text-muted);font-size:12px">${r.updated}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${tablePagination(rows.length)}
    </div>
  </div>`;
}

function getInventoryTransPage() {
  return genericListPage('Giao dịch tồn kho', 'InventTrans Ledger — lịch sử biến động không thể thay đổi');
}

// ===== WEIGHBRIDGE =====
function getWeighbridgePage() {
  return `<div class="page-container">
    ${pageHeader('Trạm cân (Weighbridge)', 'Giám sát 2 trạm cân tại cổng · Real-time')}
    <div class="summary-cards" style="grid-template-columns:repeat(3,1fr)">
      <div class="summary-card green"><div class="summary-icon green"><i class="fas fa-weight-hanging"></i></div>
        <div class="summary-content"><div class="summary-value">47</div><div class="summary-label">Lần cân hôm nay</div></div></div>
      <div class="summary-card blue"><div class="summary-icon blue"><i class="fas fa-truck"></i></div>
        <div class="summary-content"><div class="summary-value">23</div><div class="summary-label">Xe đã vào</div></div></div>
      <div class="summary-card yellow"><div class="summary-icon yellow"><i class="fas fa-clock"></i></div>
        <div class="summary-content"><div class="summary-value">2</div><div class="summary-label">Xe đang chờ</div></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
      ${['WB-01', 'WB-02'].map((wb, i) => `
        <div class="card">
          <div style="padding:20px;border-bottom:1px solid var(--color-border)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:16px;font-weight:700">${wb}</div>
              <span class="badge ${i === 0 ? 'badge-processing' : 'badge-active'}">${i === 0 ? 'Đang cân' : 'Sẵn sàng'}</span>
            </div>
          </div>
          <div style="padding:20px">
            ${i === 0 ? `
              <div style="text-align:center;padding:20px 0">
                <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:8px">TRỌNG LƯỢNG HIỆN TẠI</div>
                <div style="font-size:48px;font-weight:800;color:#38bdf8;font-family:'JetBrains Mono',monospace">38.520</div>
                <div style="font-size:16px;color:var(--color-text-muted)">tấn</div>
                <div style="margin-top:16px;font-size:13px;color:var(--color-text-muted)">Xe: <strong style="color:var(--color-text-primary)">51C-123.45</strong></div>
                <div style="font-size:12px;color:var(--color-text-muted)">Link với: <strong style="color:var(--color-ice)">RC-2026-0348</strong></div>
              </div>
              <div style="display:flex;gap:8px;justify-content:center">
                <button class="btn btn-success" onclick="showToast('Đã xác nhận cân vào','success')"><i class="fas fa-check"></i> Xác nhận</button>
                <button class="btn btn-danger" onclick="showToast('Đã từ chối','error')"><i class="fas fa-times"></i> Từ chối</button>
              </div>
            ` : `
              <div style="text-align:center;padding:30px 0;color:var(--color-text-muted)">
                <i class="fas fa-weight-hanging" style="font-size:40px;opacity:0.3;display:block;margin-bottom:12px"></i>
                <div>Trạm cân đang chờ xe</div>
              </div>
            `}
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ===== OCR =====
function getOcrPage(route) {
  return `<div class="page-container">
    ${pageHeader('OCR Phiếu cân', 'Google Vision + Gemini AI — Tự động đọc và link phiếu cân', '<i class="fas fa-plus"></i> Quét phiếu mới')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div class="card" style="padding:24px">
        <div style="font-size:14px;font-weight:700;margin-bottom:16px"><i class="fas fa-upload" style="color:var(--color-ice);margin-right:8px"></i>Tải lên phiếu cân</div>
        <div style="border:2px dashed var(--color-border);border-radius:12px;padding:40px;text-align:center;cursor:pointer;transition:border-color 0.2s" onmouseenter="this.style.borderColor='#38bdf8'" onmouseleave="this.style.borderColor='var(--color-border)'" onclick="showToast('Chọn file ảnh phiếu cân','info')">
          <i class="fas fa-camera" style="font-size:32px;color:var(--color-text-muted);margin-bottom:12px;display:block"></i>
          <div style="font-weight:600;color:var(--color-text-secondary)">Kéo thả hoặc click để tải ảnh</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">JPG, PNG — Tối đa 10MB</div>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-primary" style="flex:1" onclick="showToast('Đang xử lý OCR...','info')"><i class="fas fa-magic"></i> Chạy OCR</button>
          <button class="btn btn-secondary" onclick="showToast('Mở camera','info')"><i class="fas fa-camera"></i> Camera</button>
        </div>
      </div>
      <div class="card" style="padding:24px">
        <div style="font-size:14px;font-weight:700;margin-bottom:16px"><i class="fas fa-robot" style="color:#818cf8;margin-right:8px"></i>Kết quả OCR (Demo)</div>
        <div style="display:grid;gap:10px">
          ${[
            ['Biển số xe', '51C-123.45', '#38bdf8'],
            ['Trọng lượng cân vào', '38,520 kg', '#10b981'],
            ['Trọng lượng cân ra', '12,840 kg', '#10b981'],
            ['Net weight', '25,680 kg', '#818cf8'],
            ['Sản phẩm (OCR)', 'Phân bón NPK', '#f59e0b'],
            ['Ngày giờ', '25/03/2026 14:32', '#94a3b8'],
          ].map(([label, value, color]) => `
            <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--color-bg-input);border-radius:8px">
              <span style="font-size:12px;color:var(--color-text-muted)">${label}</span>
              <span style="font-size:12px;font-weight:700;color:${color};font-family:'JetBrains Mono',monospace">${value}</span>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:16px;padding:12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;font-size:12px;color:#10b981">
          <i class="fas fa-check-circle"></i> Tự động link với <strong>RC-2026-0347</strong> — Confidence: 94%
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-success" style="flex:1" onclick="showToast('Đã xác nhận OCR result','success')"><i class="fas fa-check"></i> Xác nhận</button>
          <button class="btn btn-secondary" onclick="showToast('Mở chỉnh sửa','info')"><i class="fas fa-edit"></i> Chỉnh sửa</button>
        </div>
      </div>
    </div>
    ${genericListPage('Lịch sử OCR', '', true)}
  </div>`;
}

// ===== VAS =====
function getVasPage(route) {
  const sub = route.replace('vas/', '');
  return genericListPage('VAS / Đóng bao', `Module ${sub} — Dịch vụ giá trị gia tăng`);
}

// ===== BILLING =====
function getBillingPage(route) {
  const sub = route.replace('billing/', '');
  if (sub === 'invoices') return getDebitNotesPage();
  if (sub === 'dashboard') return getBillingDashboard();
  return genericListPage('Billing', sub);
}

function getDebitNotesPage() {
  const notes = [
    { code: 'DN-2026-0045', owner: 'PVNF', period: 'T3/2026', storage: '45,230,000', handling: '12,500,000', bagging: '3,200,000', total: '60,930,000', status: 'draft' },
    { code: 'DN-2026-0044', owner: 'VICEM', period: 'T3/2026', storage: '82,100,000', handling: '18,400,000', bagging: '0', total: '100,500,000', status: 'approved' },
    { code: 'DN-2026-0043', owner: 'SMC', period: 'T2/2026', storage: '15,800,000', handling: '5,200,000', bagging: '2,100,000', total: '23,100,000', status: 'locked' },
    { code: 'DN-2026-0042', owner: 'CTCHEM', period: 'T2/2026', storage: '8,900,000', handling: '2,800,000', bagging: '0', total: '11,700,000', status: 'pushed_erp' },
  ];
  const statusMap = {
    'draft': ['badge-draft','Nháp'], 'pending_review': ['badge-pending','Chờ duyệt'],
    'approved': ['badge-received','Đã duyệt'], 'locked': ['badge-locked','Đã khóa'],
    'pushed_erp': ['badge-confirmed','Đã đẩy ERP'], 'rejected': ['badge-rejected','Từ chối'],
  };
  return `<div class="page-container">
    ${pageHeader('Debit Notes / Hóa đơn', 'Tính phí lưu kho, xếp dỡ, đóng bao theo hợp đồng', '<i class="fas fa-plus"></i> Tạo Debit Note')}
    <div class="summary-cards" style="grid-template-columns:repeat(4,1fr)">
      <div class="summary-card yellow"><div class="summary-icon yellow"><i class="fas fa-file-invoice-dollar"></i></div><div class="summary-content"><div class="summary-value">196,230,000</div><div class="summary-label">Tổng T3/2026 (VNĐ)</div></div></div>
      <div class="summary-card green"><div class="summary-icon green"><i class="fas fa-check"></i></div><div class="summary-content"><div class="summary-value">2</div><div class="summary-label">Đã duyệt</div></div></div>
      <div class="summary-card blue"><div class="summary-icon blue"><i class="fas fa-lock"></i></div><div class="summary-content"><div class="summary-value">1</div><div class="summary-label">Đã khóa</div></div></div>
      <div class="summary-card purple"><div class="summary-icon purple"><i class="fas fa-sync"></i></div><div class="summary-content"><div class="summary-value">1</div><div class="summary-label">Đẩy ERP</div></div></div>
    </div>
    ${filterBar('Tìm mã DN, chủ hàng...')}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Mã DN</th><th>Chủ hàng</th><th>Kỳ</th><th>Phí lưu kho</th><th>Phí xếp dỡ</th><th>Phí đóng bao</th><th>Tổng cộng</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          ${notes.map(n => {
            const [cls, lbl] = statusMap[n.status] || ['badge-draft', n.status];
            return `<tr>
              <td><a href="#" style="color:var(--color-ice);font-weight:600;font-family:'JetBrains Mono',monospace;font-size:12px">${n.code}</a></td>
              <td><span style="font-size:11px;background:rgba(56,189,248,0.1);color:#38bdf8;padding:1px 6px;border-radius:4px">${n.owner}</span></td>
              <td style="font-size:12px">${n.period}</td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${n.storage} ₫</td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${n.handling} ₫</td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${n.bagging} ₫</td>
              <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--color-text-primary)">${n.total} ₫</td>
              <td><span class="badge ${cls}">${lbl}</span></td>
              <td><button class="btn btn-sm btn-secondary"><i class="fas fa-ellipsis-h"></i></button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${tablePagination(notes.length)}
    </div>
  </div>`;
}

function getBillingDashboard() {
  return genericListPage('Dashboard Billing', 'Tổng quan doanh thu, biểu phí, sự kiện tính phí');
}

// ===== REPORTING =====
function getReportingPage(route) {
  const sub = route.replace('reporting/', '');
  if (sub === 'go-live') return getGoLivePage();
  if (sub === 'dashboard') return getReportingDashboardPage();
  return genericListPage('Báo cáo', sub);
}

function getReportingDashboardPage() {
  return genericListPage('Dashboard Báo cáo', 'Tổng hợp báo cáo định kỳ và on-demand');
}

function getGoLivePage() {
  const checks = [
    { group: 'Dữ liệu nền tảng', items: [
      { name: 'Nhập đủ danh sách chủ hàng (Owners)', done: true },
      { name: 'Nhập đủ danh sách hàng hóa (Items/SKU)', done: true },
      { name: 'Cấu hình 11 nhà kho + zones + locations', done: true },
      { name: 'Nhập nhà cung cấp và khách hàng', done: true },
      { name: 'Cấu hình đơn vị tính (UOM)', done: true },
    ]},
    { group: 'Tích hợp & Thiết bị', items: [
      { name: 'Kết nối trạm cân WB-01', done: true },
      { name: 'Kết nối trạm cân WB-02', done: true },
      { name: 'Kiểm thử OCR phiếu cân', done: true },
      { name: 'Đồng bộ mobile app (Capacitor)', done: false },
      { name: 'Cấu hình ERP push endpoint', done: false },
    ]},
    { group: 'Nghiệp vụ', items: [
      { name: 'UAT nhập kho từ tàu (vessel inbound)', done: true },
      { name: 'UAT nhập kho từ xe (truck inbound)', done: true },
      { name: 'UAT xuất kho đủ allocation flow', done: true },
      { name: 'UAT billing storage fee', done: false },
      { name: 'UAT billing handling fee', done: false },
      { name: 'Training nhân viên thủ kho', done: false },
      { name: 'Training nhân viên billing', done: false },
    ]},
    { group: 'Hệ thống', items: [
      { name: 'Security audit (JWT, RBAC)', done: true },
      { name: 'Performance test (500 concurrent)', done: false },
      { name: 'Backup & Disaster Recovery plan', done: false },
      { name: 'Monitoring & Alerting setup', done: false },
    ]},
  ];

  const all = checks.flatMap(g => g.items);
  const done = all.filter(i => i.done).length;
  const pct = Math.round(done / all.length * 100);

  return `<div class="page-container">
    ${pageHeader('Go-Live Checklist', `${done}/${all.length} hạng mục hoàn thành (${pct}%)`)}
    <div class="card" style="padding:24px;margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:16px;font-weight:700">Tiến độ Go-Live tổng thể</div>
        <div style="font-size:24px;font-weight:800;color:${pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'}">${pct}%</div>
      </div>
      <div class="progress-bar" style="height:12px">
        <div class="progress-fill gradient" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--color-text-muted);margin-top:8px">
        <span>${done} hoàn thành</span>
        <span>${all.length - done} còn lại</span>
      </div>
    </div>
    <div style="display:grid;gap:20px">
      ${checks.map(group => {
        const groupDone = group.items.filter(i => i.done).length;
        return `<div class="card">
          <div style="padding:16px 20px;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700">${group.group}</span>
            <span style="font-size:13px;color:var(--color-text-muted)">${groupDone}/${group.items.length}</span>
          </div>
          <div style="padding:8px 0">
            ${group.items.map(item => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 20px">
                <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${item.done ? '#10b981' : 'var(--color-border)'};background:${item.done ? '#10b981' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${item.done ? '<i class="fas fa-check" style="font-size:9px;color:#fff"></i>' : ''}
                </div>
                <span style="font-size:13px;color:${item.done ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'};text-decoration:${item.done ? 'line-through' : 'none'}">${item.name}</span>
                ${item.done ? '<span class="badge badge-received" style="margin-left:auto">Hoàn thành</span>' : '<span class="badge badge-pending" style="margin-left:auto">Chưa xong</span>'}
              </div>
            `).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ===== OTHER PAGES =====
function getInventoryControlPage(route) {
  return genericListPage('Kiểm soát tồn kho', route.replace('inventory-control/', ''));
}
function getWorkExecutionPage(route) {
  return genericListPage('Thực thi công việc', route.replace('work-execution/', ''));
}
function getIntegrationPage(route) {
  return genericListPage('Tích hợp', route.replace('integration/', ''));
}
function getGoodsSplitPage() {
  return genericListPage('Chia hàng đổi chủ', 'Quản lý chia hàng và thay đổi chủ sở hữu');
}

// ===== GENERIC LIST PAGE =====
function genericListPage(title, subtitle = '', noHeader = false) {
  const sampleData = generateSampleTableRows(8);
  if (noHeader) {
    return `<div class="data-table-card" style="margin-top:0">
      <div class="data-table-header">
        <span class="data-table-title">Dữ liệu mẫu</span>
      </div>
      <table class="data-table">
        <thead><tr><th>Mã</th><th>Tên / Mô tả</th><th>Trạng thái</th><th>Ngày tạo</th><th>Người tạo</th><th></th></tr></thead>
        <tbody>${sampleData}</tbody>
      </table>
      ${tablePagination(56)}
    </div>`;
  }
  return `<div class="page-container">
    ${pageHeader(title, subtitle, '<i class="fas fa-plus"></i> Tạo mới')}
    ${filterBar('Tìm kiếm...')}
    <div class="data-table-card">
      <table class="data-table">
        <thead><tr><th>Mã</th><th>Tên / Mô tả</th><th>Trạng thái</th><th>Ngày tạo</th><th>Người tạo</th><th>Thao tác</th></tr></thead>
        <tbody>${sampleData}</tbody>
      </table>
      ${tablePagination(56)}
    </div>
  </div>`;
}

function generateSampleTableRows(count) {
  const statuses = ['active','draft','processing','confirmed','completed'];
  const users = ['admin','wh.manager','wh.keeper01','billing01'];
  let html = '';
  for (let i = 0; i < count; i++) {
    const code = `CODE-2026-${String(i+1).padStart(4,'0')}`;
    const status = statuses[i % statuses.length];
    const statusMap2 = {
      'active': ['badge-active','Hoạt động'],
      'draft': ['badge-draft','Nháp'],
      'processing': ['badge-processing','Đang xử lý'],
      'confirmed': ['badge-confirmed','Xác nhận'],
      'completed': ['badge-received','Hoàn thành'],
    };
    const [cls, lbl] = statusMap2[status];
    const d = new Date(2026,2,25 - i);
    html += `<tr>
      <td><code style="color:var(--color-ice);font-size:12px">${code}</code></td>
      <td style="font-weight:500">Bản ghi mẫu số ${i+1}</td>
      <td><span class="badge ${cls}">${lbl}</span></td>
      <td style="color:var(--color-text-muted)">${d.toLocaleDateString('vi-VN')}</td>
      <td style="color:var(--color-text-muted)">${users[i % users.length]}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-secondary" onclick="showToast('Xem chi tiết','info')"><i class="fas fa-eye"></i></button>
        <button class="btn btn-sm btn-secondary" onclick="showToast('Chỉnh sửa','info')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger" onclick="showToast('Xác nhận xóa?','warning')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }
  return html;
}

// ===== 3D Warehouse HTML Structure =====
function getWarehouse3DHTML() {
  return `<div id="warehouse-3d-container">
    <!-- Loading Screen -->
    <div class="w3d-loading" id="w3d-loading">
      <div class="w3d-loading-logo"><i class="fas fa-cube"></i></div>
      <div class="w3d-loading-text">Đang khởi tạo Giám sát kho 3D v2.0</div>
      <div class="w3d-loading-sub">Thoresen Vinama Logistics — 81,500 m² · 11 Nhà kho</div>
      <div class="w3d-loading-progress">
        <div class="w3d-loading-progress-fill"></div>
      </div>
      <div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:0.05em">COLLISION-AWARE VEHICLES · DETAILED INTERIORS · ROAD NETWORK</div>
    </div>

    <!-- Main 3D Canvas -->
    <canvas id="warehouse-canvas"></canvas>

    <!-- Search Bar (top center) -->
    <div class="w3d-search-bar" id="w3d-search-bar">
      <div class="w3d-search-input-wrap">
        <i class="fas fa-search" style="color:rgba(255,255,255,0.35);font-size:13px"></i>
        <input type="text" id="w3d-search-input" placeholder="Tìm kho... (VD: WH5.1, Bulk, Clinker)" autocomplete="off"
          onkeyup="if(event.key==='Enter')w3dSearch(this.value);if(event.key==='Escape'){this.value='';w3dClearSearch();}">
        <button class="w3d-search-clear" onclick="document.getElementById('w3d-search-input').value='';w3dClearSearch()" title="Xóa tìm kiếm">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="w3d-filter-group">
        <select class="w3d-filter-select" onchange="w3dFilter('owner', this.value)" title="Lọc theo chủ kho">
          <option value="all">Tất cả chủ kho</option>
          <option value="TVL">TVL</option>
          <option value="Partner A">Partner A</option>
          <option value="Partner B">Partner B</option>
        </select>
        <select class="w3d-filter-select" onchange="w3dFilter('type', this.value)" title="Lọc theo loại hàng">
          <option value="all">Tất cả loại hàng</option>
          <option value="Bulk">Bulk / Hàng rời</option>
          <option value="Bagged">Bagged / Hàng bao</option>
          <option value="Clinker">Clinker</option>
          <option value="Container">Container</option>
          <option value="Pallet">Pallet</option>
          <option value="VAS">VAS</option>
          <option value="Jumbo">Jumbo Bag</option>
        </select>
        <select class="w3d-filter-select" onchange="w3dFilter('usage', this.value)" title="Lọc theo mức sử dụng">
          <option value="all">Tất cả mức</option>
          <option value="low">Thấp (&lt;50%)</option>
          <option value="medium">TB (50-80%)</option>
          <option value="high">Cao (&gt;80%)</option>
        </select>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="w3d-toolbar" id="w3d-toolbar">
      <button class="w3d-btn active" id="btn-overview" onclick="w3dSetCamera('overview')" title="Tổng quan [1]">
        <i class="fas fa-globe"></i> <span class="w3d-btn-label">Tổng quan</span>
      </button>
      <button class="w3d-btn" id="btn-topdown" onclick="w3dSetCamera('topdown')" title="Trên cao [2]">
        <i class="fas fa-arrows-alt"></i> <span class="w3d-btn-label">Trên cao</span>
      </button>
      <button class="w3d-btn" id="btn-flythrough" onclick="w3dSetCamera('flythrough')" title="Bay qua [3]">
        <i class="fas fa-fighter-jet"></i> <span class="w3d-btn-label">Bay qua</span>
      </button>
      <button class="w3d-btn" id="btn-free" onclick="w3dSetCamera('free')" title="Tự do WASD [4]">
        <i class="fas fa-eye"></i> <span class="w3d-btn-label">Tự do</span>
      </button>
      <div class="w3d-toolbar-divider"></div>
      <button class="w3d-btn" id="btn-heatmap" onclick="w3dToggleHeatmap()" title="Heatmap [H]">
        <i class="fas fa-fire"></i> <span class="w3d-btn-label">Heatmap</span>
      </button>
      <button class="w3d-btn" id="btn-daynight" onclick="w3dToggleDayNight()" title="Ngày/Đêm [N]">
        <i class="fas fa-sun"></i> <span class="w3d-btn-label">Ngày/Đêm</span>
      </button>
      <button class="w3d-btn" id="btn-effects" onclick="w3dToggleEffects()" title="Hiệu ứng">
        <i class="fas fa-magic"></i> <span class="w3d-btn-label">Hiệu ứng</span>
      </button>
      <div class="w3d-toolbar-divider"></div>
      <button class="w3d-btn w3d-btn-4d" id="btn-4d-mode" onclick="w3dToggle4DMode()" title="Chế độ 4D — Mô phỏng nhập/xuất hàng">
        <i class="fas fa-shipping-fast"></i> <span class="w3d-btn-label">4D</span>
      </button>
      <div class="w3d-toolbar-divider"></div>
      <button class="w3d-btn" onclick="w3dResetCamera()" title="Reset camera">
        <i class="fas fa-home"></i>
      </button>
      <button class="w3d-btn" onclick="w3dToggleFullscreen()" title="Toàn màn hình [F]">
        <i class="fas fa-expand"></i>
      </button>
    </div>

    <!-- Keyboard Shortcuts Hint -->
    <div class="w3d-shortcuts-hint" id="w3d-shortcuts-hint">
      <span>Phím tắt: <b>1-4</b> Camera · <b>H</b> Heatmap · <b>N</b> Đêm · <b>F</b> Fullscreen · <b>WASD</b> Di chuyển · <b>Dbl-click</b> Chi tiết</span>
    </div>

    <!-- FPS Counter -->
    <div class="w3d-fps" id="w3d-fps">FPS: --</div>

    <!-- Left Panel — System Info -->
    <div class="w3d-panel-left" id="w3d-panel-left">
      <div class="w3d-panel-title"><i class="fas fa-warehouse"></i> GIÁM SÁT KHO 3D <span style="font-size:9px;background:#38bdf8;color:#000;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:800">v2.0</span></div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Tổng diện tích</span>
        <span class="w3d-stat-value">81,500 m²</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Nhà kho</span>
        <span class="w3d-stat-value">11 / 11 active</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Tổng tồn kho</span>
        <span class="w3d-stat-value" id="w3d-total-stock">45,230 tấn</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Xe tải hoạt động</span>
        <span class="w3d-stat-value" id="w3d-trucks">5 xe</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Xe nâng hoạt động</span>
        <span class="w3d-stat-value">3 xe nâng</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Mạng lưới đường</span>
        <span class="w3d-stat-value" style="color:#10b981">5H × 7V nút</span>
      </div>
      <div class="w3d-usage-bar">
        <div class="w3d-usage-label">
          <span style="color:rgba(255,255,255,0.5);font-size:11px">Tỷ lệ sử dụng kho</span>
          <span style="color:#38bdf8;font-weight:700;font-size:12px">68%</span>
        </div>
        <div class="w3d-usage-track">
          <div class="w3d-usage-fill" style="width:68%" id="w3d-usage-fill"></div>
        </div>
      </div>
      <div class="w3d-status-row">
        <div class="w3d-status-dot green"></div>
        <span style="font-size:11px;color:rgba(255,255,255,0.6)">Hệ thống bình thường</span>
      </div>
      <div class="w3d-time" id="w3d-time">--:--:--</div>
    </div>

    <!-- Right Panel — Camera Controls -->
    <div class="w3d-panel-right" id="w3d-panel-right">
      <div class="w3d-panel-title"><i class="fas fa-video"></i> CAMERA</div>
      <div class="w3d-radio-group">
        <label class="w3d-radio active" id="radio-overview" onclick="w3dSetCamera('overview')">
          <div class="w3d-radio-indicator"></div>
          <i class="fas fa-globe" style="font-size:11px"></i>
          <span>Tổng quan</span>
        </label>
        <label class="w3d-radio" id="radio-topdown" onclick="w3dSetCamera('topdown')">
          <div class="w3d-radio-indicator"></div>
          <i class="fas fa-arrows-alt" style="font-size:11px"></i>
          <span>Trên cao</span>
        </label>
        <label class="w3d-radio" id="radio-flythrough" onclick="w3dSetCamera('flythrough')">
          <div class="w3d-radio-indicator"></div>
          <i class="fas fa-fighter-jet" style="font-size:11px"></i>
          <span>Bay qua</span>
        </label>
        <label class="w3d-radio" id="radio-free" onclick="w3dSetCamera('free')">
          <div class="w3d-radio-indicator"></div>
          <i class="fas fa-eye" style="font-size:11px"></i>
          <span>Tự do (WASD)</span>
        </label>
      </div>
      <div class="w3d-settings-sep">
        <div class="w3d-settings-title">Cài đặt hiển thị</div>
        <div class="w3d-toggle-row">
          <span>Nhãn kho</span>
          <button class="w3d-toggle on" id="toggle-labels" onclick="w3dToggleSetting(this,'labels')"></button>
        </div>
        <div class="w3d-toggle-row">
          <span>Xe cộ</span>
          <button class="w3d-toggle on" id="toggle-vehicles" onclick="w3dToggleSetting(this,'vehicles')"></button>
        </div>
        <div class="w3d-toggle-row">
          <span>Lưới nền</span>
          <button class="w3d-toggle on" id="toggle-grid" onclick="w3dToggleSetting(this,'grid')"></button>
        </div>
        <div class="w3d-toggle-row">
          <span>Sương mù</span>
          <button class="w3d-toggle on" id="toggle-fog" onclick="w3dToggleSetting(this,'fog')"></button>
        </div>
        <div class="w3d-toggle-row">
          <span>Bóng đổ</span>
          <button class="w3d-toggle on" id="toggle-shadows" onclick="w3dToggleSetting(this,'shadows')"></button>
        </div>
        <div class="w3d-toggle-row">
          <span>Mái kho</span>
          <button class="w3d-toggle on" id="toggle-roofs" onclick="w3dToggleSetting(this,'roofs')"></button>
        </div>
      </div>
    </div>

    <!-- Warehouse Hover Panel -->
    <div class="w3d-wh-panel" id="w3d-wh-panel">
      <div class="w3d-wh-name" id="wh-panel-name">WH5.1</div>
      <div class="w3d-wh-code" id="wh-panel-code">WH5.1 — Kho 5.1</div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Diện tích</span>
        <span class="w3d-stat-value" id="wh-panel-area">8,000 m²</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Tổng tồn kho</span>
        <span class="w3d-stat-value" id="wh-panel-stock">—</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Loại hàng</span>
        <span class="w3d-stat-value" id="wh-panel-type" style="color:#a78bfa">—</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Sử dụng</span>
        <span class="w3d-stat-value" id="wh-panel-fill" style="color:#38bdf8">—</span>
      </div>
      <div class="w3d-usage-bar" style="margin-top:8px;margin-bottom:10px">
        <div class="w3d-usage-track">
          <div class="w3d-usage-fill" id="wh-panel-bar" style="width:0%"></div>
        </div>
      </div>
      <div class="w3d-wh-items" id="wh-panel-items"></div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Nhiệt độ</span>
        <span class="w3d-stat-value" id="wh-panel-temp">28°C</span>
      </div>
      <div class="w3d-stat-row">
        <span class="w3d-stat-label">Độ ẩm</span>
        <span class="w3d-stat-value" id="wh-panel-humid">65%</span>
      </div>
      <div class="w3d-wh-actions">
        <button class="w3d-wh-action-btn primary" onclick="w3dShowWhModal()"><i class="fas fa-chart-bar"></i> Chi tiết</button>
        <button class="w3d-wh-action-btn secondary" onclick="w3dFocusWarehouse()"><i class="fas fa-search-plus"></i> Zoom</button>
      </div>
    </div>

    <!-- Legend -->
    <div class="w3d-legend" id="w3d-legend">
      <div class="w3d-legend-title">Heatmap mật độ</div>
      <div class="w3d-legend-item"><div class="w3d-legend-color" style="background:#10b981"></div>0–30% (Trống)</div>
      <div class="w3d-legend-item"><div class="w3d-legend-color" style="background:#3b82f6"></div>31–60% (Trung bình)</div>
      <div class="w3d-legend-item"><div class="w3d-legend-color" style="background:#f59e0b"></div>61–80% (Gần đầy)</div>
      <div class="w3d-legend-item"><div class="w3d-legend-color" style="background:#f97316"></div>81–95% (Đầy)</div>
      <div class="w3d-legend-item"><div class="w3d-legend-color" style="background:#ef4444"></div>96–100% (Quá tải)</div>
    </div>

    <!-- Mini Map -->
    <div class="w3d-minimap" id="w3d-minimap" onclick="w3dResetCamera()">
      <canvas id="minimap-canvas" width="200" height="140"></canvas>
      <div class="w3d-minimap-label">MINI MAP</div>
    </div>

    <!-- Warehouse Detail Panel (slide-in on click) -->
    <div class="w3d-detail-panel" id="w3d-detail-panel">
      <!-- Content populated by w3dOpenWhDetail() -->
    </div>

    <!-- 4D Mode Indicator -->
    <div class="w3d-4d-indicator" id="w3d-4d-indicator">
      <div class="w3d-4d-dot"></div>
      <span>4D MODE</span>
      <span class="w3d-4d-desc">Mô phỏng nhập/xuất hàng thời gian thực</span>
    </div>

    <!-- Activity Ticker -->
    <div class="w3d-ticker">
      <div class="w3d-ticker-live">
        <div class="w3d-live-dot"></div>
        <span>LIVE</span>
      </div>
      <div class="w3d-ticker-track">
        <div class="w3d-ticker-inner" id="w3d-ticker">
          <div class="w3d-ticker-item green">
            <span class="ticker-time">14:32</span>
            <i class="fas fa-arrow-circle-down"></i>
            <span class="ticker-tag">NHẬP:</span>
            <span>Xe 51C-123.45 cân vào WH5.2 — Gross: 38.5T</span>
          </div>
          <div class="w3d-ticker-item blue">
            <span class="ticker-time">14:28</span>
            <i class="fas fa-check-circle"></i>
            <span class="ticker-tag">NHẬN:</span>
            <span>Phiếu RC-2026-0342 hoàn tất WH5.1 — Net: 25.3T</span>
          </div>
          <div class="w3d-ticker-item yellow">
            <span class="ticker-time">14:25</span>
            <i class="fas fa-arrow-circle-up"></i>
            <span class="ticker-tag">XUẤT:</span>
            <span>Phiếu SH-2026-0217 đang xếp hàng WH5.4</span>
          </div>
          <div class="w3d-ticker-item green">
            <span class="ticker-time">14:20</span>
            <i class="fas fa-random"></i>
            <span class="ticker-tag">DI CHUYỂN:</span>
            <span>Xe nâng FK-03 Zone A→B WH5.4</span>
          </div>
          <div class="w3d-ticker-item red">
            <span class="ticker-time">14:15</span>
            <i class="fas fa-exclamation-triangle"></i>
            <span class="ticker-tag">CẢNH BÁO:</span>
            <span>WH5.7 đạt 95% công suất — Cần xem xét</span>
          </div>
          <div class="w3d-ticker-item blue">
            <span class="ticker-time">14:10</span>
            <i class="fas fa-weight-hanging"></i>
            <span class="ticker-tag">CÂN:</span>
            <span>WB-01 xác nhận tare 72B-456.78 = 12.8T</span>
          </div>
          <div class="w3d-ticker-item green">
            <span class="ticker-time">14:05</span>
            <i class="fas fa-truck"></i>
            <span class="ticker-tag">XE TẢI:</span>
            <span>5 xe tải trên mạng đường nội bộ — Không va chạm</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Warehouse Detail Modal (Enhanced) -->
    <div class="w3d-modal-overlay" id="w3d-modal-overlay">
      <div class="w3d-modal" id="w3d-modal">
        <div class="w3d-modal-header">
          <div>
            <div class="w3d-modal-title" id="modal-title">WH5.1 — Kho 5.1</div>
            <div class="w3d-modal-code" id="modal-code">WH5.1 · Bulk · 8,000 m²</div>
          </div>
          <button class="w3d-modal-close" onclick="w3dCloseModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="w3d-modal-grid">
          <div class="w3d-modal-stat-card">
            <label>Diện tích</label>
            <div class="val" id="modal-area">8,000 m²</div>
          </div>
          <div class="w3d-modal-stat-card">
            <label>Tổng tồn kho</label>
            <div class="val" id="modal-stock">5,230 tấn</div>
            <div class="sub" id="modal-fill-pct">78% công suất</div>
          </div>
          <div class="w3d-modal-stat-card">
            <label>Số zones</label>
            <div class="val" id="modal-zones">6</div>
          </div>
          <div class="w3d-modal-stat-card">
            <label>Loại hàng</label>
            <div class="val" style="font-size:14px" id="modal-type">Hàng rời (Bulk)</div>
          </div>
          <div class="w3d-modal-stat-card">
            <label>Chủ kho</label>
            <div class="val" style="font-size:14px" id="modal-owner">TVL</div>
          </div>
          <div class="w3d-modal-stat-card">
            <label>Nhiệt độ / Ẩm</label>
            <div class="val" style="font-size:14px"><span id="modal-temp">28°C</span> / <span id="modal-humid">65%</span></div>
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:10px;letter-spacing:0.05em">Danh sách hàng tồn kho</div>
          <div id="modal-items-grid" style="display:flex;flex-direction:column;gap:4px"></div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:10px;letter-spacing:0.05em">Tỷ lệ sử dụng theo Zone</div>
          <div class="w3d-zone-grid" id="modal-zones-grid"></div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:10px;letter-spacing:0.05em">Giao dịch gần nhất</div>
          <div id="modal-recent-trans" style="display:flex;flex-direction:column;gap:6px"></div>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" style="flex:1" onclick="w3dCloseModal();navigateTo('inbound/receipts')">
            <i class="fas fa-receipt"></i> Xem phiếu nhập
          </button>
          <button class="btn btn-secondary" style="flex:1" onclick="w3dCloseModal();navigateTo('inventory-core/on-hand')">
            <i class="fas fa-boxes"></i> Xem tồn kho
          </button>
          <button class="btn btn-secondary" onclick="w3dCloseModal()">
            <i class="fas fa-times"></i> Đóng
          </button>
        </div>
      </div>
    </div>
  </div>`;
}
