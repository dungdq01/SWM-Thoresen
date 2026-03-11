import { useDebitNotes, useContracts, useBillingEvents } from '@domains/billing'
import { useLookupOwners } from '@domains/master-data'
import { Badge, Button, SummaryDonut, StatHighlight } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'APPROVED' || status === 'LOCKED') return 'success'
  if (status === 'REVIEWED') return 'info'
  if (status === 'DRAFT') return 'warning'
  return 'default'
}

export function BillingDashboardPage() {
  const { data: dnResponse, refetch: refetchDN } = useDebitNotes({ page: 1, limit: 100 })
  const { data: contractResponse, refetch: refetchContracts } = useContracts({ page: 1, limit: 100 })
  const { data: eventResponse, refetch: refetchEvents } = useBillingEvents({ page: 1, limit: 100 })
  const { data: owners = [] } = useLookupOwners()

  const allDebitNotes = dnResponse?.data || []
  const allContracts = contractResponse?.data || []
  const allEvents = eventResponse?.data || []
  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o]))

  const draftCount = allDebitNotes.filter(dn => dn.status === 'DRAFT').length
  const reviewedCount = allDebitNotes.filter(dn => dn.status === 'REVIEWED').length
  const approvedCount = allDebitNotes.filter(dn => dn.status === 'APPROVED').length
  const lockedCount = allDebitNotes.filter(dn => dn.status === 'LOCKED').length
  const totalRevenue = allDebitNotes.filter(dn => dn.status === 'LOCKED').reduce((sum, dn) => sum + (dn.grandTotal || 0), 0)
  const activeContracts = allContracts.filter(c => c.status === 'ACTIVE' || c.status === 'DRAFT').length
  const pendingEvents = allEvents.filter(e => e.billingStatus !== 'BILLED').length
  const recentDebitNotes = allDebitNotes.slice(0, 5)

  const handleRefresh = () => {
    refetchDN()
    refetchContracts()
    refetchEvents()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Bảng điều khiển</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Làm mới</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Trạng thái Phiếu nợ</h3>
          <SummaryDonut
            centerLabel="Tổng cộng"
            data={[
              { name: 'Nháp', value: draftCount, color: '#d97706' },
              { name: 'Đã xem xét', value: reviewedCount, color: '#0ea5e9' },
              { name: 'Đã duyệt', value: approvedCount, color: '#059669' },
              { name: 'Đã khóa', value: lockedCount, color: '#6366f1' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Doanh thu</h3>
          <StatHighlight value={`${totalRevenue.toLocaleString('vi-VN')} VND`} label="Tổng doanh thu" color="text-ice" bgColor="bg-navy-800/5" />
          <StatHighlight value={`${activeContracts}`} label="Hợp đồng hoạt động" color="text-blue-600" bgColor="bg-blue-50" />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Thống kê nhanh</h3>
          <StatHighlight value={allDebitNotes.length} label="Tổng phiếu nợ" color="text-navy-900" bgColor="bg-moon-50" />
          <StatHighlight value={pendingEvents} label="Sự kiện chờ xử lý" color="text-rose-600" bgColor="bg-rose-50" />
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-900">Phiếu nợ gần đây</h3>
        <div className="space-y-3">
          {recentDebitNotes.length === 0 && <p className="text-sm text-navy-400">Chưa có phiếu nợ</p>}
          {recentDebitNotes.map((dn) => (
            <div key={dn.id} className="flex items-center justify-between border-b border-moon-200 pb-3">
              <div>
                <p className="font-semibold text-navy-900">{dn.dnNumber}</p>
                <p className="text-xs text-navy-400">{dn.owner?.name || ownerMap[dn.ownerId]?.name || '-'} · {dn.billingPeriodStart?.split('T')[0]} → {dn.billingPeriodEnd?.split('T')[0]}</p>
              </div>
              <div className="text-right">
                <Badge variant={statusTone(dn.status)}>{dn.status}</Badge>
                <p className="text-sm font-semibold text-navy-900 mt-1">{(dn.grandTotal || 0).toLocaleString()} VND</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
