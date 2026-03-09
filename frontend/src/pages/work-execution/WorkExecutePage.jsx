import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkDetail, useCompleteLine, useSkipLine, useWorkHistory, useWorkExceptions } from '@domains/work-execution'
import { Badge, Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui'

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

  useEffect(() => {
    if (work?.lines?.length && !selectedLineId) {
      const firstOpenLine = work.lines.find((l) => ['OPEN', 'IN_PROGRESS'].includes(l.status))
      if (firstOpenLine) {
        setSelectedLineId(firstOpenLine.id)
        setActualQty(String(firstOpenLine.expectedQty))
      }
    }
  }, [work, selectedLineId])

  const selectedLine = work?.lines?.find((l) => l.id === selectedLineId)

  const handleComplete = async () => {
    if (!selectedLineId) return
    await completeLine.mutateAsync({ workId: work.id, lineId: selectedLineId, data: { actualQty: Number(actualQty), scannedLocation } })
    refetch()
    setSelectedLineId('')
    setActualQty('')
    setScannedLocation('')
  }

  const handleSkip = async () => {
    if (!selectedLineId) return
    await skipLine.mutateAsync({ workId: work.id, lineId: selectedLineId, data: { reasonCode: 'OTHER' } })
    refetch()
    setSelectedLineId('')
  }

  if (!workId) {
    return (
      <div className="page-section">
        <div className="wrs-card p-8 text-center">
          <p className="text-navy-500">Chọn công việc từ Công việc của tôi để bắt đầu thực thi.</p>
        </div>
      </div>
    )
  }

  if (!work) {
    return (
      <div className="page-section">
        <div className="wrs-card p-8 text-center">
          <p className="text-navy-500">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Thực thi công việc: {work.workId}</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <div className="wrs-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-navy-900">{work.workId}</p>
                <p className="text-xs text-navy-400">{work.workType} · Ưu tiên: {work.priority}</p>
              </div>
              <Badge variant={work.status === 'COMPLETED' ? 'success' : work.status === 'IN_PROGRESS' ? 'warning' : 'info'}>{work.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-navy-700">
              <p><strong>Nguồn:</strong> {work.sourceType}</p>
              <p><strong>ID nguồn:</strong> {work.sourceId}</p>
              <p><strong>Kho:</strong> {work.warehouse?.code || work.warehouseId}</p>
              <p><strong>Chủ hàng:</strong> {work.owner?.code || work.ownerId}</p>
            </div>
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Dòng công việc</h3>
            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>#</TableHead>
                  <TableHead>Bước</TableHead>
                  <TableHead>Hàng</TableHead>
                  <TableHead>Từ → Đến</TableHead>
                  <TableHead align="right">Dự kiến</TableHead>
                  <TableHead align="right">Thực tế</TableHead>
                  <TableHead align="center">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {work.lines?.map((line) => (
                  <TableRow
                    key={line.id}
                    onClick={() => ['OPEN', 'IN_PROGRESS'].includes(line.status) && setSelectedLineId(line.id)}
                    className={selectedLineId === line.id ? 'bg-ice/10' : ''}
                  >
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Thực thi dòng</h3>
            {selectedLine ? (
              <>
                <div className="rounded-xl border border-ice/30 bg-ice/5 p-4 space-y-2">
                  <p className="font-semibold text-navy-800">Line {selectedLine.lineNum}: {selectedLine.stepType}</p>
                  <p className="text-sm text-navy-600">{selectedLine.item?.code || selectedLine.itemId}</p>
                  <p className="text-xs text-navy-500">Dự kiến: {selectedLine.expectedQty?.toLocaleString()} kg</p>
                  <p className="text-xs text-navy-500">Từ: {selectedLine.fromLocation?.code || selectedLine.fromLocationId || '—'}</p>
                  <p className="text-xs text-navy-500">Đến: {selectedLine.toLocation?.code || selectedLine.toLocationId || 'Quét để xác nhận'}</p>
                </div>
                <Input label="SL thực tế (kg)" type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value)} />
                <Input label="Vị trí quét (QR)" value={scannedLocation} onChange={(e) => setScannedLocation(e.target.value)} placeholder="Quét mã QR..." />
                <div className="flex gap-3">
                  <Button variant="accent" onClick={handleComplete} disabled={completeLine.isPending}>Hoàn thành dòng</Button>
                  <Button variant="outline" onClick={handleSkip} disabled={skipLine.isPending}>Bỏ qua dòng</Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-navy-400">Chọn dòng từ bảng để thực thi, hoặc tất cả dòng đã hoàn thành.</p>
            )}
          </div>

          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Ngoại lệ</h3>
            {exceptions.length === 0 ? (
              <p className="text-sm text-navy-400">Không có ngoại lệ</p>
            ) : (
              exceptions.map((exc) => (
                <div key={exc.id} className="rounded-xl border border-danger/30 bg-danger/5 p-3 space-y-1">
                  <p className="font-semibold text-navy-800">{exc.type}</p>
                  <p className="text-xs text-navy-500">{exc.reasonCode}</p>
                  <p className="text-sm text-navy-700">{exc.note}</p>
                </div>
              ))
            )}
          </div>

          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Lịch sử sự kiện</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {history.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between border-b border-moon-200 pb-2">
                  <div>
                    <p className="font-medium text-navy-800">{evt.eventType}</p>
                    <p className="text-xs text-navy-400">{evt.actor}</p>
                  </div>
                  <p className="text-xs text-navy-400">{new Date(evt.at).toLocaleTimeString('vi-VN')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
