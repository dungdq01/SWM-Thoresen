import { useState } from 'react'
import { useMyWorks, useReleaseWork, useStartWork } from '@domains/work-execution'
import { Badge, Button, Pagination, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { useNavigate } from 'react-router-dom'

const statusTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'info'
}

const workTypeTone = (workType) => {
  if (workType === 'PICK') return 'danger'
  if (workType === 'PUTAWAY') return 'success'
  if (['TRANSFER_PICK', 'TRANSFER_PUT'].includes(workType)) return 'warning'
  return 'info'
}

export function MyWorkPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20 })
  const navigate = useNavigate()

  const { data: response, isLoading, refetch } = useMyWorks(filters)
  const releaseWork = useReleaseWork()
  const startWork = useStartWork()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleExecute = (workId) => {
    navigate(`/app/work-execution/execute?workId=${workId}`)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Công việc của tôi</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã công việc</TableHead>
              <TableHead>Loại / Ưu tiên</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead align="right">Dòng / SL</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Bạn chưa nhận công việc nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.workId}</p>
                  <p className="text-xs text-navy-400">{row.warehouse?.code || row.warehouseId}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={workTypeTone(row.workType)}>{row.workType}</Badge>
                  <p className="text-xs text-navy-400 mt-1">Ưu tiên: {row.priority}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.sourceType}</p>
                  <p className="text-xs text-navy-400">{row.sourceId}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.lines?.length || 0} dòng</p>
                  <p className="text-xs text-navy-400">{row.lines?.reduce((sum, l) => sum + (l.expectedQty || 0), 0).toLocaleString()} kg</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'OPEN' && (
                      <>
                        <Button variant="accent" size="sm" onClick={() => startWork.mutate({ id: row.id, data: {} })}>Bắt đầu</Button>
                        <Button variant="ghost" size="sm" onClick={() => releaseWork.mutate({ id: row.id, data: {} })}>Trả lại</Button>
                      </>
                    )}
                    {row.status === 'IN_PROGRESS' && (
                      <Button variant="accent" size="sm" onClick={() => handleExecute(row.id)}>Thực hiện</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>
    </>
  )
}
