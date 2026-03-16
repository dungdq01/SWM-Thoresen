import { z } from 'zod'

export const itemGroupSchema = z.object({
  itemGroupName: z
    .string()
    .min(1, 'Tên nhóm là bắt buộc')
    .max(150, 'Tên tối đa 150 ký tự'),
  description: z
    .string()
    .max(500, 'Mô tả tối đa 500 ký tự')
    .optional()
    .nullable(),
  cargoForm: z.enum(['BULK', 'BAGGED_25KG', 'BAGGED_40KG', 'BAGGED_50KG', 'JUMBO', 'PACKAGING', 'CONTAINER', 'DRUM', 'PALLET', 'OTHER'], {
    errorMap: () => ({ message: 'Vui lòng chọn hình thức' }),
  }),
})

export const itemGroupDefaultValues = {
  itemGroupName: '',
  description: '',
  cargoForm: 'BULK',
}
