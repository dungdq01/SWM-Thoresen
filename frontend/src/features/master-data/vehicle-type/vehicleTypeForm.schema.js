import { z } from 'zod'

export const vehicleTypeSchema = z.object({
  vehicleTypeCode: z
    .string()
    .min(1, 'Mã loại phương tiện là bắt buộc')
    .max(30, 'Mã tối đa 30 ký tự')
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z0-9_-]+$/.test(val), {
      message: 'Mã chỉ chứa chữ cái, số, dấu gạch ngang và gạch dưới',
    }),
  vehicleTypeName: z
    .string()
    .min(1, 'Tên loại phương tiện là bắt buộc')
    .max(150, 'Tên tối đa 150 ký tự'),
  category: z.enum(['TRUCK', 'TRAILER', 'CONTAINER_TRUCK', 'FORKLIFT', 'CRANE'], {
    errorMap: () => ({ message: 'Vui lòng chọn phân loại' }),
  }),
  defaultTareWeightKg: z.number({ invalid_type_error: 'Phải là số' }).min(0, 'Không được âm').optional().nullable(),
  maxPayloadKg: z.number({ invalid_type_error: 'Phải là số' }).min(0, 'Không được âm').optional().nullable(),
  teuEquivalent: z.number({ invalid_type_error: 'Phải là số' }).min(0, 'Không được âm').optional().nullable(),
})

export const vehicleTypeDefaultValues = {
  vehicleTypeCode: '',
  vehicleTypeName: '',
  category: 'TRUCK',
  defaultTareWeightKg: null,
  maxPayloadKg: null,
  teuEquivalent: null,
}
