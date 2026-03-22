import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { MainLayout } from './layouts'
import { PageLoader } from '@shared/ui'
import { ProtectedRoute } from '@domains/auth'

const LoginPage = lazy(() => import('@pages/auth').then(m => ({ default: m.LoginPage })))
const UnauthorizedPage = lazy(() => import('@pages/auth').then(m => ({ default: m.UnauthorizedPage })))
const LandingPage = lazy(() => import('@pages/landing').then(m => ({ default: m.LandingPage })))
const DashboardPage = lazy(() => import('@pages/dashboard').then(m => ({ default: m.DashboardPage })))
const RolesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.RolesPage })))
const PermissionsPage = lazy(() => import('@pages/settings').then(m => ({ default: m.PermissionsPage })))
const ReasonCodesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.ReasonCodesPage })))
const NumberSequencesPage = lazy(() => import('@pages/settings').then(m => ({ default: m.NumberSequencesPage })))
const GovernancePage = lazy(() => import('@pages/settings').then(m => ({ default: m.GovernancePage })))
const LogsPage = lazy(() => import('@pages/settings').then(m => ({ default: m.LogsPage })))
const DropdownConfigPage = lazy(() => import('@pages/settings').then(m => ({ default: m.DropdownConfigPage })))
const UsersPage = lazy(() => import('@pages/settings').then(m => ({ default: m.UsersPage })))

// Master Data Pages
const MasterDataLayout = lazy(() => import('@pages/master-data').then(m => ({ default: m.MasterDataLayout })))
const OwnersPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.OwnersPage })))
const VendorsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.VendorsPage })))
const CustomersPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.CustomersPage })))
const ItemsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.ItemsPage })))
const WarehousesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.WarehousesPage })))
const WarehouseDetailPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.WarehouseDetailPage })))
const ZonesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.ZonesPage })))
const LocationsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.LocationsPage })))
const UomsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.UomsPage })))
const UomConversionsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.UomConversionsPage })))
const VehicleTypesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.VehicleTypesPage })))
const InventoryStatusesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.InventoryStatusesPage })))
const ItemGroupsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.ItemGroupsPage })))
const CarriersPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.CarriersPage })))
const VesselsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.VesselsPage })))
const OwnerSkuMappingsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.OwnerSkuMappingsPage })))
const LocationTypesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.LocationTypesPage })))
const LotsPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.LotsPage })))
const OwnerWarehouseAccessPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.OwnerWarehouseAccessPage })))
const ItemIncompatibilitiesPage = lazy(() => import('@pages/master-data').then(m => ({ default: m.ItemIncompatibilitiesPage })))

// Inventory Core Pages
const InventoryCoreLayout = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryCoreLayout })))
const InventoryOnHandPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryOnHandPage })))
const InventoryTransactionsPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryTransactionsPage })))
const InventoryHoldsPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryHoldsPage })))
const InventoryPostingWorkbenchPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.InventoryPostingWorkbenchPage })))
const InventoryReconciliationPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.ReconciliationPage })))
const InventorySnapshotBillingPage = lazy(() => import('@pages/inventory-core').then(m => ({ default: m.SnapshotBillingPage })))

// Inbound Operations Pages
const InboundOperationsLayout = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.InboundOperationsLayout })))
const InboundReceiptsPage = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.InboundReceiptsPage })))
const PurchaseOrdersPage = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.PurchaseOrdersPage })))
const InboundDocumentsPage = lazy(() => import('@pages/inbound-operations').then(m => ({ default: m.InboundDocumentsPage })))

