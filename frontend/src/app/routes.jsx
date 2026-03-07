import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { SettingsAppLayout } from './layouts'
import { PageLoader } from '@shared/ui'

const LandingPage = lazy(() => import('@pages/landing').then(m => ({ default: m.LandingPage })))
const RolesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.RolesPage })))
const PermissionsPage = lazy(() => import('@pages/settings').then(m => ({ default: m.PermissionsPage })))
const ReasonCodesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.ReasonCodesPage })))
const NumberSequencesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.NumberSequencesPage })))
const GovernancePage = lazy(() => import('@pages/settings').then(m => ({ default: m.GovernancePage })))
const LogsPage = lazy(() => import('@pages/settings').then(m => ({ default: m.LogsPage })))

const withSuspense = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: withSuspense(LandingPage),
  },
  {
    path: '/settings',
    element: <SettingsAppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/settings/roles" replace />,
      },
      {
        path: 'roles',
        element: withSuspense(RolesPage),
      },
      {
        path: 'permissions',
        element: withSuspense(PermissionsPage),
      },
      {
        path: 'reason-codes',
        element: withSuspense(ReasonCodesPage),
      },
      {
        path: 'number-sequences',
        element: withSuspense(NumberSequencesPage),
      },
      {
        path: 'governance',
        element: withSuspense(GovernancePage),
      },
      {
        path: 'logs',
        element: withSuspense(LogsPage),
      },
    ],
  },
])
