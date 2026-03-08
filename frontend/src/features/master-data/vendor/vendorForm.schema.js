import { z } from 'zod'

export const vendorSchema = z.object({
  vendorCode: z
    .string()
    .min(1, 'Mã nhà cung cấp là bắt buộc')
    .max(20, 'Mã nhà cung cấp tối đa 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã chỉ chứa chữ in hoa, số, dấu gạch ngang và gạch dưới'),
  vendorName: z
    .string()
    .min(1, 'Tên nhà cung cấp là bắt buộc')
    .max(200, 'Tên nhà cung cấp tối đa 200 ký tự'),
  supplierGroup: z.enum(['VESSEL', 'TRUCK', 'BARGE', 'OTHER'], {
    errorMap: () => ({ message: 'Vui lòng chọn nhóm nhà cung cấp' }),
  }),
  countryRegion: z
    .string()
    .max(10, 'Mã quốc gia tối đa 10 ký tự')
    .optional()
    .nullable(),
  vesselName: z
    .string()
    .max(100, 'Tên tàu tối đa 100 ký tự')
    .optional()
    .nullable(),
  contactName: z
    .string()
    .max(100, 'Tên liên hệ tối đa 100 ký tự')
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, 'Số điện thoại tối đa 20 ký tự')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('Email không hợp lệ')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export const vendorDefaultValues = {
  vendorCode: '',
  vendorName: '',
  supplierGroup: 'VESSEL',
  countryRegion: 'VN',
  vesselName: '',
  contactName: '',
  phone: '',
  email: '',
}
