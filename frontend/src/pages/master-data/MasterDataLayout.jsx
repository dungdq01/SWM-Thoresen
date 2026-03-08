import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Database, Package, MapPin, Scale, Ship, Tags, Truck, Warehouse, Grid3X3 } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/master-data/owners', label: 'Chủ hàng', icon: Building2 },
  { to: '/app/master-data/vendors', label: 'Nhà cung cấp', icon: Ship },
  { to: '/app/master-data/items', label: 'Mặt hàng', icon: Package },
  { to: '/app/master-data/warehouses', label: 'Kho', icon: Warehouse },
  { to: '/app/master-data/zones', label: 'Zone', icon: Grid3X3 },
  { to: '/app/master-data/locations', label: 'Vị trí', icon: MapPin },
  { to: '/app/master-data/uoms', label: 'Đơn vị tính', icon: Scale },
  { to: '/app/master-data/vehicle-types', label: 'Loại phương tiện', icon: Truck },
  { to: '/app/master-data/inventory-statuses', label: 'Trạng thái tồn kho', icon: Tags },
]

export function MasterDataLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Data Management</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="module-nav-title">Điều hướng danh mục</h2>
            <p className="module-nav-description">Chọn nhóm dữ liệu muốn quản trị trong cùng một module.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <nav className="module-nav-list">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'module-nav-item',
                    isActive
                      ? 'module-nav-item-active'
                      : ''
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <Outlet />
    </div>
  )
}
