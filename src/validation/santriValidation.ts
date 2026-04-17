import { z } from "zod";
import prisma from "../utils/prisma";

const MAX_FILE_SIZE = 1 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export const RegisterSantriSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long"),
  nama: z.string().min(1, "Name must be at least 1 characters long"),
  tahapHafalan: z.enum(["Level1", "Level2", "Level3"]),
  ortuId: z.array(z.number())
    .min(1, "Santri must have at least one parent.")
    .max(3, "Santri can have a maximum of three parents.")
    .refine(async (ortuIds) => {
      if (ortuIds.length === 0) return true;
      const uniqueOrtuIds = [...new Set(ortuIds)];
      const foundParents = await prisma.orangTua.count({
        where: { id: { in: uniqueOrtuIds } },
      });
      return foundParents === uniqueOrtuIds.length;
    }, {
      message: "One or more parent IDs not found in the database.",
    })
    .superRefine(async (ortuIds, ctx) => {
      const parents = await prisma.orangTua.findMany({
        where: { id: { in: ortuIds } },
        select: { tipe: true }
      });

      const parentTypesCount = parents.reduce((acc, parent) => {
        acc[parent.tipe] = (acc[parent.tipe] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      if (parentTypesCount.Ayah > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A santri can only have one Ayah."
        });
      }
      if (parentTypesCount.Ibu > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A santri can only have one Ibu."
        });
      }
      if (parentTypesCount.Wali > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A santri can only have one Wali."
        });
      }
    }),
});

export type RegisterSantriInput = z.infer<typeof RegisterSantriSchema>;

export const UpdateSantriSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  nama: z.string().min(1, "Name must be at least 1 characters long").optional(),
  tahapHafalan: z.enum(["Level1", "Level2", "Level3"]).optional(),
  ortuId: z.array(z.number())
    .min(1, "Santri must have at least one parent.")
    .max(3, "Santri can have a maximum of three parents.")
    .refine(async (ortuIds) => {
      if (ortuIds.length === 0) return true;
      const uniqueOrtuIds = [...new Set(ortuIds)];
      const foundParents = await prisma.orangTua.count({
        where: { id: { in: uniqueOrtuIds } },
      });
      return foundParents === uniqueOrtuIds.length;
    }, {
      message: "One or more parent IDs not found in the database.",
    })
    .superRefine(async (ortuIds, ctx) => {
      if (!ortuIds) return;
      const parents = await prisma.orangTua.findMany({
        where: { id: { in: ortuIds } },
        select: { tipe: true }
      });

      const parentTypesCount = parents.reduce((acc, parent) => {
        acc[parent.tipe] = (acc[parent.tipe] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      if (parentTypesCount.Ayah > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A santri can only have one Ayah."
        });
      }
      if (parentTypesCount.Ibu > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A santri can only have one Ibu."
        });
      }
      if (parentTypesCount.Wali > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A santri can only have one Wali."
        });
      }
    }).optional(),
});

export type UpdateSantriInput = z.infer<typeof UpdateSantriSchema>;
