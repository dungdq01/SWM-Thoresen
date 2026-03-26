import { z } from 'zod'

export const itemGroupSchema = z.object({
  itemGroupName: z
    .string()
    .min(1, 'Tên nhóm là bắt buộc')
    .max(150, 'Tên tối đa 150 ký tự'),
  cargoForm: z.enum(['BULK', 'BAGGED_25KG', 'BAGGED_40KG', 'BAGGED_50KG', 'JUMBO', 'PACKAGING', 'CONTAINER', 'DRUM', 'PALLET', 'OTHER'], {
    errorMap: () => ({ message: 'Vui lòng chọn chế độ' }),
  }),
  warehouseIds: z.array(z.string().uuid()).optional().default([]),
  weighbridgeQtyUomId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const itemGroupDefaultValues = {
  itemGroupName: '',
  cargoForm: 'BULK',
  warehouseIds: [],
  weighbridgeQtyUomId: null,
  isActive: true,
}
