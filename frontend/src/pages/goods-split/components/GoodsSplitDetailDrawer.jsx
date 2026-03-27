import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useGoodsSplitById } from '@domains/goods-split'
import { Badge, Button } from '@shared/ui'
import { Check, BookOpen, X, Loader2, Split } from 'lucide-react'

const statusConfig = {
  DRAFT: { label: 'Nháp', tone: 'default' },
  CALCULATED: { label: 'Đã tính', tone: 'info' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'warning' },
  POSTED: { label: 'Đã ghi sổ', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
  PENDING: { label: 'Chờ', tone: 'default' },
  ALLOCATED: { label: 'Đã phân bổ', tone: 'info' },
}

export function GoodsSplitDetailDrawer({ splitId, isOpen, onClose, onConfirm, onPost, onCancel }) {
  const { data: split, isLoading } = useGoodsSplitById(splitId)

  const headerStatus = statusConfig[split?.status] || { label: split?.status, tone: 'default' }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[100vw] sm:max-w-lg flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800">
                  <Split className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Chi tiết phiếu chia hàng</h2>
                  <p className="text-xs text-navy-400">{split?.splitNumber || '...'}</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-ice" />
                </div>
              ) : split ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-navy-900">{split.splitNumber}</h3>
                      <Badge variant={headerStatus.tone}>{headerStatus.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <InfoItem label="Chủ hàng gốc" value={`${split.originalOwner?.ownerCode || '—'} — ${split.originalOwner?.ownerName || ''}`} />
                      <InfoItem label="Kho" value={split.warehouse?.warehouseCode || '—'} />
                      <InfoItem label="Mặt hàng" value={`${split.item?.itemCode || '—'} — ${split.item?.itemName || ''}`} />
                      <InfoItem label="Tổng SL" value={`${Number(split.totalQtyKg || 0).toLocaleString('vi-VN')} kg`} />
                      <InfoItem label="Đã phân bổ" value={`${Number(split.allocatedQty || 0).toLocaleString('vi-VN')} kg`} />
                      <InfoItem label="Chưa phân bổ" value={`${Number(split.unallocatedQty || 0).toLocaleString('vi-VN')} kg`} />
                    </div>

                    {split.notes && (
                      <div className="p-3 rounded-lg bg-navy-50/50 border border-moon-200">
                        <p className="text-xs text-navy-400 mb-1">Ghi chú</p>
                        <p className="text-sm text-navy-700">{split.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-navy-600 uppercase tracking-wide">
                      Phân bổ ({split.details?.length || 0} chủ hàng đích)
                    </h3>

                    {split.details?.map((detail, idx) => {
                      const detailCfg = statusConfig[detail.status] || { label: detail.status, tone: 'default' }
                      return (
                        <div key={detail.id} className="p-4 rounded-lg border border-moon-200 bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-ice/10 text-ice text-xs font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-navy-900">{detail.targetOwner?.ownerCode || '—'}</span>
                              <span className="text-navy-400 text-sm">{detail.targetOwner?.ownerName || ''}</span>
                            </div>
                            <Badge variant={detailCfg.tone}>{detailCfg.label}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-navy-400 text-xs">Tỉ lệ</p>
                              <p className="font-semibold text-navy-900">{Number(detail.allocationPct || 0).toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-navy-400 text-xs">Dự kiến</p>
                              <p className="font-semibold text-navy-900">{Number(detail.expectedQtyKg || 0).toLocaleString('vi-VN')} kg</p>
                            </div>
                            <div>
                              <p className="text-navy-400 text-xs">Thực tế</p>
                              <p className="font-semibold text-navy-900">
                                {detail.actualQtyKg != null ? `${Number(detail.actualQtyKg).toLocaleString('vi-VN')} kg` : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {split.transactions?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-navy-600 uppercase tracking-wide">
                        Lịch sử giao dịch ({split.transactions.length})
                      </h3>
                      {split.transactions.map((tx) => (
                        <div key={tx.id} className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-navy-900">{tx.transType}</span>
                            <span className="text-navy-400 text-xs">{new Date(tx.postedAt).toLocaleString('vi-VN')}</span>
                          </div>
                          <p className="text-navy-600">
                            {tx.fromOwnerId?.slice(0, 8)} → {tx.toOwnerId?.slice(0, 8)} | {Number(tx.qty || 0).toLocaleString('vi-VN')} kg
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-navy-400 py-12">Không tìm thấy phiếu chia hàng</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-moon-200 px-6 py-4">
              <Button variant="outline" onClick={onClose}>Đóng</Button>
              {split && ['DRAFT', 'CALCULATED'].includes(split.status) && (
                <>
                  <Button variant="outline" onClick={() => { onCancel(split.id); onClose() }}>
                    <X className="w-4 h-4 mr-1" /> Hủy
                  </Button>
                  <Button variant="accent" onClick={() => { onConfirm(split.id); onClose() }}>
                    <Check className="w-4 h-4 mr-1" /> Xác nhận
                  </Button>
                </>
              )}
              {split?.status === 'CONFIRMED' && (
                <Button variant="accent" onClick={() => { onPost(split.id); onClose() }}>
                  <BookOpen className="w-4 h-4 mr-1" /> Ghi sổ
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="text-sm font-medium text-navy-800">{value}</p>
    </div>
  )
}
