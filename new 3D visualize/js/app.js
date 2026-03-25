/* ===================================================
   SWM TVL — App Core (Routing, Navigation, Auth)
   =================================================== */

// ---- State ----
let currentRoute = '';
let sidebarCollapsed = false;
let currentTheme = localStorage.getItem('swm-theme') || 'dark';

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);
  initLandingCanvas();
  initAnimatedCounters();

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // Hash-based routing
  window.addEventListener('hashchange', handleRouteChange);

  // Check if already logged in
  if (sessionStorage.getItem('swm-logged-in')) {
    showApp();
    const hash = window.location.hash.replace('#/', '');
    navigateTo(hash || 'dashboard');
  }
});

// ---- Theme ----
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('swm-theme', theme);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// ---- Auth ----
function showLogin() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  setTimeout(() => initLoginCanvas(), 100);
}

function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-login');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
  btn.disabled = true;

  setTimeout(() => {
    sessionStorage.setItem('swm-logged-in', 'true');
    showApp();
    navigateTo('dashboard');
    showToast('Đăng nhập thành công! Chào mừng Admin TVL', 'success');
  }, 1200);
}

function showApp() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function showLogout() {
  if (confirm('Bạn có muốn đăng xuất không?')) {
    sessionStorage.removeItem('swm-logged-in');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
    window.location.hash = '';
    showToast('Đã đăng xuất thành công', 'info');
  }
}

function togglePassword() {
  const input = document.getElementById('password');
  const eye = document.getElementById('pw-eye');
  if (input.type === 'password') {
    input.type = 'text';
    eye.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    eye.className = 'fas fa-eye';
  }
}

function setDemo(u, p) {
  document.getElementById('username').value = u;
  document.getElementById('password').value = p;
}

// ---- Navigation ----
function navigateTo(route) {
  currentRoute = route;
  window.location.hash = '/' + route;

  // Update active state in sidebar
  document.querySelectorAll('.nav-item, .nav-sub-item').forEach(el => el.classList.remove('active'));

  // Find matching nav item
  const allNavItems = document.querySelectorAll('[onclick*="navigateTo"]');
  allNavItems.forEach(el => {
    const onclickVal = el.getAttribute('onclick') || '';
    if (onclickVal.includes(`'${route}'`) || onclickVal.includes(`"${route}"`)) {
      el.classList.add('active');
      // Open parent group
      const group = el.closest('.nav-group');
      if (group && !group.classList.contains('open')) {
        group.classList.add('open');
      }
    }
  });

  // Update breadcrumb
  updateBreadcrumb(route);

  // Render page content
  renderPage(route);
}

function handleRouteChange() {
  const route = window.location.hash.replace('#/', '');
  if (route && sessionStorage.getItem('swm-logged-in')) {
    renderPage(route);
  }
}

