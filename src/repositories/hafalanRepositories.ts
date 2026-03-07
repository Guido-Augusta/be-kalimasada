import { StatusHafalan, TahapHafalan } from "@prisma/client";
import { prisma } from "../utils/prisma";

const JAKARTA_OFFSET_HOURS = 7;

function getJakartaDateRange(tanggal: string): { startDate: Date; endDate: Date } {
  const baseDate = new Date(tanggal + "T00:00:00.000Z");
  const offsetMs = JAKARTA_OFFSET_HOURS * 60 * 60 * 1000;
  const startDate = new Date(baseDate.getTime() - offsetMs);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

export type CreateManyHafalanPayload = {
  santriId: number;
  ustadzId: number;
  ayatId: number;
  tanggalHafalan: Date;
  status: 'TambahHafalan' | 'Murajaah';
  kualitas?: 'Kurang' | 'Cukup' | 'Baik' | 'SangatBaik';
  keterangan?: 'Mengulang' | 'Lanjut';
  catatan?: string;
  poinDidapat: number;
};

export const HafalanRepository = {
  getAllSurah: () =>
    prisma.surah.findMany({
      select: { id: true, nomor: true, nama: true, namaLatin: true, totalAyat: true },
      orderBy: { nomor: "asc" },
    }),

  getAllJuz: () =>
    prisma.ayat.groupBy({
      by: ["juz"],
      orderBy: { juz: "asc" },
    }),

  getAyatByJuz: (juz: number) =>
    prisma.ayat.findMany({
      where: { juz },
      select: { id: true, nomorAyat: true, surahId: true },
    }),

  getAyatByJuzWithSurah: (juz: number) =>
    prisma.ayat.findMany({
      where: { juz },
      select: {
        id: true,
        nomorAyat: true,
        surah: {
          select: {
            nomor: true,
            nama: true,
            namaLatin: true
          }
        }
      },
      orderBy: [
        { surahId: 'asc' },
        { nomorAyat: 'asc' }
      ]
    }),

  getAyatDetailByJuz: (juz: number) =>
    prisma.ayat.findMany({
      where: { juz },
      select: {
        id: true,
        nomorAyat: true,
        arab: true,
        latin: true,
        terjemah: true,
        halaman: true,
        surah: {
          select: {
            id: true,
            nomor: true,
            nama: true,
            namaLatin: true
          }
        }
      },
      orderBy: [
        { surahId: 'asc' },
        { nomorAyat: 'asc' }
      ]
    }),

  getHafalanByAyatIds: (santriId: number, ayatIds: number[], status?: string) =>
    prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        ayatId: { in: ayatIds },
        ...(status && { status: status as StatusHafalan }),
      },
      select: { ayatId: true, kualitas: true, keterangan: true },
      orderBy: { tanggalHafalan: 'desc' },
    }),

  getAyatByHalamanRange: (halamanAwal: number, halamanAkhir: number) =>
    prisma.ayat.findMany({
      where: {
        halaman: {
          gte: halamanAwal,
          lte: halamanAkhir,
        },
      },
      select: {
        id: true,
        nomorAyat: true,
        surahId: true,
        halaman: true,
      },
      orderBy: [
        { surahId: 'asc' },
        { nomorAyat: 'asc' }
      ]
    }),

  getSantriById: (id: number) =>
    prisma.santri.findUnique({
      where: { id },
      select: {
        id: true,
        nama: true,
        tahapHafalan: true,
        totalPoin: true,
        noInduk: true,
        orangTua: {
          select: {
            id: true,
            nama: true,
            user: {
              select: { email: true }
            }
          }
        }
      },
      }),

  getHafalanSantri: (santriId: number) =>
    prisma.riwayatHafalan.groupBy({
      by: ["ayatId"],
      where: { santriId, status: "TambahHafalan", keterangan: "Lanjut" },
    }),

  countAyatHafal: (surahId: number, ayatIds: number[]) =>
    prisma.ayat.count({
      where: { surahId, id: { in: ayatIds } },
    }),

  // Detail surah
  getAyatSurah: (surahId: number) =>
    prisma.ayat.findMany({
      where: { surahId },
      orderBy: { nomorAyat: "asc" },
      select: { id: true, nomorAyat: true, arab: true, latin: true, terjemah: true, juz: true },
    }),

  getHafalanBySurah: (santriId: number, surahId: number, status?: string) =>
    prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        ayat: { surahId },
        ...(status && { status: status as StatusHafalan }),
      },
      select: { ayatId: true, kualitas: true, keterangan: true },
      orderBy: { tanggalHafalan: 'desc' },
    }),

  getSurahById: (id: number) =>
    prisma.surah.findUnique({
      where: { id },
      select: { id: true, nama: true, namaLatin: true, totalAyat: true, nomor: true, audio: true },
    }),

  // Simpan Hafalan
  findExistingHafalan: (santriId: number, ayatIds: number[]) =>
    prisma.riwayatHafalan.findMany({
      where: { santriId, ayatId: { in: ayatIds }, status: "TambahHafalan" },
      select: { ayatId: true },
    }),

  // Find ayats that have already received points from TambahHafalan + Lanjut
  findAyatWithPoin: (santriId: number, ayatIds: number[]) =>
    prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        ayatId: { in: ayatIds },
        status: "TambahHafalan",
        poinDidapat: { gt: 0 },
      },
      select: { ayatId: true },
    }),

  createManyHafalan: (data: CreateManyHafalanPayload[]) =>
    prisma.riwayatHafalan.createMany({ data, skipDuplicates: true }),

  // Riwayat Hafalan
  getRiwayatHafalanBySantri: (santriId: number, status?: string) =>
    prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        ...(status && { status: status as StatusHafalan })
      },
      orderBy: { tanggalHafalan: "desc" },
      select: {
        tanggalHafalan: true,
        status: true,
        poinDidapat: true,
        ayat: {
          select: {
            id: true,
            nomorAyat: true,
            halaman: true,
            juz: true,
            surah: {
              select: {
                id: true,
                nama: true,
                namaLatin: true
              },
            },
          },
        },
      },
    }),

  getAyatIdsBySurahId: (surahId: number) =>
    prisma.ayat.findMany({
      where: { surahId },
      select: { id: true },
    }),
  
  deleteHafalanByDateSurahStatus: (santriId: number, ayatIds: number[], tanggal: string, status: string) => {
    const { startDate, endDate } = getJakartaDateRange(tanggal);
  
    return prisma.riwayatHafalan.deleteMany({
      where: {
        santriId,
        tanggalHafalan: {
          gte: startDate,
          lt: endDate,
        },
        status: status as StatusHafalan,
        ayatId: {
          in: ayatIds,
        },
      },
    });
  },

  getPoinHafalanToDelete: (santriId: number, ayatIds: number[], tanggal: string, status: string) => {
    const { startDate, endDate } = getJakartaDateRange(tanggal);

    return prisma.riwayatHafalan.aggregate({
      where: {
        santriId,
        tanggalHafalan: {
          gte: startDate,
          lt: endDate,
        },
        status: status as StatusHafalan,
        ayatId: {
          in: ayatIds,
        },
      },
      _sum: {
        poinDidapat: true,
      },
    });
  },

  updateSantriTotalPoin: (santriId: number, poin: number) =>
    prisma.santri.update({
      where: { id: santriId },
      data: {
        totalPoin: {
          increment: poin,
        },
        poinUpdatedAt: new Date()
      },
    }),

  getOrangTuaById: (id: number) =>
    prisma.orangTua.findUnique({
      where: { id },
      select: { nama: true, user: { select: { email: true } } },
    }),
  
  getAyatDetailByIds: (ids: number[]) =>
    prisma.ayat.findMany({
      where: { id: { in: ids } },
      select: { surahId: true, nomorAyat: true },
    }),

  getDetailRiwayatAyat: (santriId: number, surahId: number, startDate: Date, endDate: Date, status: string) =>
    prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        status: status as StatusHafalan,
        tanggalHafalan: {
          gte: startDate,
          lt: endDate,
        },
        ayat: {
          surahId,
        },
      },
      select: {
        status: true,
        poinDidapat: true,
        kualitas: true,
        keterangan: true,
        ayat: {
          select: {
            id: true,
            nomorAyat: true,
            arab: true,
            latin: true,
            terjemah: true,
            juz: true,
            surah: {
              select: {
                id: true,
                nama: true,
                namaLatin: true
              },
            },
          },
        },
        ustadz: {
          select: { id: true, nama: true}
        },
        catatan: true,
      },
      orderBy: {
        tanggalHafalan: 'desc',
      },
    }),

  getDetailRiwayatAyatByJuz: (santriId: number, juzId: number, startDate: Date, endDate: Date, status: string) =>
    prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        status: status as StatusHafalan,
        tanggalHafalan: {
          gte: startDate,
          lt: endDate,
        },
        ayat: {
          juz: juzId,
        },
      },
      select: {
        status: true,
        poinDidapat: true,
        kualitas: true,
        keterangan: true,
        ayat: {
          select: {
            id: true,
            nomorAyat: true,
            arab: true,
            latin: true,
            terjemah: true,
            halaman: true,
            juz: true,
            surah: {
              select: {
                id: true,
                nama: true,
                namaLatin: true
              },
            },
          },
        },
        ustadz: {
          select: { id: true, nama: true}
        },
        catatan: true,
      },
      orderBy: {
        tanggalHafalan: 'desc',
      },
    }),

  getOrangTuaBySantriId: (santriId: number) =>
    prisma.orangTua.findMany({
      where: {
        santri: {
          some: {
            id: santriId,
          },
        },
      },
      select: {
        nama: true,
        user: {
          select: { email: true },
        },
      },
    }),
    
  getAllSantriWithLatestHafalan: async (tahapHafalan?: string, status?: string, name?: string) => {
    const santriList = await prisma.santri.findMany({
    where: {
      ...(tahapHafalan && { tahapHafalan: tahapHafalan as TahapHafalan }),
      ...(name && { nama: 
        {
          contains: name,
          mode: "insensitive",
        }
      }),
    },
    select: {
      id: true,
      nama: true,
      noInduk: true,
      tahapHafalan: true,
      riwayatHafalan: {
        orderBy: {
          tanggalHafalan: 'desc',
        },
        where: {
          ...(status && { status: status as StatusHafalan }),
        },
        select: {
          id: true,
          tanggalHafalan: true,
          status: true,
          ayat: {
            select: {
              juz: true,
              halaman: true,
              surah: {
                select: {
                  namaLatin: true,
                  id: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { tahapHafalan: 'asc' },
      // { nama: 'asc' },
      { id: 'asc' },
    ],
    });
      
    return santriList;
  },
  
  countAllSantri: (tahapHafalan?: string, name?: string) => 
    prisma.santri.count({
      where: {
        ...(tahapHafalan && { tahapHafalan: tahapHafalan as TahapHafalan }),
        ...(name && { nama: 
          {
              contains: name,
              mode: "insensitive",
            }
          }),
        },
      }),

  getAyatDetailByRiwayatId: (riwayatId: number, santriId: number, status: StatusHafalan) =>
    prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        status,
        id: riwayatId,
      },
      select: {
        ayatId: true,
        tanggalHafalan: true,
        status: true,
        ayat: {
          select: {
            surahId: true,
          },
        },
      },
    }),

  getGroupedAyatByDateSurahStatus: (santriId: number, surahId: number, tanggal: Date, status: StatusHafalan) => {
    const startDate = new Date(tanggal);
    const endDate = new Date(tanggal);
    endDate.setDate(endDate.getDate() + 1);
    
    return prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        status,
        tanggalHafalan: {
          gte: startDate,
          lt: endDate,
        },
        ayat: { surahId },
      },
      select: {
        ayat: {
          select: {
            nomorAyat: true,
            halaman: true,
          }
        },
      },
      orderBy: {
        ayat: { nomorAyat: 'asc' }
      },
    });
  },

  getGroupedAyatByDateJuzStatus: (santriId: number, juz: number, tanggal: Date, status: StatusHafalan) => {
    const startDate = new Date(tanggal);
    const endDate = new Date(tanggal);
    endDate.setDate(endDate.getDate() + 1);

    return prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        status,
        tanggalHafalan: {
          gte: startDate,
          lt: endDate,
        },
        ayat: { juz },
      },
      select: {
        ayat: {
          select: {
            nomorAyat: true,
            halaman: true,
            juz: true,
            surah: {
              select: {
                id: true,
                nama: true,
                namaLatin: true,
              }
            }
          }
        },
      },
      orderBy: [
        { ayat: { surahId: 'asc' } },
        { ayat: { nomorAyat: 'asc' } }
      ],
    });
  },

  getAllAyatByDateAndStatus: (santriId: number, tanggal: Date, status: StatusHafalan) => {
    const startDate = new Date(tanggal);
    const endDate = new Date(tanggal);
    endDate.setDate(endDate.getDate() + 1);

    return prisma.riwayatHafalan.findMany({
      where: {
        santriId,
        status,
        tanggalHafalan: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        ayat: {
          select: {
            nomorAyat: true,
            halaman: true,
            juz: true,
            surah: {
              select: {
                id: true,
                nama: true,
                namaLatin: true,
              }
            }
          }
        },
      },
      orderBy: [
        { ayat: { halaman: 'asc' } },
        { ayat: { surahId: 'asc' } },
        { ayat: { nomorAyat: 'asc' } }
      ],
    });
  },
};
