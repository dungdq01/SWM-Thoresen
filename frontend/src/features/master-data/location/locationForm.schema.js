import { z } from 'zod'

export const locationSchema = z.object({
  locationCode: z
    .string()
    .min(1, 'Mã vị trí là bắt buộc')
    .max(30, 'Mã vị trí tối đa 30 ký tự'),
  warehouseId: z
    .string()
    .min(1, 'Vui lòng chọn kho'),
  zoneId: z
    .string()
    .min(1, 'Vui lòng chọn zone'),
  locationType: z.enum(['RECEIVING', 'STORAGE', 'STAGING', 'SHIPPING', 'QC', 'DAMAGED', 'RETURNS', 'VIRTUAL'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại vị trí' }),
  }),
  locationProfile: z.enum(['STANDARD', 'BULK', 'HEAVY']).optional().default('STANDARD'),
  areaM2: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0, 'Không được âm')
    .nullable()
    .optional(),
  stackLimitKg: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0, 'Không được âm')
    .nullable()
    .optional(),
})

export const locationDefaultValues = {
  locationCode: '',
  warehouseId: '',
  zoneId: '',
  locationType: 'STORAGE',
  locationProfile: 'STANDARD',
  areaM2: null,
  stackLimitKg: null,
}