// Outbound Operations Pages
const OutboundOperationsLayout = lazy(() => import('@pages/outbound-operations').then(m => ({ default: m.OutboundOperationsLayout })))
const OutboundShipmentsPage = lazy(() => import('@pages/outbound-operations').then(m => ({ default: m.OutboundShipmentsPage })))
const SalesOrdersPage = lazy(() => import('@pages/outbound-operations').then(m => ({ default: m.SalesOrdersPage })))
const OutboundDocumentsPage = lazy(() => import('@pages/outbound-operations').then(m => ({ default: m.OutboundDocumentsPage })))
const OutboundAllocationPage = lazy(() => import('@pages/outbound-operations').then(m => ({ default: m.OutboundAllocationPage })))
const OutboundWeighingPage = lazy(() => import('@pages/outbound-operations').then(m => ({ default: m.OutboundWeighingPage })))
const OutboundApprovalsPage = lazy(() => import('@pages/outbound-operations').then(m => ({ default: m.OutboundApprovalsPage })))

// Inventory Control Pages
const InventoryControlLayout = lazy(() => import('@pages/inventory-control').then(m => ({ default: m.InventoryControlLayout })))
const MoveOrdersPage = lazy(() => import('@pages/inventory-control').then(m => ({ default: m.MoveOrdersPage })))
const TransferOrdersPage = lazy(() => import('@pages/inventory-control').then(m => ({ default: m.TransferOrdersPage })))
const StatusChangePage = lazy(() => import('@pages/inventory-control').then(m => ({ default: m.StatusChangePage })))
const CycleCountPage = lazy(() => import('@pages/inventory-control').then(m => ({ default: m.CycleCountPage })))
const AdjustmentsPage = lazy(() => import('@pages/inventory-control').then(m => ({ default: m.AdjustmentsPage })))
const MovementHistoryPage = lazy(() => import('@pages/inventory-control').then(m => ({ default: m.MovementHistoryPage })))

// Work Execution Pages
const WorkExecutionLayout = lazy(() => import('@pages/work-execution').then(m => ({ default: m.WorkExecutionLayout })))
const WorkQueuePage = lazy(() => import('@pages/work-execution').then(m => ({ default: m.WorkQueuePage })))
const MyWorkPage = lazy(() => import('@pages/work-execution').then(m => ({ default: m.MyWorkPage })))
const WorkExecutePage = lazy(() => import('@pages/work-execution').then(m => ({ default: m.WorkExecutePage })))
const WorkMonitorPage = lazy(() => import('@pages/work-execution').then(m => ({ default: m.WorkMonitorPage })))

// Integration Pages
const IntegrationLayout = lazy(() => import('@pages/integration').then(m => ({ default: m.IntegrationLayout })))
const MonitoringPage = lazy(() => import('@pages/integration').then(m => ({ default: m.MonitoringPage })))
const IntegrationAlertsPage = lazy(() => import('@pages/integration').then(m => ({ default: m.AlertsPage })))
const WeighbridgePage = lazy(() => import('@pages/integration').then(m => ({ default: m.WeighbridgePage })))
const ChannelsPage = lazy(() => import('@pages/integration').then(m => ({ default: m.ChannelsPage })))
const OcrPage = lazy(() => import('@pages/integration').then(m => ({ default: m.OcrPage })))
const OcrDetailPage = lazy(() => import('@pages/integration').then(m => ({ default: m.OcrDetailPage })))

// VAS Pages
const VasLayout = lazy(() => import('@pages/vas').then(m => ({ default: m.VasLayout })))
const VasWorkOrdersPage = lazy(() => import('@pages/vas').then(m => ({ default: m.VasWorkOrdersPage })))
const VasExecutionPage = lazy(() => import('@pages/vas').then(m => ({ default: m.VasExecutionPage })))
const VasDashboardPage = lazy(() => import('@pages/vas').then(m => ({ default: m.VasDashboardPage })))

// Billing Pages
const BillingLayout = lazy(() => import('@pages/billing').then(m => ({ default: m.BillingLayout })))
const InvoicesPage = lazy(() => import('@pages/billing').then(m => ({ default: m.InvoicesPage })))
const RateCardsPage = lazy(() => import('@pages/billing').then(m => ({ default: m.RateCardsPage })))
const BillableEventsPage = lazy(() => import('@pages/billing').then(m => ({ default: m.BillableEventsPage })))
const BillingDashboardPage = lazy(() => import('@pages/billing').then(m => ({ default: m.BillingDashboardPage })))

