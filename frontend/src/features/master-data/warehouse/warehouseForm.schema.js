import { z } from 'zod'

export const warehouseSchema = z.object({
  warehouseCode: z
    .string()
    .min(1, 'Mã kho là bắt buộc')
    .max(20, 'Mã kho tối đa 20 ký tự'),
  warehouseName: z
    .string()
    .min(1, 'Tên kho là bắt buộc')
    .max(200, 'Tên kho tối đa 200 ký tự'),
  warehouseType: z.enum(['COVERED', 'OPEN_YARD'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại kho' }),
  }),
  lengthM: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Phải lớn hơn 0')
    .optional()
    .nullable(),
  widthM: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Phải lớn hơn 0')
    .optional()
    .nullable(),
  totalAreaM2: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Phải lớn hơn 0')
    .optional()
    .nullable(),
  usableAreaM2: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Phải lớn hơn 0')
    .optional()
    .nullable(),
  maxHeightM: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Phải lớn hơn 0')
    .optional()
    .nullable(),
  maxCapacityMt: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Phải lớn hơn 0')
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, 'Địa chỉ tối đa 500 ký tự')
    .optional()
    .nullable(),
  hasWeighbridge: z.boolean().default(false),
  weighbridgeCount: z
    .number({ invalid_type_error: 'Phải là số' })
    .int('Phải là số nguyên')
    .min(0, 'Không được âm')
    .optional()
    .nullable(),
  capacityWarningPct: z
    .number({ invalid_type_error: 'Phải là số' })
    .min(0, 'Không được âm')
    .max(100, 'Tối đa 100%')
    .optional()
    .nullable(),
  ownerId: z.string().uuid().optional().nullable(),
})

export const warehouseDefaultValues = {
  warehouseCode: '',
  warehouseName: '',
  warehouseType: 'COVERED',
  lengthM: null,
  widthM: null,
  totalAreaM2: null,
  usableAreaM2: null,
  maxHeightM: null,
  maxCapacityMt: null,
  address: '',
  hasWeighbridge: false,
  weighbridgeCount: null,
  capacityWarningPct: 85,
  ownerId: null,
}
