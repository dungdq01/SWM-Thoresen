import { z } from 'zod'

export const vesselSchema = z.object({
  vesselName: z.string().min(1, 'Tên tàu là bắt buộc'),
  imoNumber: z.string().optional(),
  vesselType: z.enum(['BULK_CARRIER', 'BARGE', 'GENERAL_CARGO', 'CONTAINER', 'TANKER', 'OTHER']),
  nationality: z.string().optional(),
  dwtTon: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nonnegative().nullable().optional()),
  loaM: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nonnegative().nullable().optional()),
  beamM: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nonnegative().nullable().optional()),
  draftM: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nonnegative().nullable().optional()),
  callSign: z.string().optional(),
  yearBuilt: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(1900).max(2100).nullable().optional()),
  owner: z.string().optional(),
  operator: z.string().optional(),
  notes: z.string().optional(),
})

export const vesselDefaultValues = {
  vesselName: '',
  imoNumber: '',
  vesselType: 'BULK_CARRIER',
  nationality: 'Vietnam',
  dwtTon: '',
  loaM: '',
  beamM: '',
  draftM: '',
  callSign: '',
  yearBuilt: new Date().getFullYear(),
  owner: '',
  operator: '',
  notes: '',
}
