import { useState } from 'react'
import { Eye, Pencil, Trash2, Upload, Download, FileCheck } from 'lucide-react'
import { useInboundReceipts, useInboundDocuments, useUploadInboundDocument, useDeleteInboundDocument } from '@domains/inbound-operations'
import { useLookupOwners } from '@domains/master-data'
import { ViewDocumentModal, UploadDocumentModal } from '@features/inbound-operations'
import {
  Badge,
  Button,
  Input,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from '@shared/ui'

const DOC_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'SUBMITTED', label: 'Đã nộp' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
]

const DOC_TYPES = [
  { value: '', label: 'Tất cả loại' },
  { value: 'BILL_OF_LADING', label: 'Vận đơn (B/L)' },
  { value: 'PACKING_LIST', label: 'Phiếu đóng gói' },
  { value: 'COMMERCIAL_INVOICE', label: 'Hóa đơn thương mại' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Giấy chứng nhận xuất xứ' },
  { value: 'QUALITY_CERTIFICATE', label: 'Chứng nhận chất lượng' },
  { value: 'WEIGHT_CERTIFICATE', label: 'Phiếu cân' },
  { value: 'OTHER', label: 'Khác' },
]

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

const statusTone = (status) => {
  if (status === 'DRAFT') return 'default'
  if (status === 'SUBMITTED') return 'info'
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'default'
}

const DOC_TYPE_LABELS = {
  BILL_OF_LADING: 'Vận đơn (B/L)',
  PACKING_LIST: 'Phiếu đóng gói',
  COMMERCIAL_INVOICE: 'Hóa đơn thương mại',
  CERTIFICATE_OF_ORIGIN: 'C/O',
  QUALITY_CERTIFICATE: 'Chứng nhận CL',
  WEIGHT_CERTIFICATE: 'Phiếu cân',
  OTHER: 'Khác',
}

export function InboundDocumentsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', docType: '', ownerId: '' })
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // Fetch documents
  const { data: response, isLoading, refetch } = useInboundDocuments({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    docType: filters.docType || undefined,
    ownerId: filters.ownerId || undefined,
  })

  // Fetch receipts for ASN dropdown in upload modal
  const { data: receiptsResponse } = useInboundReceipts({ pageSize: 100 })
  const receipts = receiptsResponse?.data || []

  const { data: owners = [] } = useLookupOwners()

  const uploadMutation = useUploadInboundDocument()
  const deleteMutation = useDeleteInboundDocument()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Chứng từ nhập</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" /> Tải lên chứng từ
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Tìm số B/L, số PO, tên chứng từ..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.docType}
            onChange={(e) => setFilters((prev) => ({ ...prev, docType: e.target.value, page: 1 }))}
            options={DOC_TYPES}
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
            options={DOC_STATUSES}
          />
          <Select
            value={filters.ownerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã CT</TableHead>
              <TableHead>Số ASN</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Loại chứng từ</TableHead>
              <TableHead>Tên File</TableHead>
              <TableHead>Ngày upload</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={9} />}
            {!isLoading && rows.length === 0 && <TableEmpty colSpan={9} message="Chưa có chứng từ nhập nào" />}
            {!isLoading && rows.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{doc.documentCode || doc.receiptNumber || '—'}</p>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-600">{doc.receiptNumber || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-700">{doc.vehiclePlate || doc.vehicleNumber || '—'}</span>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{doc.owner?.ownerCode || doc.ownerId}</p>
                  <p className="text-xs text-navy-400">{doc.owner?.ownerName}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="info">
                    {DOC_TYPE_LABELS[doc.docType] || 'Phiếu nhập'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700">{doc.fileName || doc.documentName || '—'}</p>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600">
                    {doc.uploadedAt || doc.createdAt ? new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusTone(doc.status)}>
                    {STATUS_LABELS[doc.status] || doc.status}
                  </Badge>
                </TableCell>
                <TableCell align="center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Xem"
                      onClick={() => {
                        setSelectedDoc(doc)
                        setIsViewModalOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Tải xuống">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Xóa"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* View Document Modal */}
      <ViewDocumentModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedDoc(null)
        }}
        document={selectedDoc}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={async (data) => {
          const formData = new FormData()
          formData.append('file', data.file)
          formData.append('docType', data.docType)
          if (data.receiptHeaderId) formData.append('receiptHeaderId', data.receiptHeaderId)
          if (data.ownerId) formData.append('ownerId', data.ownerId)
          if (data.vehicleNumber) formData.append('vehicleNumber', data.vehicleNumber)
          if (data.notes) formData.append('notes', data.notes)

          await uploadMutation.mutateAsync(formData)
          setIsUploadModalOpen(false)
          refetch()
        }}
        isLoading={uploadMutation.isPending}
        owners={owners}
        receipts={receipts}
      />
    </>
  )
}
