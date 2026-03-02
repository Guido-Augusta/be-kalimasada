import { z } from 'zod';

export const SimpanHafalanSchema = z
  .object({
    santriId: z.number().min(1, 'Santri ID is required'),
    ustadzId: z.number().optional(),
    ayatIds: z.array(z.number()).min(1, 'At least one ayat is required'),
    status: z.enum(['TambahHafalan', 'Murajaah']),
    kualitas: z.enum(['Kurang', 'Cukup', 'Baik', 'SangatBaik']).optional(),
    keterangan: z.enum(['Mengulang', 'Lanjut']).optional(),
    catatan: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'TambahHafalan') {
      if (!data.kualitas) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Kualitas is required for TambahHafalan',
          path: ['kualitas'],
        });
      }
      if (!data.keterangan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Keterangan is required for TambahHafalan',
          path: ['keterangan'],
        });
      }
    } else if (data.status === 'Murajaah') {
      if (!data.keterangan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Keterangan is required for Murajaah',
          path: ['keterangan'],
        });
      }
    }
  });

export type SimpanHafalanInput = z.infer<typeof SimpanHafalanSchema>;

export const SimpanHafalanByHalamanSchema = z
  .object({
    santriId: z.number().min(1, 'Santri ID is required'),
    ustadzId: z.number().optional(),
    halamanAwal: z.number().min(1, 'Halaman awal is required'),
    halamanAkhir: z.number().min(1, 'Halaman akhir is required'),
    status: z.enum(['TambahHafalan', 'Murajaah']),
    kualitas: z.enum(['Kurang', 'Cukup', 'Baik', 'SangatBaik']).optional(),
    keterangan: z.enum(['Mengulang', 'Lanjut']).optional(),
    catatan: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'TambahHafalan') {
      if (!data.kualitas) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Kualitas is required for TambahHafalan',
          path: ['kualitas'],
        });
      }
      if (!data.keterangan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Keterangan is required for TambahHafalan',
          path: ['keterangan'],
        });
      }
    } else if (data.status === 'Murajaah') {
      if (!data.keterangan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Keterangan is required for Murajaah',
          path: ['keterangan'],
        });
      }
    }
  });

export type SimpanHafalanByHalamanInput = z.infer<
  typeof SimpanHafalanByHalamanSchema
>;