// Reporting Pages
const ReportingLayout = lazy(() => import('@pages/reporting').then(m => ({ default: m.ReportingLayout })))
const ReportingDashboardPage = lazy(() => import('@pages/reporting').then(m => ({ default: m.ReportingDashboardPage })))
const InventoryReportPage = lazy(() => import('@pages/reporting').then(m => ({ default: m.InventoryReportPage })))
const BillingReportPage = lazy(() => import('@pages/reporting').then(m => ({ default: m.BillingReportPage })))
const AuditTrailPage = lazy(() => import('@pages/reporting').then(m => ({ default: m.AuditTrailPage })))
const ReconciliationPage = lazy(() => import('@pages/reporting').then(m => ({ default: m.ReconciliationPage })))
const GoLiveChecklistPage = lazy(() => import('@pages/reporting').then(m => ({ default: m.GoLiveChecklistPage })))

// Goods Split
const GoodsSplitPage = lazy(() => import('@pages/goods-split').then(m => ({ default: m.GoodsSplitPage })))

// Warehouse Monitoring
const WarehouseMonitoringPage = lazy(() => import('@pages/warehouse-monitoring').then(m => ({ default: m.WarehouseMonitoringPage })))

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
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/app/unauthorized',
    element: withSuspense(UnauthorizedPage),
  },
  // Authenticated routes - với MainLayout
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withSuspense(DashboardPage),
      },
      // Warehouse Monitoring
      {
        path: 'warehouse-monitoring',
        element: withSuspense(WarehouseMonitoringPage),
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
          {
            path: 'dropdown-config',
            element: withSuspense(DropdownConfigPage),
          },
          {
            path: 'users',
            element: withSuspense(UsersPage),
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
            path: 'reason-codes',
            element: withSuspense(ReasonCodesPage),
          },
          {
            path: 'item-groups',
            element: withSuspense(ItemGroupsPage),
          },
          {
            path: 'carriers',
            element: withSuspense(CarriersPage),
          },
          {
            path: 'vessels',
            element: withSuspense(VesselsPage),
          },
          {
            path: 'owner-sku-mappings',
            element: withSuspense(OwnerSkuMappingsPage),
          },
          {
            path: 'location-types',
            element: withSuspense(LocationTypesPage),
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
            path: 'customers',
            element: withSuspense(CustomersPage),
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
            path: 'warehouses/:id',
            element: withSuspense(WarehouseDetailPage),
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
            path: 'uom-conversions',
            element: withSuspense(UomConversionsPage),
          },
          {
            path: 'vehicle-types',
            element: withSuspense(VehicleTypesPage),
          },
          {
            path: 'inventory-statuses',
            element: withSuspense(InventoryStatusesPage),
          },
          {
            path: 'lots',
            element: withSuspense(LotsPage),
          },
          {
            path: 'owner-warehouse-access',
            element: withSuspense(OwnerWarehouseAccessPage),
          },
          {
            path: 'item-incompatibilities',
            element: withSuspense(ItemIncompatibilitiesPage),
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
          {
            path: 'reconciliation',
            element: withSuspense(InventoryReconciliationPage),
          },
          {
            path: 'snapshots',
            element: withSuspense(InventorySnapshotBillingPage),
          },
        ],
      },
      {
        path: 'inbound-operations',
        element: withSuspense(InboundOperationsLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/inbound-operations/purchase-orders" replace />,
          },
          {
            path: 'purchase-orders',
            element: withSuspense(PurchaseOrdersPage),
          },
          {
            path: 'receipts',
            element: withSuspense(InboundReceiptsPage),
          },
          {
            path: 'documents',
            element: withSuspense(InboundDocumentsPage),
          },
        ],
      },
      {
        path: 'outbound-operations',
        element: withSuspense(OutboundOperationsLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/outbound-operations/sales-orders" replace />,
          },
          {
            path: 'sales-orders',
            element: withSuspense(SalesOrdersPage),
          },
          {
            path: 'shipments',
            element: withSuspense(OutboundShipmentsPage),
          },
          {
            path: 'documents',
            element: withSuspense(OutboundDocumentsPage),
          },
          {
            path: 'allocation',
            element: withSuspense(OutboundAllocationPage),
          },
          {
            path: 'weighing',
            element: withSuspense(OutboundWeighingPage),
          },
          {
            path: 'approvals',
            element: withSuspense(OutboundApprovalsPage),
          },
        ],
      },
      {
        path: 'goods-split',
        element: withSuspense(GoodsSplitPage),
      },
      {
        path: 'inventory-control',
        element: withSuspense(InventoryControlLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/inventory-control/move-orders" replace />,
          },
          {
            path: 'move-orders',
            element: withSuspense(MoveOrdersPage),
          },
          {
            path: 'transfers',
            element: withSuspense(TransferOrdersPage),
          },
          {
            path: 'status-change',
            element: withSuspense(StatusChangePage),
          },
          {
            path: 'cycle-count',
            element: withSuspense(CycleCountPage),
          },
          {
            path: 'adjustments',
            element: withSuspense(AdjustmentsPage),
          },
          {
            path: 'history',
            element: withSuspense(MovementHistoryPage),
          },
        ],
      },
      {
        path: 'work-execution',
        element: withSuspense(WorkExecutionLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/work-execution/queue" replace />,
          },
          {
            path: 'queue',
            element: withSuspense(WorkQueuePage),
          },
          {
            path: 'my-work',
            element: withSuspense(MyWorkPage),
          },
          {
            path: 'execute',
            element: withSuspense(WorkExecutePage),
          },
          {
            path: 'monitor',
            element: withSuspense(WorkMonitorPage),
          },
        ],
      },
      {
        path: 'weighbridge',
        element: withSuspense(WeighbridgePage),
      },
      {
        path: 'integration',
        element: withSuspense(IntegrationLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/integration/monitoring" replace />,
          },
          {
            path: 'monitoring',
            element: withSuspense(MonitoringPage),
          },
          {
            path: 'alerts',
            element: withSuspense(IntegrationAlertsPage),
          },
          {
            path: 'channels',
            element: withSuspense(ChannelsPage),
          },
        ],
      },
      {
        path: 'ocr',
        element: withSuspense(OcrPage),
      },
      {
        path: 'ocr/:id',
        element: withSuspense(OcrDetailPage),
      },
      {
        path: 'vas',
        element: withSuspense(VasLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/vas/work-orders" replace />,
          },
          {
            path: 'work-orders',
            element: withSuspense(VasWorkOrdersPage),
          },
          {
            path: 'execution',
            element: withSuspense(VasExecutionPage),
          },
          {
            path: 'dashboard',
            element: withSuspense(VasDashboardPage),
          },
        ],
      },
      {
        path: 'billing',
        element: withSuspense(BillingLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/billing/invoices" replace />,
          },
          {
            path: 'invoices',
            element: withSuspense(InvoicesPage),
          },
          {
            path: 'rate-cards',
            element: withSuspense(RateCardsPage),
          },
          {
            path: 'events',
            element: withSuspense(BillableEventsPage),
          },
          {
            path: 'dashboard',
            element: withSuspense(BillingDashboardPage),
          },
        ],
      },
      {
        path: 'reporting',
        element: withSuspense(ReportingLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/app/reporting/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: withSuspense(ReportingDashboardPage),
          },
          {
            path: 'inventory',
            element: withSuspense(InventoryReportPage),
          },
          {
            path: 'billing',
            element: withSuspense(BillingReportPage),
          },
          {
            path: 'audit',
            element: withSuspense(AuditTrailPage),
          },
          {
            path: 'reconciliation',
            element: withSuspense(ReconciliationPage),
          },
          {
            path: 'go-live',
            element: withSuspense(GoLiveChecklistPage),
          },
        ],
      },
    ],
  },
])
