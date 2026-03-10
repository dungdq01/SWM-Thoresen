import { z } from 'zod'

export const uomSchema = z.object({
  uomCode: z
    .string()
    .min(1, 'Mã đơn vị tính là bắt buộc')
    .max(20, 'Mã đơn vị tính tối đa 20 ký tự')
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z0-9_-]+$/.test(val), {
      message: 'Mã chỉ chứa chữ cái, số, dấu gạch ngang và gạch dưới',
    }),
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
    .max(12, 'Tối đa 12 số lẻ'),
})

export const uomDefaultValues = {
  uomCode: '',
  description: '',
  uomClass: 'WEIGHT',
  isBaseUom: false,
  decimalPrecision: 3,
}
