import { z } from "zod";

const MAX_FILE_SIZE = 1 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export const RegisterUstadzSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  nama: z.string().min(3, "Name must be at least 3 characters long"),
  nomorHp: z.string().min(10, "Phone number must be at least 10 characters long"),
  alamat: z.string().min(3, "Address must be at least 3 characters long"),
  jenisKelamin: z.enum(["L", "P"]),
  waliKelasTahap: z.enum(["Level1", "Level2", "Level3"]).nullable().optional(),
  fotoProfil: z
    .any()
    .optional()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      "Ukuran file maksimal 1MB"
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.mimetype),
      "Format gambar tidak didukung"
    ),
});

export type RegisterUstadzInput = z.infer<typeof RegisterUstadzSchema>;
  
export const UpdateUstadzSchema = z.object({
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  nama: z.string().min(3, "Name must be at least 3 characters long").optional(),
  nomorHp: z.string().min(10, "Phone number must be at least 10 characters long").optional(),
  alamat: z.string().min(3, "Address must be at least 3 characters long").optional(),
  jenisKelamin: z.enum(["L", "P"]).optional(),
  waliKelasTahap: z.enum(["Level1", "Level2", "Level3"]).nullable().optional(),
  fotoProfil: z
    .any()
    .optional()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      "Ukuran file maksimal 1MB"
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.mimetype),
      "Format gambar tidak didukung"
    ),
});

export type UpdateUstadzInput = z.infer<typeof UpdateUstadzSchema>;