function updateBreadcrumb(route) {
  const breadcrumb = document.getElementById('breadcrumb');
  if (!breadcrumb) return;

  const parts = route.split('/');
  const labels = {
    'dashboard': 'Tổng quan',
    'warehouse-monitoring': 'Giám sát kho 3D',
    'settings': 'Cài đặt',
    'users': 'Người dùng',
    'roles': 'Vai trò',
    'permissions': 'Quyền hạn',
    'number-sequences': 'Chuỗi số',
    'governance': 'Business Rules',
    'logs': 'Audit Logs',
    'master-data': 'Dữ liệu nền tảng',
    'owners': 'Chủ hàng',
    'vendors': 'Nhà cung cấp',
    'customers': 'Khách hàng',
    'items': 'Hàng hóa',
    'warehouses': 'Nhà kho',
    'zones': 'Khu vực',
    'locations': 'Vị trí',
    'vessels': 'Tàu',
    'lots': 'Lô hàng',
    'inbound': 'Nhập kho',
    'purchase-orders': 'Đơn mua hàng',
    'receipts': 'Phiếu nhập kho',
    'unloading': 'Dỡ hàng',
    'documents': 'Chứng từ',
    'outbound': 'Xuất kho',
    'sales-orders': 'Đơn bán hàng',
    'shipments': 'Phiếu xuất kho',
    'loading': 'Xếp hàng',
    'goods-split': 'Chia hàng đổi chủ',
    'inventory-core': 'Tồn kho',
    'on-hand': 'Tồn kho hiện tại',
    'transactions': 'Giao dịch',
    'holds': 'Hàng bị giữ',
    'reconciliation': 'Đối soát',
    'snapshots': 'Snapshots',
    'inventory-control': 'Kiểm soát kho',
    'move-orders': 'Lệnh di chuyển',
    'transfers': 'Chuyển kho',
    'cycle-count': 'Kiểm kê',
    'adjustments': 'Điều chỉnh',
    'work-execution': 'Thực thi công việc',
    'queue': 'Hàng đợi',
    'my-work': 'Việc của tôi',
    'monitor': 'Giám sát',
    'weighbridge': 'Trạm cân',
    'integration': 'Tích hợp',
    'monitoring': 'Giám sát kết nối',
    'alerts': 'Cảnh báo',
    'ocr': 'OCR Phiếu cân',
    'vas': 'VAS / Đóng bao',
    'work-orders': 'Lệnh VAS',
    'execution': 'Thực thi',
    'billing': 'Billing',
    'invoices': 'Debit Notes',
    'rate-cards': 'Biểu phí',
    'events': 'Sự kiện',
    'reporting': 'Báo cáo',
    'inventory': 'Báo cáo tồn kho',
    'audit': 'Audit Trail',
    'go-live': 'Go-Live Checklist',
  };

  let html = '';
  let pathSoFar = '';
  parts.forEach((part, i) => {
    pathSoFar += (i > 0 ? '/' : '') + part;
    const label = labels[part] || part;
    if (i === parts.length - 1) {
      html += `<span class="bc-current">${label}</span>`;
    } else {
      html += `<span class="bc-item" style="cursor:pointer" onclick="navigateTo('${pathSoFar}')">${label}</span>`;
      html += `<span class="bc-sep"><i class="fas fa-chevron-right" style="font-size:9px"></i></span>`;
    }
  });
  breadcrumb.innerHTML = html;
}

// ---- Sidebar ----
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const chevron = document.getElementById('sidebar-chevron');
  sidebarCollapsed = !sidebarCollapsed;
  sidebar.classList.toggle('collapsed', sidebarCollapsed);
  chevron.classList.toggle('rotated', !sidebarCollapsed);
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('mobile-open');
}

function toggleNavGroup(header) {
  const group = header.closest('.nav-group');
  group.classList.toggle('open');
}

// ---- Command Palette ----
const COMMAND_ITEMS = [
  { route: 'dashboard', label: 'Tổng quan', icon: 'fas fa-tachometer-alt', group: 'Chính' },
  { route: 'warehouse-monitoring', label: 'Giám sát kho 3D', icon: 'fas fa-cube', group: 'Chính' },
  { route: 'settings/users', label: 'Người dùng', icon: 'fas fa-users', group: 'Cài đặt' },
  { route: 'settings/roles', label: 'Vai trò', icon: 'fas fa-user-tag', group: 'Cài đặt' },
  { route: 'settings/permissions', label: 'Quyền hạn', icon: 'fas fa-key', group: 'Cài đặt' },
  { route: 'settings/logs', label: 'Audit Logs', icon: 'fas fa-list-alt', group: 'Cài đặt' },
  { route: 'master-data/owners', label: 'Chủ hàng', icon: 'fas fa-building', group: 'Dữ liệu nền tảng' },
  { route: 'master-data/vendors', label: 'Nhà cung cấp', icon: 'fas fa-truck', group: 'Dữ liệu nền tảng' },
  { route: 'master-data/items', label: 'Hàng hóa / SKU', icon: 'fas fa-box-open', group: 'Dữ liệu nền tảng' },
  { route: 'master-data/warehouses', label: 'Nhà kho', icon: 'fas fa-warehouse', group: 'Dữ liệu nền tảng' },
  { route: 'inbound/purchase-orders', label: 'Đơn mua hàng (PO)', icon: 'fas fa-file-alt', group: 'Nhập kho' },
  { route: 'inbound/receipts', label: 'Phiếu nhập kho', icon: 'fas fa-receipt', group: 'Nhập kho' },
  { route: 'outbound/sales-orders', label: 'Đơn bán hàng (SO)', icon: 'fas fa-file-contract', group: 'Xuất kho' },
  { route: 'outbound/shipments', label: 'Phiếu xuất kho', icon: 'fas fa-shipping-fast', group: 'Xuất kho' },
  { route: 'inventory-core/on-hand', label: 'Tồn kho hiện tại', icon: 'fas fa-boxes', group: 'Tồn kho' },
  { route: 'inventory-core/transactions', label: 'Giao dịch tồn kho', icon: 'fas fa-exchange-alt', group: 'Tồn kho' },
  { route: 'weighbridge', label: 'Trạm cân', icon: 'fas fa-weight-hanging', group: 'Vận hành' },
  { route: 'ocr', label: 'OCR Phiếu cân', icon: 'fas fa-camera', group: 'Vận hành' },
  { route: 'billing/invoices', label: 'Debit Notes', icon: 'fas fa-file-invoice', group: 'Billing' },
  { route: 'billing/dashboard', label: 'Dashboard Billing', icon: 'fas fa-chart-bar', group: 'Billing' },
  { route: 'reporting/dashboard', label: 'Dashboard Báo cáo', icon: 'fas fa-tachometer-alt', group: 'Báo cáo' },
  { route: 'reporting/go-live', label: 'Go-Live Checklist', icon: 'fas fa-rocket', group: 'Báo cáo' },
  { route: 'vas/work-orders', label: 'Lệnh VAS', icon: 'fas fa-box', group: 'VAS' },
];

