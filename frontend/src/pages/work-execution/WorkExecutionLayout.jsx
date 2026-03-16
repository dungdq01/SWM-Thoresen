import { Outlet } from 'react-router-dom'

export function WorkExecutionLayout() {
  return (
    <div className="page-section">
      <Outlet />
    </div>
  )
}
