import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Database, LayoutGrid, Link2, Package, MapPin, Scale, Ship, Tags, Truck, Warehouse, Grid3X3, Users, ArrowRightLeft, FileText, Layers, Boxes, ShieldAlert, KeyRound } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navGroups = [
  {
    label: 'Đối tác & Hàng hóa',
    items: [
      { to: '/app/master-data/owners', label: 'Chủ hàng', icon: Building2 },
      { to: '/app/master-data/vendors', label: 'Nhà cung cấp', icon: Ship },
      { to: '/app/master-data/customers', label: 'Khách hàng', icon: Users },
      { to: '/app/master-data/item-groups', label: 'Nhóm hàng hóa', icon: Layers },
      { to: '/app/master-data/carriers', label: 'Nhà vận chuyển', icon: Truck },
      { to: '/app/master-data/vessels', label: 'Tên tàu', icon: Ship },
      { to: '/app/master-data/items', label: 'Mặt hàng', icon: Package },
      { to: '/app/master-data/lots', label: 'Lô hàng', icon: Boxes },
    ],
  },
  {
    label: 'Kho & Vị trí',
    items: [
      { to: '/app/master-data/warehouses', label: 'Kho', icon: Warehouse },
      { to: '/app/master-data/zones', label: 'Zone', icon: Grid3X3 },
      { to: '/app/master-data/locations', label: 'Vị trí', icon: MapPin },
      { to: '/app/master-data/owner-sku-mappings', label: 'Mapping Owner-SKU', icon: Link2 },
      { to: '/app/master-data/owner-warehouse-access', label: 'Phân kho Owner', icon: KeyRound },
      { to: '/app/master-data/item-incompatibilities', label: 'Không tương thích', icon: ShieldAlert },
    ],
  },
  {
    label: 'Cấu hình',
    items: [
      { to: '/app/master-data/uoms', label: 'Đơn vị tính', icon: Scale },
      { to: '/app/master-data/uom-conversions', label: 'Quy đổi ĐVT', icon: ArrowRightLeft },
      { to: '/app/master-data/inventory-statuses', label: 'Trạng thái tồn kho', icon: Tags },
      { to: '/app/master-data/vehicle-types', label: 'Loại phương tiện', icon: Truck },
      { to: '/app/master-data/location-types', label: 'Loại vị trí', icon: LayoutGrid },
      { to: '/app/master-data/reason-codes', label: 'Mã lý do', icon: FileText },
    ],
  },
]

export function MasterDataLayout() {
  return (
    <div className="page-section">
      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon"><Database className="h-4 w-4" /></div>
          <h1 className="module-nav-title">Dữ liệu nền</h1>
        </div>
        <nav className="flex flex-col gap-0">
          {navGroups.map((group, i) => (
            <div key={group.label}>
              {i > 0 && <div className="border-t border-moon-100/10 mx-0" />}
              <div className="module-nav-list">
                <span className="px-2 text-xs font-semibold text-moon-100/40 whitespace-nowrap">{group.label}</span>
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => cn('module-nav-item', isActive ? 'module-nav-item-active' : '')}
                  >
                    <item.icon className="h-4 w-4" />{item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
