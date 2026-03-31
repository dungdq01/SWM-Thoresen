import { z } from 'zod'

export const zoneSchema = z.object({
  zoneCode: z
    .string()
    .min(1, 'Mã zone là bắt buộc')
    .max(30, 'Mã zone tối đa 30 ký tự'),
  zoneName: z
    .string()
    .min(1, 'Tên zone là bắt buộc')
    .max(120, 'Tên zone tối đa 120 ký tự'),
  warehouseId: z
    .string()
    .min(1, 'Vui lòng chọn kho'),
  zoneType: z.enum(['RECEIVING', 'STORAGE', 'STAGING', 'SHIPPING', 'QC', 'DAMAGED', 'RETURNS'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại zone' }),
  }),
  maxCapacityMt: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0, 'Không được âm')
    .nullable()
    .optional(),
  zoneWidthM: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0.1, 'Tối thiểu 0.1m')
    .nullable()
    .optional(),
  zoneDepthM: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0.1, 'Tối thiểu 0.1m')
    .nullable()
    .optional(),
  isBillingZone: z.boolean(),
})

export const zoneDefaultValues = {
  zoneCode: '',
  zoneName: '',
  warehouseId: '',
  zoneType: 'STORAGE',
  maxCapacityMt: null,
  zoneWidthM: null,
  zoneDepthM: null,
  isBillingZone: false,
}
