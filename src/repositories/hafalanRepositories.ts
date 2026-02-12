import { StatusHafalan, TahapHafalan } from "@prisma/client";
import { prisma } from "../utils/prisma";

export type CreateManyHafalanPayload = {
  santriId: number;
  ustadzId: number;
  ayatId: number;
  tanggalHafalan: Date;
  status: 'TambahHafalan' | 'Murajaah'; 
  catatan: string;
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
      select: { ayatId: true },
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
      where: { santriId, status: "TambahHafalan" },
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
      select: { ayatId: true },
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
            nomorAyat: true,
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
    const startDate = new Date(tanggal);
    const endDate = new Date(tanggal);
    endDate.setDate(endDate.getDate() + 1);
  
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
    const startDate = new Date(tanggal);
    const endDate = new Date(tanggal);
    endDate.setDate(endDate.getDate() + 1);

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
        ayat: {
          nomorAyat: "asc",
        },
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
        take: 1,
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
            nomorAyat: true
          }
        },
      },
      orderBy: {
        ayat: { nomorAyat: 'asc' }
      },
    });
  },
};