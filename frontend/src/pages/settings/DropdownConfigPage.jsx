import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Star, Settings2 } from 'lucide-react'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
  Select,
  Badge,
  Modal,
  Input,
} from '@shared/ui'
import {
  useDropdownConfigList,
  useDropdownConfigEntities,
  useDropdownConfigFields,
  useCreateDropdownConfig,
  useUpdateDropdownConfig,
  useDeleteDropdownConfig,
  useSetDefaultDropdownConfig,
} from '@domains/master-data'
import { SettingsLayout } from './components/SettingsLayout'

const ENTITY_LABELS = {
  owner: 'Chủ hàng',
  vendor: 'Nhà cung cấp',
  item: 'Mặt hàng',
  warehouse: 'Kho',
}

const FIELD_LABELS = {
  ownerGroup: 'Nhóm chủ hàng',
  ownerType: 'Loại chủ hàng',
  supplierGroup: 'Nhóm nhà cung cấp',
  cargoForm: 'Dạng hàng',
  productGroup: 'Nhóm sản phẩm',
  warehouseType: 'Loại kho',
}

export function DropdownConfigPage() {
  const [entityFilter, setEntityFilter] = useState('')
  const [fieldFilter, setFieldFilter] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null })

  const { data: entitiesResponse } = useDropdownConfigEntities()
  const entities = entitiesResponse?.data || []

  const { data: fieldsResponse } = useDropdownConfigFields(entityFilter)
  const fields = fieldsResponse?.data || []

  const { data: response, isLoading } = useDropdownConfigList({
    entity: entityFilter || undefined,
    fieldName: fieldFilter || undefined,
    page: 1,
    pageSize: 100,
  })

  const createMutation = useCreateDropdownConfig()
  const updateMutation = useUpdateDropdownConfig()
  const deleteMutation = useDeleteDropdownConfig()
  const setDefaultMutation = useSetDefaultDropdownConfig()

  const items = response?.data || []

  const groupedItems = useMemo(() => {
    const groups = {}
    items.forEach((item) => {
      const key = `${item.entity}-${item.fieldName}`
      if (!groups[key]) {
        groups[key] = {
          entity: item.entity,
          fieldName: item.fieldName,
          entityLabel: ENTITY_LABELS[item.entity] || item.entity,
          fieldLabel: FIELD_LABELS[item.fieldName] || item.fieldName,
          options: [],
        }
      }
      groups[key].options.push(item)
    })
    return Object.values(groups)
  }, [items])

  const openCreateModal = () => {
    setFormModal({
      open: true,
      data: {
        entity: entityFilter || 'owner',
        fieldName: fieldFilter || '',
        value: '',
        label: '',
      },
    })
  }

  const openEditModal = (item) => {
    setFormModal({ open: true, data: item })
  }

  const closeFormModal = () => {
    setFormModal({ open: false, data: null })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      entity: formData.get('entity'),
      fieldName: formData.get('fieldName'),
      value: formData.get('value').toUpperCase(),
      label: formData.get('label'),
    }

    try {
      if (formModal.data?.id) {
        await updateMutation.mutateAsync({ id: formModal.data.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      closeFormModal()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteModal.data.id)
      setDeleteModal({ open: false, data: null })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await setDefaultMutation.mutateAsync(id)
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <SettingsLayout
      title="Cấu hình Dropdown"
      actions={
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm giá trị
        </Button>
      }
    >
      <div className="wrs-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-navy-400" />
            <span className="text-sm font-medium text-navy-700">Bộ lọc:</span>
          </div>
          <Select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value)
              setFieldFilter('')
            }}
            options={[
              { value: '', label: 'Tất cả Entity' },
              ...entities.map((e) => ({ value: e.value, label: e.label })),
            ]}
            className="w-48"
          />
          <Select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            options={[
              { value: '', label: 'Tất cả Field' },
              ...fields.map((f) => ({ value: f.value, label: f.label })),
            ]}
            className="w-48"
            disabled={!entityFilter}
          />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-navy-400">Đang tải...</div>
        ) : groupedItems.length === 0 ? (
          <div className="py-12 text-center text-navy-400">Không có dữ liệu</div>
        ) : (
          <div className="space-y-6">
            {groupedItems.map((group) => (
              <div key={`${group.entity}-${group.fieldName}`} className="border border-navy-100 rounded-xl overflow-hidden">
                <div className="bg-navy-50 px-4 py-3 border-b border-navy-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-navy-900">{group.entityLabel}</span>
                      <span className="mx-2 text-navy-300">›</span>
                      <span className="text-navy-700">{group.fieldLabel}</span>
                    </div>
                    <Badge variant="info">{group.options.length} giá trị</Badge>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow hoverable={false}>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Giá trị (Value)</TableHead>
                      <TableHead>Nhãn hiển thị (Label)</TableHead>
                      <TableHead align="center">Mặc định</TableHead>
                      <TableHead align="center" className="w-32">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.options.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-navy-400">{idx + 1}</TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-navy-100 rounded text-sm font-mono">{item.value}</code>
                        </TableCell>
                        <TableCell className="font-medium text-navy-900">{item.label}</TableCell>
                        <TableCell align="center">
                          {item.isDefault ? (
                            <Badge variant="success">Mặc định</Badge>
                          ) : (
                            <button
                              onClick={() => handleSetDefault(item.id)}
                              className="text-navy-400 hover:text-amber-500 transition-colors"
                              title="Đặt làm mặc định"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-navy-400 hover:text-ice hover:bg-ice/10 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, data: item })}
                              className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={formModal.open}
        onClose={closeFormModal}
        title={formModal.data?.id ? 'Chỉnh sửa giá trị' : 'Thêm giá trị mới'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Entity"
              name="entity"
              required
              defaultValue={formModal.data?.entity || 'owner'}
              disabled={!!formModal.data?.id}
              options={entities.map((e) => ({ value: e.value, label: e.label }))}
            />
            <Select
              label="Field"
              name="fieldName"
              required
              defaultValue={formModal.data?.fieldName || ''}
              disabled={!!formModal.data?.id}
              options={
                formModal.data?.entity
                  ? [
                      ...(fields.length > 0 ? fields : []).map((f) => ({ value: f.value, label: f.label })),
                    ]
                  : []
              }
            />
          </div>
          <Input
            label="Giá trị (Value)"
            name="value"
            required
            defaultValue={formModal.data?.value || ''}
            placeholder="VD: LOCAL, FOREIGN"
            className="uppercase"
            disabled={!!formModal.data?.id}
          />
          <Input
            label="Nhãn hiển thị (Label)"
            name="label"
            required
            defaultValue={formModal.data?.label || ''}
            placeholder="VD: Nội địa, Nước ngoài"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-navy-100">
            <Button variant="outline" type="button" onClick={closeFormModal}>
              Hủy
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {formModal.data?.id ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, data: null })}
        title="Xác nhận xóa"
        size="sm"
      >
        <p className="text-navy-700 mb-6">
          Bạn có chắc muốn xóa giá trị <strong>"{deleteModal.data?.label}"</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, data: null })}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteMutation.isPending}>
            Xóa
          </Button>
        </div>
      </Modal>
    </SettingsLayout>
  )
}
