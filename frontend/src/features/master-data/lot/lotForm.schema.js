import { z } from 'zod'

export const lotSchema = z.object({
  itemId: z.string().min(1, 'Vui lòng chọn mặt hàng'),
  ownerId: z.string().min(1, 'Vui lòng chọn chủ hàng'),
  warehouseId: z.string().min(1, 'Vui lòng chọn kho'),
  firstReceivedDate: z.string().optional(),
  sourceLotId: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
})

export const lotDefaultValues = {
  itemId: '',
  ownerId: '',
  warehouseId: '',
  firstReceivedDate: '',
  sourceLotId: '',
  status: 'ACTIVE',
  notes: '',
}
