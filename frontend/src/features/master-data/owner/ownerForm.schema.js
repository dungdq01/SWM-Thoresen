import { z } from 'zod'

export const ownerSchema = z.object({
  ownerCode: z
    .string()
    .max(20, 'Mã chủ hàng tối đa 20 ký tự')
    .optional()
    .or(z.literal('')),
  ownerName: z
    .string()
    .min(1, 'Tên chủ hàng là bắt buộc')
    .max(200, 'Tên chủ hàng tối đa 200 ký tự'),
  shortName: z
    .string()
    .max(50, 'Tên viết tắt tối đa 50 ký tự')
    .optional()
    .nullable(),
  ownerGroup: z.enum(['LOCAL', 'FOREIGN'], {
    errorMap: () => ({ message: 'Vui lòng chọn nhóm chủ hàng' }),
  }),
  ownerType: z.enum(['DOMESTIC', 'EXPORT', 'IMPORT'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại chủ hàng' }),
  }),
  taxCode: z
    .string()
    .max(20, 'Mã số thuế tối đa 20 ký tự')
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, 'Địa chỉ tối đa 500 ký tự')
    .optional()
    .nullable(),
  billingEmail: z
    .string()
    .email('Email không hợp lệ')
    .optional()
    .nullable()
    .or(z.literal('')),
  billingContact: z
    .string()
    .max(100, 'Tên liên hệ tối đa 100 ký tự')
    .optional()
    .nullable(),
  paymentTerms: z
    .string()
    .max(50, 'Điều khoản thanh toán tối đa 50 ký tự')
    .optional()
    .nullable(),
})

export const ownerDefaultValues = {
  ownerCode: '',
  ownerName: '',
  shortName: '',
  ownerGroup: 'LOCAL',
  ownerType: 'DOMESTIC',
  taxCode: '',
  address: '',
  billingEmail: '',
  billingContact: '',
  paymentTerms: '',
}
