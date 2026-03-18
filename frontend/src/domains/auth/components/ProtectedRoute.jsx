import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, requiredPermission, requiredPermissions, requiredRole }) {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission, hasRole } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ice"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/app/unauthorized" replace />
  }

  if (requiredPermissions && !hasAnyPermission(requiredPermissions)) {
    return <Navigate to="/app/unauthorized" replace />
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/app/unauthorized" replace />
  }

  return children
}