function openCommandPalette() {
  document.getElementById('command-palette').classList.remove('hidden');
  setTimeout(() => document.getElementById('command-input').focus(), 50);
  searchCommand('');
}

function closeCommandPalette() {
  document.getElementById('command-palette').classList.add('hidden');
  document.getElementById('command-input').value = '';
}

function searchCommand(query) {
  const q = query.toLowerCase();
  const filtered = COMMAND_ITEMS.filter(item =>
    item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
  );

  const groups = {};
  filtered.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  let html = '';
  if (filtered.length === 0) {
    html = '<div class="empty-state" style="padding:30px"><i class="fas fa-search" style="font-size:24px;margin-bottom:8px"></i><p>Không tìm thấy kết quả</p></div>';
  } else {
    Object.keys(groups).forEach(group => {
      html += `<div class="command-result-group">${group}</div>`;
      groups[group].forEach(item => {
        html += `<div class="command-result-item" onclick="navigateTo('${item.route}'); closeCommandPalette()">
          <div class="command-result-icon"><i class="${item.icon}"></i></div>
          <div class="command-result-text">
            <strong>${item.label}</strong>
            <span>${item.route}</span>
          </div>
        </div>`;
      });
    });
  }

  document.getElementById('command-results').innerHTML = html;
}

function handleKeyboard(e) {
  // Ctrl+K
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const palette = document.getElementById('command-palette');
    if (palette.classList.contains('hidden')) openCommandPalette();
    else closeCommandPalette();
  }
  // ESC
  if (e.key === 'Escape') {
    closeCommandPalette();
  }
}

// ---- Render Page ----
function renderPage(route) {
  const content = document.getElementById('page-content');

  // Stop any existing 3D rendering
  if (window.warehouse3dInstance && route !== 'warehouse-monitoring') {
    if (window.warehouse3dInstance.dispose) {
      window.warehouse3dInstance.dispose();
      window.warehouse3dInstance = null;
    }
    content.classList.remove('fullscreen-3d');
  }

  // Route matching
  if (route === 'dashboard') {
    content.innerHTML = getDashboardHTML();
    setTimeout(() => initDashboardCharts(), 100);
  } else if (route === 'warehouse-monitoring') {
    content.classList.add('fullscreen-3d');
    content.innerHTML = getWarehouse3DHTML();
    setTimeout(() => initWarehouse3D(), 200);
  } else if (typeof getModulePage === 'function') {
    const html = getModulePage(route);
    content.innerHTML = html || getNotFoundHTML(route);
  } else {
    content.innerHTML = getNotFoundHTML(route);
  }
}

function getNotFoundHTML(route) {
  return `<div class="page-container">
    <div class="empty-state" style="margin-top:60px">
      <i class="fas fa-map-signs"></i>
      <h3>Trang chưa được thiết kế</h3>
      <p>Route <code>${route}</code> đang được phát triển.</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="navigateTo('dashboard')">
        <i class="fas fa-home"></i> Về tổng quan
      </button>
    </div>
  </div>`;
}

