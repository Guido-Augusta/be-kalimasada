import { subDays, endOfDay, startOfDay } from "date-fns";
import { prisma } from "../utils/prisma";

export async function getRiwayatHafalanByRange(
  santriId: number,
  daysRange: number
) {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, daysRange - 1))

  return prisma.riwayatHafalan.findMany({
    where: {
      santriId,
      tanggalHafalan: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      tanggalHafalan: true,
      status: true,
      ayat: {
        select: {
          nomorAyat: true,
        },
      },
    },
  });
}