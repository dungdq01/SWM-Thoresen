import { useState } from 'react'
import { Button, Modal } from '@shared/ui'

export function InboundReceiptsPage() {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Phiếu nhập</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>Tạo phiếu nhập</Button>
          <Button variant="outline" size="sm">Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-8 text-center text-navy-400">
        <p>Phiếu nhập đang được định nghĩa lại.</p>
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo phiếu nhập"
        description="Tạo phiếu nhập khi xe đến: 1 phiếu = 1 chuyến = 1 xe."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent">Tạo phiếu</Button>
          </>
        }
      >
        <div className="space-y-4 text-navy-400 text-center py-8">
          <p>Form tạo phiếu nhập sẽ được định nghĩa tại đây.</p>
        </div>
      </Modal>
    </>
  )
}
