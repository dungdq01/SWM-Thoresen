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
  locationWidthM: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0.1, 'Tối thiểu 0.1m')
    .nullable()
    .optional(),
  locationDepthM: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0.1, 'Tối thiểu 0.1m')
    .nullable()
    .optional(),
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
  doorConfig: z
    .object({
      doors: z.array(
        z.object({ wall: z.enum(['front', 'back', 'left', 'right']) })
      ),
    })
    .nullable()
    .optional(),
})

export const locationDefaultValues = {
  locationCode: '',
  warehouseId: '',
  zoneId: '',
  locationType: 'STORAGE',
  locationProfile: 'STANDARD',
  locationWidthM: null,
  locationDepthM: null,
  areaM2: null,
  stackLimitKg: null,
  doorConfig: { doors: [{ wall: 'front' }] },
}
