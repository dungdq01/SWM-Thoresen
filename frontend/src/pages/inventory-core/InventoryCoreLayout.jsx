import { Outlet } from 'react-router-dom'

export function InventoryCoreLayout() {
  return (
    <div className="page-section">
      <Outlet />
    </div>
  )
}
