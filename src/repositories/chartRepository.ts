import { subDays } from 'date-fns';
import { prisma } from '../utils/prisma';

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function startOfDayJakarta(date: Date): Date {
  const wib = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - JAKARTA_OFFSET_MS);
}

function endOfDayJakarta(date: Date): Date {
  const wib = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  wib.setUTCHours(23, 59, 59, 999);
  return new Date(wib.getTime() - JAKARTA_OFFSET_MS);
}

export async function getRiwayatHafalanByRange(
  santriId: number,
  daysRange: number
) {
  const now = new Date();
  const endDate = endOfDayJakarta(now);
  const startDate = startOfDayJakarta(subDays(now, daysRange - 1));

  return prisma.riwayatHafalan.findMany({
    where: {
      santriId,
      tanggalHafalan: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      ayatId: true,
      tanggalHafalan: true,
      status: true,
      ayat: {
        select: {
          nomorAyat: true,
          halaman: true,
        },
      },
    },
  });
}
