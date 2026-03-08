import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { MainLayout } from './layouts'
import { PageLoader } from '@shared/ui'

const LandingPage = lazy(() => import('@pages/landing').then(m => ({ default: m.LandingPage })))
const DashboardPage = lazy(() => import('@pages/dashboard').then(m => ({ default: m.DashboardPage })))
const RolesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.RolesPage })))
const PermissionsPage = lazy(() => import('@pages/settings').then(m => ({ default: m.PermissionsPage })))
const ReasonCodesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.ReasonCodesPage })))
const NumberSequencesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.NumberSequencesPage })))
const GovernancePage = lazy(() => import('@pages/settings').then(m => ({ default: m.GovernancePage })))
const LogsPage = lazy(() => import('@pages/settings').then(m => ({ default: m.LogsPage })))

// Master Data Pages
const MasterDataLayout = lazy(() => import('@pages/master-data').then(m => ({ default: m.MasterDataLayout })))
const OwnersPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.OwnersPage })))
const VendorsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.VendorsPage })))
const ItemsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.ItemsPage })))
const WarehousesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.WarehousesPage })))
const ZonesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.ZonesPage })))
const LocationsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.LocationsPage })))
const UomsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.UomsPage })))
const VehicleTypesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.VehicleTypesPage })))
const InventoryStatusesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.InventoryStatusesPage })))

// Inventory Core Pages
const InventoryCoreLayout = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryCoreLayout })))
const InventoryOnHandPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryOnHandPage })))
const InventoryTransactionsPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryTransactionsPage })))
const InventoryHoldsPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryHoldsPage })))
const InventoryPostingWorkbenchPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryPostingWorkbenchPage })))

// Inbound Operations Pages
const InboundOperationsLayout = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.InboundOperationsLayout })))
const InboundReceiptsPage = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.InboundReceiptsPage })))
const InboundExecutionPage = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.InboundExecutionPage })))
const InboundExceptionsPage = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.InboundExceptionsPage })))
const InboundPutawayPage = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.InboundPutawayPage })))

const withSuspense = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  // Public routes - Landing Page
  {
    path: '/',
    element: withSuspense(LandingPage),
  },
  // Authenticated routes - với MainLayout
  {
    path: '/app',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: withSuspense(DashboardPage),
      },
      // Settings routes
      {
        path: 'settings',
        children: [
          {
            index: true,
            element: <Navigate to="/app/settings/roles" replace />,
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
      // Master Data routes
      {
        path: 'master-data',
        element: withSuspense(MasterDataLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/master-data/owners" replace />,
          },
          {
            path: 'owners',
            element: withSuspense(OwnersPage),
          },
          {
            path: 'vendors',
            element: withSuspense(VendorsPage),
          },
          {
            path: 'items',
            element: withSuspense(ItemsPage),
          },
          {
            path: 'warehouses',
            element: withSuspense(WarehousesPage),
          },
          {
            path: 'zones',
            element: withSuspense(ZonesPage),
          },
          {
            path: 'locations',
            element: withSuspense(LocationsPage),
          },
          {
            path: 'uoms',
            element: withSuspense(UomsPage),
          },
          {
            path: 'vehicle-types',
            element: withSuspense(VehicleTypesPage),
          },
          {
            path: 'inventory-statuses',
            element: withSuspense(InventoryStatusesPage),
          },
        ],
      },
      {
        path: 'inventory-core',
        element: withSuspense(InventoryCoreLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/inventory-core/on-hand" replace />,
          },
          {
            path: 'on-hand',
            element: withSuspense(InventoryOnHandPage),
          },
          {
            path: 'transactions',
            element: withSuspense(InventoryTransactionsPage),
          },
          {
            path: 'holds',
            element: withSuspense(InventoryHoldsPage),
          },
          {
            path: 'workbench',
            element: withSuspense(InventoryPostingWorkbenchPage),
          },
        ],
      },
      {
        path: 'inbound-operations',
        element: withSuspense(InboundOperationsLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/inbound-operations/receipts" replace />,
          },
          {
            path: 'receipts',
            element: withSuspense(InboundReceiptsPage),
          },
          {
            path: 'execution',
            element: withSuspense(InboundExecutionPage),
          },
          {
            path: 'exceptions',
            element: withSuspense(InboundExceptionsPage),
          },
          {
            path: 'putaway',
            element: withSuspense(InboundPutawayPage),
          },
        ],
      },
    ],
  },
])
