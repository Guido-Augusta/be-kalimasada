import { z } from "zod";

export const SurahPilihanSchema = z.object({
  nameSurah: z.string().min(3, "Nama surah harus terdiri dari minimal 3 karakter"),
});

export type SurahPilihanInput = z.infer<typeof SurahPilihanSchema>;
