import { z } from 'zod'

export const itemIncompatibilitySchema = z.object({
  ruleType: z.enum(['ITEM_TO_ITEM', 'ITEM_TO_GROUP', 'GROUP_TO_GROUP'], {
    required_error: 'Chọn loại quy tắc',
  }),
  itemId: z.string().optional().nullable(),
  itemGroupId: z.string().optional().nullable(),
  incompatibleWithItemId: z.string().optional().nullable(),
  incompatibleWithGroupId: z.string().optional().nullable(),
  reason: z.string().min(1, 'Vui lòng nhập lý do'),
})

export const itemIncompatibilityDefaultValues = {
  ruleType: 'ITEM_TO_ITEM',
  itemId: '',
  itemGroupId: '',
  incompatibleWithItemId: '',
  incompatibleWithGroupId: '',
  reason: '',
}
