import { z } from 'zod'

export const itemSchema = z.object({
  itemCode: z
    .string()
    .max(30, 'Mã mặt hàng tối đa 30 ký tự')
    .optional()
    .or(z.literal('')),
  itemName: z
    .string()
    .min(1, 'Tên mặt hàng là bắt buộc')
    .max(200, 'Tên mặt hàng tối đa 200 ký tự'),
  itemNameEn: z
    .string()
    .max(200, 'Tên tiếng Anh tối đa 200 ký tự')
    .optional()
    .nullable(),
  cargoForm: z.enum(['BULK', 'BAGGED_25KG', 'BAGGED_40KG', 'BAGGED_50KG', 'JUMBO', 'PACKAGING', 'CONTAINER', 'DRUM', 'PALLET', 'OTHER'], {
    errorMap: () => ({ message: 'Vui lòng chọn dạng hàng' }),
  }),
  itemGroupId: z.string().uuid('Vui lòng chọn nhóm hàng hóa').min(1, 'Nhóm hàng hóa là bắt buộc'),
  baseUomId: z.string().min(1, 'Đơn vị tính cơ bản là bắt buộc'),
  billingUomId: z.string().min(1, 'Đơn vị tính xuất HĐ là bắt buộc'),
  stdGrossWeight: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Phải lớn hơn 0')
    .optional()
    .nullable(),
  stdNetWeight: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Phải lớn hơn 0')
    .optional()
    .nullable(),
  tolerancePctInbound: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0, 'Không được âm')
    .max(100, 'Tối đa 100%')
    .optional()
    .nullable(),
  tolerancePctOutbound: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0, 'Không được âm')
    .max(100, 'Tối đa 100%')
    .optional()
    .nullable(),
})

export const itemDefaultValues = {
  itemCode: '',
  itemName: '',
  itemNameEn: '',
  cargoForm: 'BULK',
  itemGroupId: '',
  baseUomId: '',
  billingUomId: '',
  stdGrossWeight: null,
  stdNetWeight: null,
  tolerancePctInbound: null,
  tolerancePctOutbound: null,
}
