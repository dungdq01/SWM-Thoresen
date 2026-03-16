import { Outlet } from 'react-router-dom'

export function InboundOperationsLayout() {
  return (
    <div className="page-section">
      <Outlet />
    </div>
  )
}
