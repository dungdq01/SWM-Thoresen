import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Database, Package, MapPin, Scale, Ship, Tags, Truck, Warehouse, Grid3X3 } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/master-data/owners', label: 'Owners', icon: Building2 },
  { to: '/app/master-data/vendors', label: 'Vendors', icon: Ship },
  { to: '/app/master-data/items', label: 'Items', icon: Package },
  { to: '/app/master-data/warehouses', label: 'Warehouses', icon: Warehouse },
  { to: '/app/master-data/zones', label: 'Zones', icon: Grid3X3 },
  { to: '/app/master-data/locations', label: 'Locations', icon: MapPin },
  { to: '/app/master-data/uoms', label: 'UoMs', icon: Scale },
  { to: '/app/master-data/vehicle-types', label: 'Vehicle Types', icon: Truck },
  { to: '/app/master-data/inventory-statuses', label: 'Inventory Statuses', icon: Tags },
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
            <h2 className="module-nav-title">Master Data Navigation</h2>
            <p className="module-nav-description">Select a data category to manage within this module.</p>
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
