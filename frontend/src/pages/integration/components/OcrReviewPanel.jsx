import { useState, useEffect } from 'react'
import { AlertTriangle, Check, X, FileImage, Loader2 } from 'lucide-react'
import { Button, Badge, Input, Modal } from '@shared/ui'
import { useOcrResultDetail, useConfirmOcrResult, useRejectOcrResult } from '@domains/integration'

const CONFIDENCE_THRESHOLD = {
  bl: 90,
  vehicle: 90,
  product: 85,
  vessel: 85,
  customer: 85,
  delivery: 85,
  grossWeight: 85,
  tareWeight: 85,
  qty: 85,
}

function ConfidenceBar({ value, threshold }) {
  const num = Number(value) || 0
  const pct = Math.min(100, Math.max(0, num))
  const isLow = num < threshold
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isLow ? 'bg-warning' : 'bg-success'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${isLow ? 'text-warning' : 'text-success'}`}>
        {num.toFixed(1)}%
      </span>
    </div>
  )
}

function FieldRow({ label, value, confidence, threshold, editValue, onEditChange, isLow }) {
  return (
    <div className="space-y-1.5 py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2">
        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <Input
        value={editValue ?? value ?? ''}
        onChange={(e) => onEditChange(e.target.value)}
        className="text-sm"
      />
      {confidence > 0 && (
        <ConfidenceBar value={confidence} threshold={threshold} />
      )}
    </div>
  )
}

export function OcrReviewPanel({ resultId, onClose, onActionComplete }) {
  const { data: response, isLoading } = useOcrResultDetail(resultId)
  const confirmMutation = useConfirmOcrResult()
  const rejectMutation = useRejectOcrResult()

  // httpClient unwraps envelope, so response IS the object directly
  const result = response

  const [edits, setEdits] = useState({})
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    if (result) {
      setEdits({
        blNumber: result.blNumber || '',
        vehicleNumber: result.vehicleNumber || '',
        productName: result.productName || '',
        vesselName: result.vesselName || '',
        customerName: result.customerName || '',
        deliveryLocation: result.deliveryLocation || '',
        grossWeight: result.grossWeight != null ? String(result.grossWeight) : '',
        grossWeightUom: result.grossWeightUom || '',
        tareWeight: result.tareWeight != null ? String(result.tareWeight) : '',
        tareWeightUom: result.tareWeightUom || '',
        qtyExtracted: result.qtyExtracted != null ? String(result.qtyExtracted) : '',
        qtyUom: result.qtyUom || '',
      })
    }
  }, [result])

  const handleConfirm = async () => {
    await confirmMutation.mutateAsync({
      id: resultId,
      data: {
        confirmedBlNumber: edits.blNumber,
        confirmedVehicleNumber: edits.vehicleNumber,
        confirmedProductName: edits.productName,
        confirmedVesselName: edits.vesselName,
        confirmedCustomerName: edits.customerName,
        confirmedDeliveryLocation: edits.deliveryLocation,
        confirmedGrossWeight: edits.grossWeight ? parseFloat(edits.grossWeight) : undefined,
        confirmedGrossWeightUom: edits.grossWeightUom,
        confirmedTareWeight: edits.tareWeight ? parseFloat(edits.tareWeight) : undefined,
        confirmedTareWeightUom: edits.tareWeightUom,
        confirmedQty: edits.qtyExtracted ? parseFloat(edits.qtyExtracted) : undefined,
        confirmedQtyUom: edits.qtyUom,
      },
    })
    onActionComplete?.()
  }

  const handleReject = async () => {
    await rejectMutation.mutateAsync({
      id: resultId,
      data: { reason: rejectReason },
    })
    setShowRejectModal(false)
    onActionComplete?.()
  }

  const updateEdit = (field) => (value) => {
    setEdits((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading || !result) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isProcessing = result.status === 'UPLOADED' || result.status === 'EXTRACTING'
  const canEdit = ['EXTRACTED', 'REVIEW_REQUIRED'].includes(result.status)
  const isReviewRequired = result.status === 'REVIEW_REQUIRED'

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Image preview */}
      <div className="lg:w-1/2">
        <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground truncate">{result.originalFileName}</p>
          </div>
          <div className="flex items-center justify-center min-h-[300px] p-4">
            {result.imagePath ? (
              <img
                src={result.imagePath}
                alt={result.originalFileName}
                className="max-w-full max-h-[400px] object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div className="flex-col items-center justify-center gap-2 text-muted-foreground" style={{ display: result.imagePath ? 'none' : 'flex' }}>
              <FileImage className="h-12 w-12" />
              <p className="text-sm">Không thể tải ảnh xem trước</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: OCR results */}
      <div className="lg:w-1/2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Kết quả OCR</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{result.ocrRequestId}</p>
          </div>
          <OcrStatusBadge status={result.status} />
        </div>

        {isReviewRequired && (
          <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-sm font-medium text-warning">Cần xem xét thủ công</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Một số trường có độ tin cậy thấp. Vui lòng kiểm tra và chỉnh sửa trước khi xác nhận.</p>
          </div>
        )}

        {isProcessing && (
          <div className="rounded-md bg-info/10 border border-info/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-info animate-spin" />
              <p className="text-sm font-medium text-info">
                {result.status === 'UPLOADED' ? 'Đang chuẩn bị xử lý...' : 'Đang trích xuất dữ liệu...'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tự động cập nhật mỗi 2 giây</p>
          </div>
        )}

        {!isProcessing && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Tổng độ tin cậy</span>
              <ConfidenceBar value={result.overallConfidence || 0} threshold={85} />
            </div>

            <div className="rounded-lg border border-border divide-y divide-border">
              <div className="px-4">
                <FieldRow
                  label="Số phiếu"
                  value={result.blNumber}
                  confidence={result.blConfidence || 0}
                  threshold={CONFIDENCE_THRESHOLD.bl}
                  editValue={edits.blNumber}
                  onEditChange={updateEdit('blNumber')}
                  isLow={Number(result.blConfidence || 0) > 0 && Number(result.blConfidence || 0) < CONFIDENCE_THRESHOLD.bl}
                />
                <FieldRow
                  label="Tên tàu"
                  value={result.vesselName}
                  confidence={result.vesselConfidence || 0}
                  threshold={CONFIDENCE_THRESHOLD.vessel}
                  editValue={edits.vesselName}
                  onEditChange={updateEdit('vesselName')}
                  isLow={Number(result.vesselConfidence || 0) > 0 && Number(result.vesselConfidence || 0) < CONFIDENCE_THRESHOLD.vessel}
                />
                <FieldRow
                  label="Khách hàng"
                  value={result.customerName}
                  confidence={result.customerConfidence || 0}
                  threshold={CONFIDENCE_THRESHOLD.customer}
                  editValue={edits.customerName}
                  onEditChange={updateEdit('customerName')}
                  isLow={Number(result.customerConfidence || 0) > 0 && Number(result.customerConfidence || 0) < CONFIDENCE_THRESHOLD.customer}
                />
                <FieldRow
                  label="Hàng hóa"
                  value={result.productName}
                  confidence={result.productConfidence || 0}
                  threshold={CONFIDENCE_THRESHOLD.product}
                  editValue={edits.productName}
                  onEditChange={updateEdit('productName')}
                  isLow={Number(result.productConfidence || 0) > 0 && Number(result.productConfidence || 0) < CONFIDENCE_THRESHOLD.product}
                />
                <FieldRow
                  label="Biển số xe"
                  value={result.vehicleNumber}
                  confidence={result.vehicleConfidence || 0}
                  threshold={CONFIDENCE_THRESHOLD.vehicle}
                  editValue={edits.vehicleNumber}
                  onEditChange={updateEdit('vehicleNumber')}
                  isLow={Number(result.vehicleConfidence || 0) > 0 && Number(result.vehicleConfidence || 0) < CONFIDENCE_THRESHOLD.vehicle}
                />
                <FieldRow
                  label="Nơi giao"
                  value={result.deliveryLocation}
                  confidence={result.deliveryConfidence || 0}
                  threshold={CONFIDENCE_THRESHOLD.delivery}
                  editValue={edits.deliveryLocation}
                  onEditChange={updateEdit('deliveryLocation')}
                  isLow={Number(result.deliveryConfidence || 0) > 0 && Number(result.deliveryConfidence || 0) < CONFIDENCE_THRESHOLD.delivery}
                />
              </div>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Trọng lượng xe hàng</span>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={edits.grossWeight}
                      onChange={(e) => updateEdit('grossWeight')(e.target.value)}
                      placeholder="TL xe hàng"
                      type="number"
                      className="flex-1"
                      disabled={!canEdit}
                    />
                    <Input
                      value={edits.grossWeightUom}
                      onChange={(e) => updateEdit('grossWeightUom')(e.target.value)}
                      placeholder="ĐVT"
                      className="w-20"
                      disabled={!canEdit}
                    />
                  </div>
                  {Number(result.grossWeightConfidence || 0) > 0 && (
                    <div className="mt-1.5">
                      <ConfidenceBar value={result.grossWeightConfidence} threshold={CONFIDENCE_THRESHOLD.grossWeight} />
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Trọng lượng xe rỗng</span>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={edits.tareWeight}
                      onChange={(e) => updateEdit('tareWeight')(e.target.value)}
                      placeholder="TL xe rỗng"
                      type="number"
                      className="flex-1"
                      disabled={!canEdit}
                    />
                    <Input
                      value={edits.tareWeightUom}
                      onChange={(e) => updateEdit('tareWeightUom')(e.target.value)}
                      placeholder="ĐVT"
                      className="w-20"
                      disabled={!canEdit}
                    />
                  </div>
                  {Number(result.tareWeightConfidence || 0) > 0 && (
                    <div className="mt-1.5">
                      <ConfidenceBar value={result.tareWeightConfidence} threshold={CONFIDENCE_THRESHOLD.tareWeight} />
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Trọng lượng hàng</span>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={edits.qtyExtracted}
                      onChange={(e) => updateEdit('qtyExtracted')(e.target.value)}
                      placeholder="TL hàng"
                      type="number"
                      className="flex-1"
                      disabled={!canEdit}
                    />
                    <Input
                      value={edits.qtyUom}
                      onChange={(e) => updateEdit('qtyUom')(e.target.value)}
                      placeholder="ĐVT"
                      className="w-20"
                      disabled={!canEdit}
                    />
                  </div>
                  {Number(result.qtyConfidence || 0) > 0 && (
                    <div className="mt-1.5">
                      <ConfidenceBar value={result.qtyConfidence} threshold={CONFIDENCE_THRESHOLD.qty} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(true)}
                  disabled={rejectMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1.5" />Từ chối
                </Button>
                <Button
                  variant="accent"
                  onClick={handleConfirm}
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Check className="h-4 w-4 mr-1.5" />
                  )}
                  Xác nhận
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Từ chối kết quả OCR"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Hủy</Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim() || rejectMutation.isPending}>
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Từ chối
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Vui lòng nhập lý do từ chối kết quả OCR này.</p>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
            placeholder="Lý do từ chối..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}

function OcrStatusBadge({ status }) {
  const config = {
    UPLOADED: { variant: 'neutral', label: 'Đã tải lên' },
    EXTRACTING: { variant: 'info', label: 'Đang trích xuất' },
    EXTRACTED: { variant: 'success', label: 'Đã trích xuất' },
    REVIEW_REQUIRED: { variant: 'warning', label: 'Cần xem xét' },
    CONFIRMED: { variant: 'primary', label: 'Đã xác nhận' },
    LINKED: { variant: 'primary', label: 'Đã liên kết' },
    REJECTED: { variant: 'danger', label: 'Từ chối' },
  }
  const c = config[status] || { variant: 'neutral', label: status }
  return <Badge variant={c.variant} dot>{c.label}</Badge>
}

export { OcrStatusBadge }
