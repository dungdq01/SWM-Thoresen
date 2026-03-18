import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, FileText, Sparkles, X, AlertCircle, Truck, Warehouse } from 'lucide-react'
import { Button, Input, Select, Textarea, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@shared/ui'

const emptyLine = {
  itemId: '',
  expectedQty: 0,
  receivedQty: 0,
  uomId: '',
  status: 'NEW',
  notes: '',
}

export function CreateInboundReceiptModal({
  isOpen,
  onClose,
  onSubmit,
  purchaseOrder = null,
  confirmedPos = [],
  isLoading = false,
  nextReceiptNumber = '',
  warehouses = [],
  items = [],
  uoms = [],
}) {
  const [selectedPoId, setSelectedPoId] = useState('')
  const showPoSelector = !purchaseOrder && confirmedPos.length > 0
  const activePo = purchaseOrder || confirmedPos.find((p) => p.id === selectedPoId) || null
  const [draft, setDraft] = useState({
    warehouseId: '',
    vehiclePlate: '',
    notes: '',
    lines: [{ ...emptyLine }],
    vehicleLines: {},
    vehicleWarehouses: {},  // { '29A-111': 'warehouse-uuid', ... }
  })
  const [activeTab, setActiveTab] = useState('')
  const prevPlatesRef = useRef([])

  // Tạo initial lines từ PO lines (dùng cho cả reset và sync effect)
  const buildInitialLines = useCallback((po) => {
    if (!po) return [{ ...emptyLine }]
    const lines = (po.lines || []).map((line) => ({
      poLineId: line.id,
      itemId: line.itemId || '',
      expectedQty: line.expectedQty || 0,
      receivedQty: 0,
      uomId: line.uomId || '',
      status: 'NEW',
      notes: '',
    }))
    return lines.length > 0 ? lines : [{ ...emptyLine }]
  }, [])

  // Reset form khi mở modal hoặc PO thay đổi
  useEffect(() => {
    if (!isOpen) {
      setSelectedPoId('')
      return
    }
    if (!activePo) return

    setDraft({
      warehouseId: activePo.warehouseId || '',
      vehiclePlate: activePo.vehiclePlate || '',
      notes: '',
      lines: buildInitialLines(activePo),
      vehicleLines: {},
      vehicleWarehouses: {},
    })
    setActiveTab('')
    prevPlatesRef.current = []
  }, [isOpen, activePo, buildInitialLines])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const updateLine = useCallback((idx, field, value, plate) => {
    setDraft((prev) => {
      const mapLine = (l, i) => {
        if (i !== idx) return l
        if (field === 'itemId' && value) {
          const poLine = activePo?.lines?.find((pl) => pl.itemId === value)
          return { ...l, [field]: value, uomId: poLine?.uomId || l.uomId }
        }
        return { ...l, [field]: value }
      }

      if (plate && prev.vehicleLines[plate]) {
        return {
          ...prev,
          vehicleLines: {
            ...prev.vehicleLines,
            [plate]: prev.vehicleLines[plate].map(mapLine),
          },
        }
      }
      return { ...prev, lines: prev.lines.map(mapLine) }
    })
  }, [activePo])

  const addLine = useCallback((plate) => {
    setDraft((prev) => {
      if (plate && prev.vehicleLines[plate]) {
        return {
          ...prev,
          vehicleLines: {
            ...prev.vehicleLines,
            [plate]: [...prev.vehicleLines[plate], { ...emptyLine }],
          },
        }
      }
      return { ...prev, lines: [...prev.lines, { ...emptyLine }] }
    })
  }, [])

  const removeLine = useCallback((idx, plate) => {
    setDraft((prev) => {
      if (plate && prev.vehicleLines[plate]) {
        return {
          ...prev,
          vehicleLines: {
            ...prev.vehicleLines,
            [plate]: prev.vehicleLines[plate].filter((_, i) => i !== idx),
          },
        }
      }
      return { ...prev, lines: prev.lines.filter((_, i) => i !== idx) }
    })
  }, [])

  // Parse vehicle plates from input (split by , | ;), deduplicate
  const parseVehiclePlates = (input) => {
    if (!input) return []
    return input
      .split(/[,|;]+/)
      .map((plate) => plate.trim())
      .filter((plate) => plate.length > 0)
      .filter((plate, i, arr) => arr.indexOf(plate) === i)
  }

  const vehiclePlates = parseVehiclePlates(draft.vehiclePlate)
  const hasMultipleVehicles = vehiclePlates.length > 1

  // Sync vehiclePlates → vehicleLines khi danh sách xe thay đổi
  useEffect(() => {
    const prev = prevPlatesRef.current
    const curr = vehiclePlates
    const prevSet = new Set(prev)
    const currSet = new Set(curr)

    // Không thay đổi → skip
    if (prev.length === curr.length && prev.every((p) => currSet.has(p))) {
      return
    }

    setDraft((d) => {
      const newVehicleLines = { ...d.vehicleLines }
      const newVehicleWarehouses = { ...d.vehicleWarehouses }

      if (curr.length > 1) {
        // Multi-vehicle mode
        const freshLines = buildInitialLines(activePo)

        // Thêm plate mới
        for (const plate of curr) {
          if (!newVehicleLines[plate]) {
            newVehicleLines[plate] =
              prev.length <= 1
                ? d.lines.map((l) => ({ ...l }))
                : freshLines.map((l) => ({ ...l }))
          }
          // Khởi tạo warehouse cho plate mới (kế thừa từ warehouse chung nếu chuyển từ 1→N)
          if (newVehicleWarehouses[plate] === undefined) {
            newVehicleWarehouses[plate] = prev.length <= 1 ? d.warehouseId : ''
          }
        }

        // Xoá plate không còn
        for (const plate of prev) {
          if (!currSet.has(plate)) {
            delete newVehicleLines[plate]
            delete newVehicleWarehouses[plate]
          }
        }

        return { ...d, vehicleLines: newVehicleLines, vehicleWarehouses: newVehicleWarehouses }
      } else if (prev.length > 1 && curr.length <= 1) {
        // Multi → single: copy lines + warehouse của plate còn lại
        const survivingPlate = curr[0]
        const survivingLines =
          survivingPlate && newVehicleLines[survivingPlate]
            ? newVehicleLines[survivingPlate]
            : d.lines
        const survivingWarehouse =
          survivingPlate && newVehicleWarehouses[survivingPlate]
            ? newVehicleWarehouses[survivingPlate]
            : d.warehouseId

        return { ...d, lines: survivingLines, warehouseId: survivingWarehouse, vehicleLines: {}, vehicleWarehouses: {} }
      }

      return d
    })

    // Cập nhật activeTab
    if (curr.length > 1) {
      setActiveTab((prev) => (currSet.has(prev) ? prev : curr[0]))
    } else {
      setActiveTab('')
    }

    prevPlatesRef.current = curr
  }, [vehiclePlates.join('|'), activePo, buildInitialLines]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!activePo) return

    const getCargoForm = (itemId) => {
      const poLine = activePo.lines?.find((l) => l.itemId === itemId)
      return poLine?.item?.cargoForm || 'BULK'
    }

    const fetchNextAsnNumber = async () => {
      try {
        const res = await fetch('/api/v1/inbound/receipts/next-number')
        const json = await res.json()
        // API returns { success, data: { code } }
        return json.data?.code || json.code
      } catch {
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
        return `ASN-${dateStr}-${String(Date.now()).slice(-6).padStart(6, '0')}`
      }
    }

    const plates = vehiclePlates.length > 0 ? vehiclePlates : [draft.vehiclePlate || '']

    for (const plate of plates) {
      // Chọn lines và kho riêng cho từng xe
      const linesForVehicle = hasMultipleVehicles
        ? (draft.vehicleLines[plate] || [])
        : draft.lines
      const warehouseForVehicle = hasMultipleVehicles
        ? (draft.vehicleWarehouses[plate] || '')
        : draft.warehouseId
      const validLines = linesForVehicle.filter((l) => l.itemId && l.expectedQty > 0)
      const totalExpectedQty = validLines.reduce((sum, l) => sum + Number(l.expectedQty || 0), 0)

      const asnId = await fetchNextAsnNumber()
      const payload = {
        externalId: `WEB-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        poId: activePo.poNumber || activePo.id,
        asnId,
        ownerId: activePo.ownerId,
        vendorId: activePo.vendorId,
        warehouseId: warehouseForVehicle,
        vehicleNumber: plate,
        blNumber: activePo.blNumber || '',
        vesselName: activePo.vesselName || '',
        expectedQty: totalExpectedQty,
        notes: draft.notes || '',
        sourceApp: 'WEB',
        lines: validLines.map((l) => ({
          itemId: l.itemId,
          uomId: l.uomId,
          expectedQty: Number(l.expectedQty || 0),
          cargoForm: getCargoForm(l.itemId),
          notes: l.notes || '',
        })),
      }
      await onSubmit(payload)
    }
  }

  // Filter warehouses based on PO's selected warehouses
  const poWarehouseIds = activePo?.warehouses?.map((w) => w.warehouse?.id || w.warehouseId) || 
    (activePo?.warehouseId ? [activePo.warehouseId] : [])
  const filteredWarehouses = poWarehouseIds.length > 0
    ? warehouses.filter((w) => poWarehouseIds.includes(w.id))
    : warehouses

  const isValid = !!(
    activePo &&
    draft.vehiclePlate &&
    (hasMultipleVehicles
      ? vehiclePlates.every((plate) =>
          !!(draft.vehicleWarehouses[plate]) &&
          (draft.vehicleLines[plate] || []).some((l) => l.itemId && l.uomId && l.expectedQty > 0)
        )
      : draft.warehouseId && draft.lines.some((l) => l.itemId && l.uomId && l.expectedQty > 0))
  )

  // Kiểm tra từng tab có valid không (kho + ít nhất 1 dòng hàng)
  const isTabValid = (plate) =>
    !!(draft.vehicleWarehouses[plate]) &&
    (draft.vehicleLines[plate] || []).some((l) => l.itemId && l.uomId && l.expectedQty > 0)

  // Filter items chỉ từ PO lines
  const poItemIds = (activePo?.lines || []).map((l) => l.itemId)
  const filteredItems = items.filter((i) => poItemIds.includes(i.id))
  
  const itemOptions = [
    { value: '', label: '-- Chọn mã hàng hóa --' },
    ...filteredItems.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` })),
  ]

  const uomOptions = [
    { value: '', label: '--' },
    ...uoms.map((u) => ({ value: u.id, label: u.code })),
  ]

  const warehouseOptions = [
    { value: '', label: '-- Chọn kho --' },
    ...filteredWarehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` })),
  ]

  const poOptions = [
    { value: '', label: '-- Chọn PO đã xác nhận --' },
    ...confirmedPos.map((po) => ({
      value: po.id,
      label: `${po.poNumber} — ${po.owner?.ownerCode || ''} — ${po.totalExpectedQty?.toLocaleString() || 0} kg`
    }))
  ]

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    Tạo phiếu nhập kho
                  </h2>
                  <p className="text-sm text-navy-400">
                    {activePo ? `Tạo phiếu nhập từ PO ${activePo.poNumber}` : 'Chọn PO để tạo phiếu nhập'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-moon-100">

              {/* Section 1: Thông tin chung */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">1</span>
                  <h3 className="text-sm font-semibold text-navy-800">Thông tin chung</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Số PO - Dropdown hoặc Readonly */}
                  {showPoSelector ? (
                    <Select
                      label="Số PO *"
                      value={selectedPoId}
                      onChange={(e) => setSelectedPoId(e.target.value)}
                      options={poOptions}
                    />
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                        Số PO
                      </label>
                      <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                        <FileText className="mr-2 h-4 w-4 text-navy-400" />
                        <span className="font-mono text-sm font-medium text-navy-700">
                          {activePo?.poNumber || '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Loại phiếu - Readonly */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Loại phiếu
                    </label>
                    <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                      {activePo ? (
                        <Badge variant={activePo.poType === 'SEA' ? 'info' : 'warning'}>
                          {activePo.poType === 'SEA' ? 'Đường biển' : 'Đường bộ'}
                        </Badge>
                      ) : (
                        <span className="text-sm text-navy-400 italic">Chọn PO</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Chủ hàng - Readonly */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Chủ hàng
                    </label>
                    <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                      {activePo ? (
                        <span className="text-sm text-navy-700">
                          {activePo.owner?.ownerCode || activePo.ownerId} -{' '}
                          {activePo.owner?.ownerName || ''}
                        </span>
                      ) : (
                        <span className="text-sm text-navy-400 italic">Chọn PO</span>
                      )}
                    </div>
                  </div>

                  {/* Số B/L - Readonly */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Số B/L
                    </label>
                    <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                      <span className="font-mono text-sm text-navy-700">
                        {activePo?.blNumber || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Số phiếu nhập - Auto gen */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Số phiếu nhập <span className="font-normal text-navy-400">(Tự động)</span>
                    </label>
                    <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-moon-200 bg-moon-50 px-4">
                      <Sparkles className="h-4 w-4 shrink-0 text-ice" />
                      <span className="font-mono text-sm font-semibold text-navy-700">
                        {nextReceiptNumber || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Biển số xe — readonly, link từ PO */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Biển số xe
                    </label>
                    <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                      <Truck className="mr-2 h-4 w-4 text-navy-400" />
                      <span className="text-sm text-navy-700">
                        {draft.vehiclePlate || '—'}
                      </span>
                    </div>
                    {hasMultipleVehicles && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {vehiclePlates.map((plate, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md bg-ice/10 px-2 py-1 text-xs font-medium text-ice"
                          >
                            <Truck className="h-3 w-3" />
                            {plate}
                          </span>
                        ))}
                        <span className="text-xs text-navy-400 self-center ml-1">
                          → Sẽ tạo {vehiclePlates.length} phiếu nhập
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {!hasMultipleVehicles && (
                  <Select
                    label="Kho *"
                    value={draft.warehouseId}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))
                    }
                    options={warehouseOptions}
                  />
                )}
                {hasMultipleVehicles && (
                  <div className="rounded-xl border border-ice/20 bg-ice/5 px-4 py-3">
                    <p className="flex items-center gap-2 text-xs font-medium text-ice">
                      <Warehouse className="h-3.5 w-3.5" />
                      Kho được chọn riêng cho từng xe ở phần Chi tiết phiếu bên dưới
                    </p>
                  </div>
                )}

                {/* Ghi chú */}
                <Textarea
                  label="Ghi chú"
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Nhập ghi chú..."
                />
              </div>

              {/* Section 2: Chi tiết phiếu */}
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                  <h3 className="text-sm font-semibold text-navy-800">Chi tiết phiếu</h3>
                </div>

                {hasMultipleVehicles ? (
                  /* ── Multi-vehicle: Tab per vehicle ── */
                  <Tabs value={activeTab} onChange={setActiveTab}>
                    <TabsList className="inline-flex w-full items-center gap-1 rounded-xl bg-moon-100 p-1">
                      {vehiclePlates.map((plate) => {
                        const tabLines = draft.vehicleLines[plate] || []
                        const validCount = tabLines.filter((l) => l.itemId && l.expectedQty > 0).length
                        const tabOk = isTabValid(plate)
                        const whId = draft.vehicleWarehouses[plate]
                        const whLabel = whId ? filteredWarehouses.find((w) => w.id === whId)?.code : null
                        return (
                          <TabsTrigger
                            key={plate}
                            value={plate}
                            className={
                              activeTab === plate
                                ? 'inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-navy-800 shadow-sm'
                                : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-navy-400 hover:text-navy-600'
                            }
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span className="flex flex-col items-start leading-tight">
                              <span>{plate}</span>
                              {whLabel && <span className="text-[10px] text-navy-400">{whLabel}</span>}
                            </span>
                            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tabOk ? 'bg-emerald-100 text-emerald-700' : 'bg-danger/10 text-danger'}`}>
                              {validCount}/{tabLines.length}
                            </span>
                            {!tabOk && <AlertCircle className="h-3 w-3 text-danger" />}
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>

                    {vehiclePlates.map((plate) => {
                      const lines = draft.vehicleLines[plate] || []
                      return (
                        <TabsContent key={plate} value={plate} className="mt-3">
                          <div className="mb-3">
                            <Select
                              label="Kho *"
                              value={draft.vehicleWarehouses[plate] || ''}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  vehicleWarehouses: { ...prev.vehicleWarehouses, [plate]: e.target.value },
                                }))
                              }
                              options={warehouseOptions}
                            />
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="rounded-full bg-moon-100 px-2 py-0.5 text-xs font-medium text-navy-500">
                              {lines.filter((l) => l.itemId && l.expectedQty > 0).length}/{lines.length} dòng
                            </span>
                            <Button variant="outline" size="sm" onClick={() => addLine(plate)}>
                              <Plus className="mr-1 h-3.5 w-3.5" /> Thêm dòng
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {lines.map((line, idx) => (
                              <div
                                key={idx}
                                className="relative rounded-xl border border-moon-200 bg-moon-50/50 px-4 pb-3 pt-4 transition-colors hover:border-moon-300"
                              >
                                <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-navy-700 text-[10px] font-bold text-white shadow-sm">
                                  {idx + 1}
                                </span>
                                <div className="grid grid-cols-[1fr_120px_96px_40px] gap-3 items-end">
                                  <Select
                                    label="Mã hàng hóa *"
                                    value={line.itemId}
                                    onChange={(e) => updateLine(idx, 'itemId', e.target.value, plate)}
                                    options={itemOptions}
                                  />
                                  <Input
                                    label="SL dự kiến *"
                                    type="number"
                                    min={0}
                                    value={line.expectedQty}
                                    onChange={(e) => updateLine(idx, 'expectedQty', Number(e.target.value), plate)}
                                    className="text-center"
                                  />
                                  <Select
                                    label="ĐVT"
                                    value={line.uomId}
                                    onChange={(e) => updateLine(idx, 'uomId', e.target.value, plate)}
                                    options={uomOptions}
                                    disabled={!!line.itemId}
                                  />
                                  <div className="flex items-end pb-0.5">
                                    {lines.length > 1 ? (
                                      <button
                                        onClick={() => removeLine(idx, plate)}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy-300 transition-colors hover:bg-danger/10 hover:text-danger"
                                        title="Xóa dòng"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    ) : (
                                      <div className="h-10 w-10" />
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <Input
                                    value={line.notes}
                                    onChange={(e) => updateLine(idx, 'notes', e.target.value, plate)}
                                    placeholder="Ghi chú dòng hàng (tuỳ chọn)..."
                                  />
                                </div>
                                <p className="mt-1.5 text-xs text-navy-400">
                                  Đã nhận: <span className="font-semibold text-emerald-600">{line.receivedQty || 0}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                ) : (
                  /* ── Single vehicle: flat list (unchanged) ── */
                  <>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-moon-100 px-2 py-0.5 text-xs font-medium text-navy-500">
                        {draft.lines.filter((l) => l.itemId && l.expectedQty > 0).length}/{draft.lines.length} dòng
                      </span>
                      <Button variant="outline" size="sm" onClick={() => addLine()}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Thêm dòng
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {draft.lines.map((line, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-xl border border-moon-200 bg-moon-50/50 px-4 pb-3 pt-4 transition-colors hover:border-moon-300"
                        >
                          <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-navy-700 text-[10px] font-bold text-white shadow-sm">
                            {idx + 1}
                          </span>
                          <div className="grid grid-cols-[1fr_120px_96px_40px] gap-3 items-end">
                            <Select
                              label="Mã hàng hóa *"
                              value={line.itemId}
                              onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                              options={itemOptions}
                            />
                            <Input
                              label="SL dự kiến *"
                              type="number"
                              min={0}
                              value={line.expectedQty}
                              onChange={(e) => updateLine(idx, 'expectedQty', Number(e.target.value))}
                              className="text-center"
                            />
                            <Select
                              label="ĐVT"
                              value={line.uomId}
                              onChange={(e) => updateLine(idx, 'uomId', e.target.value)}
                              options={uomOptions}
                              disabled={!!line.itemId}
                            />
                            <div className="flex items-end pb-0.5">
                              {draft.lines.length > 1 ? (
                                <button
                                  onClick={() => removeLine(idx)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy-300 transition-colors hover:bg-danger/10 hover:text-danger"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : (
                                <div className="h-10 w-10" />
                              )}
                            </div>
                          </div>
                          <div className="mt-2">
                            <Input
                              value={line.notes}
                              onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                              placeholder="Ghi chú dòng hàng (tuỳ chọn)..."
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-navy-400">
                            Đã nhận: <span className="font-semibold text-emerald-600">{line.receivedQty || 0}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid ? (
                    <span className="font-medium text-emerald-600">
                      {hasMultipleVehicles
                        ? `✓ ${vehiclePlates.reduce((sum, p) => sum + (draft.vehicleLines[p] || []).filter((l) => l.itemId && l.expectedQty > 0).length, 0)} dòng hàng trên ${vehiclePlates.length} xe`
                        : `✓ ${draft.lines.filter((l) => l.itemId && l.expectedQty > 0).length} dòng hàng sẵn sàng`}
                    </span>
                  ) : (
                    hasMultipleVehicles
                      ? '* Mỗi xe phải chọn kho và có ít nhất 1 dòng hàng hóa với ĐVT và số lượng > 0'
                      : '* Kho, biển số xe và ít nhất 1 dòng hàng hóa với ĐVT và số lượng > 0 là bắt buộc'
                  )}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>
                    Hủy
                  </Button>
                  <Button
                    variant="accent"
                    onClick={handleSubmit}
                    isLoading={isLoading}
                    disabled={!isValid}
                  >
                    {hasMultipleVehicles ? `Tạo ${vehiclePlates.length} phiếu nhập` : 'Tạo phiếu nhập'}
                  </Button>
                </div>
              </div>
            </div>

          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
