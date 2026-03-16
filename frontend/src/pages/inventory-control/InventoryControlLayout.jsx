import { Outlet } from 'react-router-dom'

export function InventoryControlLayout() {
  return (
    <div className="page-section">
      <Outlet />
    </div>
  )
}