// ---- Toast ----
function showToast(message, type = 'info') {
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type]} toast-icon"></i>
    <span class="toast-message">${message}</span>
    <i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>
  `;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 4000);
}

// ---- Notifications ----
function toggleNotifications() {
  showToast('Có 3 thông báo mới từ hệ thống', 'info');
}

// ---- Landing Canvas Animation ----
function initLandingCanvas() {
  const canvas = document.getElementById('landing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 15000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56,189,248,${p.opacity})`;
      ctx.fill();
    });

    // Draw connections
    particles.forEach((p1, i) => {
      for (let j = i + 1; j < Math.min(particles.length, i + 5); j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x, dy = p1.y - p2.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(56,189,248,${0.08 * (1 - dist/120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });

    animId = requestAnimationFrame(draw);
  }

  resize();
  createParticles();
  draw();
  window.addEventListener('resize', () => { resize(); createParticles(); });
}

function initLoginCanvas() {
  const canvas = document.getElementById('login-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.5 - 0.2,
      opacity: Math.random() * 0.4 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(129,140,248,${p.opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ---- Animated Counters ----
function initAnimatedCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  });
  counters.forEach(c => observer.observe(c));
}

function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-count'));
  const duration = 2000;
  const start = performance.now();

  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current.toLocaleString('vi-VN');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ---- Utility ----
function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString('vi-VN');
}

function formatWeight(n) {
  if (n == null) return '—';
  return n.toLocaleString('vi-VN') + ' tấn';
}

// ---- Dashboard HTML ----
function getDashboardHTML() {
  return `<div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Tổng quan hệ thống</h1>
        <p>Cập nhật lần cuối: ${new Date().toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
      </div>
      <div class="page-header-right">
        <button class="btn btn-secondary" onclick="navigateTo('warehouse-monitoring')">
          <i class="fas fa-cube"></i> Xem kho 3D
        </button>
        <button class="btn btn-primary">
          <i class="fas fa-download"></i> Xuất báo cáo
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card green">
        <div class="summary-icon green"><i class="fas fa-boxes"></i></div>
        <div class="summary-content">
          <div class="summary-value">45,230</div>
          <div class="summary-label">Tổng tồn kho (tấn)</div>
          <div class="summary-change up"><i class="fas fa-arrow-up"></i> +3.2% so với hôm qua</div>
        </div>
      </div>
      <div class="summary-card blue">
        <div class="summary-icon blue"><i class="fas fa-arrow-circle-down"></i></div>
        <div class="summary-content">
          <div class="summary-value">1,850</div>
          <div class="summary-label">Nhập kho hôm nay (tấn)</div>
          <div class="summary-change up"><i class="fas fa-arrow-up"></i> +12% so với hôm qua</div>
        </div>
      </div>
      <div class="summary-card yellow">
        <div class="summary-icon yellow"><i class="fas fa-arrow-circle-up"></i></div>
        <div class="summary-content">
          <div class="summary-value">2,100</div>
          <div class="summary-label">Xuất kho hôm nay (tấn)</div>
          <div class="summary-change down"><i class="fas fa-arrow-down"></i> -5% so với hôm qua</div>
        </div>
      </div>
      <div class="summary-card purple">
        <div class="summary-icon purple"><i class="fas fa-clock"></i></div>
        <div class="summary-content">
          <div class="summary-value">18</div>
          <div class="summary-label">Phiếu đang xử lý</div>
          <div class="summary-change"><span style="color:var(--color-text-muted)">12 nhập · 6 xuất</span></div>
        </div>
      </div>
      <div class="summary-card red">
        <div class="summary-icon red"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="summary-content">
          <div class="summary-value">3</div>
          <div class="summary-label">Cần xử lý khẩn</div>
          <div class="summary-change down"><i class="fas fa-exclamation-circle"></i> Cần xem xét ngay</div>
        </div>
      </div>
      <div class="summary-card cyan">
        <div class="summary-icon cyan"><i class="fas fa-percentage"></i></div>
        <div class="summary-content">
          <div class="summary-value">72%</div>
          <div class="summary-label">Tỷ lệ sử dụng kho</div>
          <div class="summary-change"><div class="progress-bar" style="margin-top:4px"><div class="progress-fill gradient" style="width:72%"></div></div></div>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <div class="chart-card" style="grid-column: span 2">
        <div class="chart-card-header">
          <span class="chart-card-title"><i class="fas fa-chart-line" style="color:var(--color-ice);margin-right:8px"></i>Biến động tồn kho 7 ngày qua</span>
          <select class="filter-select" style="font-size:12px">
            <option>7 ngày</option><option>30 ngày</option><option>3 tháng</option>
          </select>
        </div>
        <div class="chart-wrapper">
          <canvas id="chart-inventory-trend"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <span class="chart-card-title"><i class="fas fa-chart-bar" style="color:#f59e0b;margin-right:8px"></i>Nhập/Xuất theo ngày</span>
        </div>
        <div class="chart-wrapper">
          <canvas id="chart-in-out"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <span class="chart-card-title"><i class="fas fa-chart-pie" style="color:#8b5cf6;margin-right:8px"></i>Tỷ lệ sử dụng kho</span>
        </div>
        <div class="chart-wrapper">
          <canvas id="chart-wh-usage"></canvas>
        </div>
      </div>
    </div>

    <!-- Quick Access to 3D -->
    <div class="chart-card" style="margin-bottom:24px;background:linear-gradient(135deg,rgba(56,189,248,0.08),rgba(129,140,248,0.08));border-color:rgba(56,189,248,0.2)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px;flex-wrap:wrap;gap:16px">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:56px;height:56px;background:linear-gradient(135deg,#38bdf8,#818cf8);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff">
            <i class="fas fa-cube"></i>
          </div>
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--color-text-primary)">Giám sát kho 3D thời gian thực</div>
            <div style="font-size:13px;color:var(--color-text-muted)">Xem toàn bộ 81,500m² với visualization 3D đẳng cấp nhất</div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="navigateTo('warehouse-monitoring')" style="font-size:14px;padding:10px 24px">
          <i class="fas fa-cube"></i> Mở giao diện 3D
        </button>
      </div>
    </div>

    <!-- Recent Activities -->
    <div class="data-table-card">
      <div class="data-table-header">
        <span class="data-table-title">Phiếu nhập/xuất gần đây</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm">Nhập kho</button>
          <button class="btn btn-secondary btn-sm">Xuất kho</button>
          <button class="btn btn-secondary btn-sm"><i class="fas fa-sync-alt"></i></button>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Mã phiếu</th>
            <th>Loại</th>
            <th>Chủ hàng</th>
            <th>Hàng hóa</th>
            <th>Khối lượng</th>
            <th>Nhà kho</th>
            <th>Trạng thái</th>
            <th>Thời gian</th>
          </tr>
        </thead>
        <tbody>
          ${generateRecentActivities()}
        </tbody>
      </table>
      <div class="pagination">
        <span class="pagination-info">Hiển thị 10 / 234 phiếu</span>
        <div class="pagination-controls">
          <button class="page-btn">◀</button>
          <button class="page-btn active">1</button>
          <button class="page-btn">2</button>
          <button class="page-btn">3</button>
          <button class="page-btn">▶</button>
        </div>
      </div>
    </div>

    <!-- WH Status Grid -->
    <div style="margin-bottom:24px">
      <div class="section-title">Trạng thái các nhà kho</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        ${generateWhStatusCards()}
      </div>
    </div>
  </div>`;
}

function generateRecentActivities() {
  const data = [
    { code: 'RC-2026-0347', type: 'Nhập', owner: 'Công ty Phân bón VN', item: 'Phân bón NPK 15-15-15', qty: '250.5 tấn', wh: 'WH5.1', status: 'received', time: '14:32 hôm nay' },
    { code: 'SH-2026-0219', type: 'Xuất', owner: 'Tổng kho Miền Nam', item: 'Xi măng PCB40', qty: '180.0 tấn', wh: 'WH5.2', status: 'shipped', time: '14:15 hôm nay' },
    { code: 'RC-2026-0346', type: 'Nhập', owner: 'Công ty Clinker HCM', item: 'Clinker OPC', qty: '500.0 tấn', wh: 'WH5.3', status: 'processing', time: '13:48 hôm nay' },
    { code: 'SH-2026-0218', type: 'Xuất', owner: 'Đại lý Vĩnh Phúc', item: 'Phân DAP', qty: '75.3 tấn', wh: 'WH5.4', status: 'awaiting-weighing', time: '13:20 hôm nay' },
    { code: 'RC-2026-0345', type: 'Nhập', owner: 'Tập đoàn Nông nghiệp', item: 'Phân Ure 46%', qty: '320.8 tấn', wh: 'WH5.5.1', status: 'received', time: '12:55 hôm nay' },
    { code: 'SH-2026-0217', type: 'Xuất', owner: 'CTCP Xây dựng Đà Nẵng', item: 'Sắt thép cuộn', qty: '45.0 tấn', wh: 'WH5.6.1', status: 'shipped', time: '11:30 hôm nay' },
    { code: 'RC-2026-0344', type: 'Nhập', owner: 'Công ty Hóa chất', item: 'Lưu huỳnh bột', qty: '150.2 tấn', wh: 'WH5.2', status: 'rejected', time: '10:45 hôm nay' },
    { code: 'SH-2026-0216', type: 'Xuất', owner: 'Tổng đại lý HCM', item: 'Phân bón NPK', qty: '280.0 tấn', wh: 'WH5.1', status: 'processing', time: '10:20 hôm nay' },
  ];

  const statusMap = {
    'received': ['badge-received', 'Đã nhận'],
    'shipped': ['badge-shipped', 'Đã xuất'],
    'processing': ['badge-processing', 'Đang xử lý'],
    'awaiting-weighing': ['badge-pending', 'Chờ cân'],
    'rejected': ['badge-rejected', 'Bị từ chối'],
    'confirmed': ['badge-confirmed', 'Xác nhận'],
  };

  return data.map(row => {
    const [badgeClass, badgeLabel] = statusMap[row.status] || ['badge-draft', row.status];
    const typeClass = row.type === 'Nhập' ? 'color:#10b981' : 'color:#f59e0b';
    return `<tr>
      <td><a href="#" style="color:var(--color-ice);font-weight:600;font-family:'JetBrains Mono',monospace;font-size:12px">${row.code}</a></td>
      <td><span style="${typeClass};font-weight:600;font-size:12px">${row.type}</span></td>
      <td>${row.owner}</td>
      <td>${row.item}</td>
      <td style="font-weight:600;font-family:'JetBrains Mono',monospace">${row.qty}</td>
      <td><span style="font-size:11px;padding:2px 8px;background:rgba(56,189,248,0.1);color:#38bdf8;border-radius:4px">${row.wh}</span></td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td style="color:var(--color-text-muted)">${row.time}</td>
    </tr>`;
  }).join('');
}

function generateWhStatusCards() {
  const warehouses = [
    { code: 'WH5.1', area: 8000, fill: 78, status: 'active' },
    { code: 'WH5.2', area: 9500, fill: 65, status: 'active' },
    { code: 'WH5.3', area: 7200, fill: 82, status: 'active' },
    { code: 'WH5.4', area: 8800, fill: 45, status: 'active' },
    { code: 'WH5.5.1', area: 6500, fill: 90, status: 'warning' },
    { code: 'WH5.5.2', area: 6800, fill: 55, status: 'active' },
    { code: 'WH5.6.1', area: 7500, fill: 70, status: 'active' },
    { code: 'WH5.6.2', area: 7000, fill: 38, status: 'active' },
    { code: 'WH5.7', area: 6200, fill: 95, status: 'critical' },
    { code: 'WH5.8', area: 7500, fill: 60, status: 'active' },
    { code: 'WH5.9', area: 6500, fill: 72, status: 'active' },
  ];

  const fillColor = (f) => f >= 90 ? '#ef4444' : f >= 75 ? '#f59e0b' : f >= 50 ? '#3b82f6' : '#10b981';
  const statusDot = (s) => s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#10b981';

  return warehouses.map(wh => `
    <div class="summary-card" style="cursor:pointer" onclick="navigateTo('warehouse-monitoring')">
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;font-weight:700;color:var(--color-text-primary)">${wh.code}</span>
          <div style="width:8px;height:8px;border-radius:50%;background:${statusDot(wh.status)}"></div>
        </div>
        <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px">${wh.area.toLocaleString('vi-VN')} m²</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${wh.fill}%;background:${fillColor(wh.fill)}"></div>
        </div>
        <div style="font-size:11px;color:${fillColor(wh.fill)};margin-top:4px;font-weight:600">${wh.fill}% đã sử dụng</div>
      </div>
    </div>
  `).join('');
}
