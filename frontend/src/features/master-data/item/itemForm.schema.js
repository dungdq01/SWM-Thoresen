import { z } from 'zod'

export const itemSchema = z.object({
  itemCode: z
    .string()
    .min(1, 'Mã mặt hàng là bắt buộc')
    .max(30, 'Mã mặt hàng tối đa 30 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã chỉ chứa chữ in hoa, số, dấu gạch ngang và gạch dưới'),
  itemName: z
    .string()
    .min(1, 'Tên mặt hàng là bắt buộc')
    .max(200, 'Tên mặt hàng tối đa 200 ký tự'),
  itemNameEn: z
    .string()
    .max(200, 'Tên tiếng Anh tối đa 200 ký tự')
    .optional()
    .nullable(),
  cargoForm: z.enum(['BULK', 'BAGGED', 'CONTAINERIZED', 'LIQUID'], {
    errorMap: () => ({ message: 'Vui lòng chọn dạng hàng' }),
  }),
  productGroup: z.enum(['AGRICULTURAL', 'FERTILIZER', 'CHEMICAL', 'STEEL', 'GENERAL'], {
    errorMap: () => ({ message: 'Vui lòng chọn nhóm sản phẩm' }),
  }),
  baseUomId: z.string().min(1, 'Đơn vị tính cơ bản là bắt buộc'),
  billingUomId: z.string().optional().nullable(),
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
  productGroup: 'AGRICULTURAL',
  baseUomId: '',
  billingUomId: '',
  stdGrossWeight: null,
  stdNetWeight: null,
  tolerancePctInbound: null,
  tolerancePctOutbound: null,
}
