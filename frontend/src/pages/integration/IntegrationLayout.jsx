import { Outlet } from 'react-router-dom'

export function IntegrationLayout() {
  return (
    <div className="page-section">
      <Outlet />
    </div>
  )
}
