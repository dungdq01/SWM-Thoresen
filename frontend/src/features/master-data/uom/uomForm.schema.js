import { z } from 'zod'

export const uomSchema = z.object({
  uomCode: z
    .string()
    .min(1, 'Mã đơn vị tính là bắt buộc')
    .max(20, 'Mã đơn vị tính tối đa 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã chỉ chứa chữ in hoa, số, dấu gạch ngang và gạch dưới'),
  description: z
    .string()
    .min(1, 'Mô tả là bắt buộc')
    .max(120, 'Mô tả tối đa 120 ký tự'),
  uomClass: z.enum(['WEIGHT', 'VOLUME', 'QUANTITY', 'LENGTH'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại đơn vị' }),
  }),
  isBaseUom: z.boolean(),
  decimalPrecision: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0, 'Không được âm')
    .max(6, 'Tối đa 6 số lẻ'),
})

export const uomDefaultValues = {
  uomCode: '',
  description: '',
  uomClass: 'WEIGHT',
  isBaseUom: false,
  decimalPrecision: 3,
}
