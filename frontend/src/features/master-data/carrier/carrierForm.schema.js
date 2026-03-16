import { z } from 'zod'

export const carrierSchema = z.object({
  carrierName: z.string().min(1, 'Tên nhà vận chuyển là bắt buộc').max(200, 'Tên tối đa 200 ký tự'),
  contactName: z.string().max(100, 'Tối đa 100 ký tự').optional().nullable(),
  phone: z.string().max(20, 'Tối đa 20 ký tự').optional().nullable(),
  carrierGroup: z.enum(['TRUCKING', 'SHIPPING_LINE', 'FREIGHT_FORWARDER', 'BARGE_OPERATOR', 'OTHER'], {
    errorMap: () => ({ message: 'Vui lòng chọn nhóm' }),
  }),
  transportMode: z.enum(['TRUCK', 'VESSEL', 'BARGE', 'CONTAINER', 'RAIL'], {
    errorMap: () => ({ message: 'Vui lòng chọn phương thức' }),
  }),
  defaultVehicleTypeCode: z.string().max(50).optional().nullable(),
})

export const carrierDefaultValues = {
  carrierName: '',
  contactName: '',
  phone: '',
  carrierGroup: 'TRUCKING',
  transportMode: 'TRUCK',
  defaultVehicleTypeCode: '',
}
