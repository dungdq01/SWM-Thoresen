import { Outlet } from 'react-router-dom'

export function VasLayout() {
  return (
    <div className="page-section">
      <Outlet />
    </div>
  )
}
