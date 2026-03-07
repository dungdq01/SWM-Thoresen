import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Ship, Package, Warehouse, MapPin, Grid3X3, Scale, Truck, Tags } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/master-data/owners', label: 'Chủ hàng', icon: Building2 },
  { to: '/master-data/vendors', label: 'Nhà cung cấp', icon: Ship },
  { to: '/master-data/items', label: 'Mặt hàng', icon: Package },
  { to: '/master-data/warehouses', label: 'Kho', icon: Warehouse },
  { to: '/master-data/zones', label: 'Zone', icon: Grid3X3 },
  { to: '/master-data/locations', label: 'Vị trí', icon: MapPin },
  { to: '/master-data/uoms', label: 'Đơn vị tính', icon: Scale },
  { to: '/master-data/vehicle-types', label: 'Loại phương tiện', icon: Truck },
  { to: '/master-data/inventory-statuses', label: 'Trạng thái tồn kho', icon: Tags },
]

export function MasterDataLayout() {
  return (
    <div className="min-h-screen bg-navy-50/30">
      <div className="bg-white border-b border-navy-100 sticky top-0 z-20">
        <div className="px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
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
