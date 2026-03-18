import { Suspense } from 'react'
import { PageLoader } from '@shared/ui'
import { ProtectedRoute } from '@domains/auth'

export const withSuspense = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

export const withPermission = (Component, permission) => (
  <ProtectedRoute requiredPermission={permission}>
    {withSuspense(Component)}
  </ProtectedRoute>
)

export const withPermissions = (Component, permissions) => (
  <ProtectedRoute requiredPermissions={permissions}>
    {withSuspense(Component)}
  </ProtectedRoute>
)

export const withRole = (Component, role) => (
  <ProtectedRoute requiredRole={role}>
    {withSuspense(Component)}
  </ProtectedRoute>
)
