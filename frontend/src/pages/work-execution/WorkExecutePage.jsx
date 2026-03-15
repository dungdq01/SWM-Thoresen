import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkDetail, useCompleteLine, useSkipLine, useWorkHistory, useWorkExceptions } from '@domains/work-execution'
import { Badge, Button, Input, Modal, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui'

const lineTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'SKIPPED') return 'warning'
  if (status === 'IN_PROGRESS') return 'info'
  if (status === 'CANCELLED') return 'danger'
  return 'default'
}

export function WorkExecutePage() {
  const [searchParams] = useSearchParams()
  const workId = searchParams.get('workId') || ''
  const [selectedLineId, setSelectedLineId] = useState('')
  const [actualQty, setActualQty] = useState('')
  const [scannedLocation, setScannedLocation] = useState('')

  const { data: response, refetch } = useWorkDetail(workId)
  const work = response?.data

  const { data: historyResponse } = useWorkHistory(workId)
  const history = historyResponse?.data || []

  const { data: exceptionsResponse } = useWorkExceptions(workId)
  const exceptions = exceptionsResponse?.data || []

  const completeLine = useCompleteLine()
  const skipLine = useSkipLine()
  const didAutoSelect = useRef(false)

  useEffect(() => {
    if (work?.lines?.length && !didAutoSelect.current) {
      const firstOpenLine = work.lines.find((l) => ['OPEN', 'IN_PROGRESS'].includes(l.status))
      if (firstOpenLine) {
        setSelectedLineId(firstOpenLine.id)
        setActualQty(String(firstOpenLine.expectedQty))
        didAutoSelect.current = true
      }
    }
  }, [work])

  const selectedLine = work?.lines?.find((l) => l.id === selectedLineId)

  const handleComplete = async () => {
    if (!selectedLineId) return
    const selLine = work.lines.find((l) => l.id === selectedLineId)
    await completeLine.mutateAsync({ workId: work.id, lineNum: selLine?.lineNum, data: { actualQty: Number(actualQty), scannedLocation } })
    refetch()
    setSelectedLineId('')
    setActualQty('')
    setScannedLocation('')
  }

  const handleSkip = async () => {
    if (!selectedLineId) return
    const selLine = work.lines.find((l) => l.id === selectedLineId)
    await skipLine.mutateAsync({ workId: work.id, lineNum: selLine?.lineNum, data: { reasonCode: 'OTHER' } })
    refetch()
    setSelectedLineId('')
  }

  if (!workId) {
    return (
      <div className="wrs-card p-8 text-center">
        <p className="text-navy-500">Chọn công việc từ 'Công việc của tôi' để bắt đầu thực hiện.</p>
      </div>
    )
  }

  if (!work) {
    return (
      <div className="wrs-card p-8 text-center">
        <p className="text-navy-500">Đang tải...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Thực hiện công việc: {work.workId}</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-navy-900">{work.workId}</p>
            <p className="text-xs text-navy-400">{work.workType} · Ưu tiên: {work.priority}</p>
          </div>
          <Badge variant={work.status === 'COMPLETED' ? 'success' : work.status === 'IN_PROGRESS' ? 'warning' : 'info'}>{work.status}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-3 text-sm text-navy-700">
          <p><strong>Nguồn:</strong> {work.sourceType}</p>
          <p><strong>Mã nguồn:</strong> {work.sourceId}</p>
          <p><strong>Kho:</strong> {work.warehouse?.code || work.warehouseId}</p>
          <p><strong>Chủ hàng:</strong> {work.owner?.code || work.ownerId}</p>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-900">Dòng công việc</h3>
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>STT</TableHead>
              <TableHead>Bước</TableHead>
              <TableHead>Mặt hàng</TableHead>
              <TableHead>Từ → Đến</TableHead>
              <TableHead align="right">Dự kiến</TableHead>
              <TableHead align="right">Thực tế</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {work.lines?.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.lineNum}</TableCell>
                <TableCell><Badge variant="default">{line.stepType}</Badge></TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{line.item?.code || line.itemId}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-500">{line.fromLocation?.code || line.fromLocationId || '—'}</p>
                  <p className="text-xs text-navy-500">→ {line.toLocation?.code || line.toLocationId || 'TBD'}</p>
                </TableCell>
                <TableCell align="right">{line.expectedQty?.toLocaleString()} kg</TableCell>
                <TableCell align="right">{line.actualQty?.toLocaleString() ?? '—'}</TableCell>
                <TableCell align="center"><Badge variant={lineTone(line.status)}>{line.status}</Badge></TableCell>
                <TableCell align="center">
                  {['OPEN', 'IN_PROGRESS'].includes(line.status) ? (
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedLineId(line.id); setActualQty(String(line.expectedQty)) }}>Thực hiện</Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={!!selectedLine}
        onClose={() => { setSelectedLineId(''); setActualQty(''); setScannedLocation('') }}
        title={`Thực hiện dòng ${selectedLine?.lineNum || ''}: ${selectedLine?.stepType || ''}`}
        description={selectedLine?.item?.code || selectedLine?.itemId || ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setSelectedLineId(''); setActualQty(''); setScannedLocation('') }}>Hủy</Button>
            <Button variant="outline" onClick={handleSkip} disabled={skipLine.isPending}>Bỏ qua dòng</Button>
            <Button variant="accent" onClick={handleComplete} disabled={completeLine.isPending}>Hoàn thành dòng</Button>
          </>
        }
      >
        {selectedLine && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ice/30 bg-ice/5 p-4 grid grid-cols-2 gap-2 text-sm">
              <p><strong>Dự kiến:</strong> {selectedLine.expectedQty?.toLocaleString()} kg</p>
              <p><strong>Từ:</strong> {selectedLine.fromLocation?.code || selectedLine.fromLocationId || '—'}</p>
              <p><strong>Đến:</strong> {selectedLine.toLocation?.code || selectedLine.toLocationId || 'Quét để xác nhận'}</p>
            </div>
            <Input label="SL thực tế (kg)" type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value)} />
            <Input label="Vị trí quét (QR)" value={scannedLocation} onChange={(e) => setScannedLocation(e.target.value)} placeholder="Quét mã QR..." />

            {exceptions.length > 0 && (
              <div className="border-t border-moon-200 pt-3 space-y-2">
                <h4 className="text-sm font-semibold text-navy-900">Ngoại lệ</h4>
                {exceptions.map((exc) => (
                  <div key={exc.id} className="rounded-xl border border-danger/30 bg-danger/5 p-3 space-y-1">
                    <p className="font-semibold text-navy-800">{exc.type}</p>
                    <p className="text-xs text-navy-500">{exc.reasonCode} · {exc.note}</p>
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="border-t border-moon-200 pt-3 space-y-2">
                <h4 className="text-sm font-semibold text-navy-900">Lịch sử sự kiện</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto text-sm">
                  {history.map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between border-b border-moon-100 pb-1">
                      <p className="font-medium text-navy-800">{evt.eventType} · <span className="text-navy-400">{evt.actor}</span></p>
                      <p className="text-xs text-navy-400">{new Date(evt.at).toLocaleTimeString('vi-VN')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
