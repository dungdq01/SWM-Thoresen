import { Outlet } from 'react-router-dom'

export function OutboundOperationsLayout() {
  return (
    <div className="page-section">
      <Outlet />
    </div>
  )
}
