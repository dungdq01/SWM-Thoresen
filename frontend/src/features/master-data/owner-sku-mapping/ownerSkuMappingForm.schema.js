import { z } from 'zod'

export const ownerSkuMappingSchema = z.object({
  ownerId: z.string().min(1, 'Chủ hàng là bắt buộc'),
  itemId: z.string().min(1, 'SKU toàn cục là bắt buộc'),
  ownerSkuCode: z.string().min(1, 'Mã SKU chủ hàng là bắt buộc'),
  ownerSkuName: z.string().min(1, 'Tên SKU chủ hàng là bắt buộc'),
  billingClass: z.string().min(1, 'Billing Class là bắt buộc'),
  isActive: z.boolean().default(true),
})

export const ownerSkuMappingDefaultValues = {
  ownerId: '',
  itemId: '',
  ownerSkuCode: '',
  ownerSkuName: '',
  billingClass: 'ST01',
  isActive: true,
}
