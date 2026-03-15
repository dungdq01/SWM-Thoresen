import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Database, Package, MapPin, Scale, Ship, Tags, Truck, Warehouse, Grid3X3, Users, ArrowRightLeft } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/master-data/owners', label: 'Chủ hàng', icon: Building2 },
  { to: '/app/master-data/vendors', label: 'Nhà cung cấp', icon: Ship },
  { to: '/app/master-data/customers', label: 'Khách hàng', icon: Users },
  { to: '/app/master-data/items', label: 'Mặt hàng', icon: Package },
  { to: '/app/master-data/warehouses', label: 'Kho', icon: Warehouse },
  { to: '/app/master-data/zones', label: 'Khu vực', icon: Grid3X3 },
  { to: '/app/master-data/locations', label: 'Vị trí', icon: MapPin },
  { to: '/app/master-data/uoms', label: 'Đơn vị tính', icon: Scale },
  { to: '/app/master-data/uom-conversions', label: 'Quy đổi ĐVT', icon: ArrowRightLeft },
  { to: '/app/master-data/vehicle-types', label: 'Loại phương tiện', icon: Truck },
  { to: '/app/master-data/inventory-statuses', label: 'Trạng thái tồn kho', icon: Tags },
]

export function MasterDataLayout() {
  return (
    <div className="page-section">
      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon"><Database className="h-4 w-4" /></div>
          <h1 className="module-nav-title">Dữ liệu nền</h1>
        </div>
        <nav className="module-nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => cn('module-nav-item', isActive ? 'module-nav-item-active' : '')}
            >
              <item.icon className="h-4 w-4" />{item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
