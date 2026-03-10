import { z } from 'zod'

export const customerSchema = z.object({
  customerCode: z
    .string()
    .max(20, 'Mã khách hàng tối đa 20 ký tự')
    .optional()
    .or(z.literal('')),
  customerName: z
    .string()
    .min(1, 'Tên khách hàng là bắt buộc')
    .max(200, 'Tên khách hàng tối đa 200 ký tự'),
  shortName: z
    .string()
    .max(50, 'Tên viết tắt tối đa 50 ký tự')
    .optional()
    .nullable(),
  customerGroup: z.enum(['CORPORATE', 'INDIVIDUAL'], {
    errorMap: () => ({ message: 'Vui lòng chọn nhóm khách hàng' }),
  }),
  customerType: z.enum(['BUYER', 'CONSIGNEE', 'SHIPPER'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại khách hàng' }),
  }),
  taxCode: z
    .string()
    .max(20, 'Mã số thuế tối đa 20 ký tự')
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
    .max(100, 'Email tối đa 100 ký tự')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, 'Địa chỉ tối đa 500 ký tự')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, 'Ghi chú tối đa 1000 ký tự')
    .optional()
    .nullable(),
})

export const customerDefaultValues = {
  customerCode: '',
  customerName: '',
  shortName: '',
  customerGroup: 'CORPORATE',
  customerType: 'BUYER',
  taxCode: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}
