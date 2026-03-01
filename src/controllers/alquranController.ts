import { prisma } from '../utils/prisma';
import { Request, Response } from 'express';
import { cacheGet, cacheSet, cacheGetParsed } from '../services/cacheService';

const CACHE_TTL_24H = 86400;

export const getAlquran = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'alquran:surah';
    const cached = await cacheGetParsed<unknown[]>(cacheKey);
    if (cached) {
      return res
        .status(200)
        .json({
          message: `Alquran data fetched successfully ${cached.length} surah`,
          status: 200,
          data: cached,
        });
    }

    const surah = await prisma.surah.findMany({
      orderBy: {
        nomor: 'asc',
      },
    });

    await cacheSet(cacheKey, surah, CACHE_TTL_24H);
    return res
      .status(200)
      .json({
        message: `Alquran data fetched successfully ${surah.length} surah`,
        status: 200,
        data: surah,
      });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res
        .status(500)
        .json({ message: `Internal server error`, status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: `Internal server error`, status: 500 });
    }
  }
};

export const getSurahByNumber = async (req: Request, res: Response) => {
  try {
    const surahNumber = Number(req.params.nomor);
    const cacheKey = `alquran:surah:${surahNumber}`;

    const cached = await cacheGetParsed<{
      status: boolean;
      nomor: number;
      nama: string;
      jumlah_ayat: number;
      nama_latin: string;
      arti: string;
      tempat_turun: string;
      deskripsi: string;
      audio: string;
      ayat: unknown[];
    }>(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const surah = await prisma.surah.findUnique({
      where: {
        nomor: surahNumber,
      },
      include: {
        ayat: {
          orderBy: { nomorAyat: 'asc' },
          select: {
            id: true,
            surahId: true,
            nomorAyat: true,
            arab: true,
            latin: true,
            terjemah: true,
            juz: true,
          },
        },
      },
    });

    if (!surah) {
      return res.status(404).json({
        status: false,
        message: `Surah ${req.params.nomor} not found`,
      });
    }

    const formattedResponse = {
      status: true,
      nomor: surah.nomor,
      nama: surah.nama,
      jumlah_ayat: surah.totalAyat,
      nama_latin: surah.namaLatin,
      arti: surah.arti,
      tempat_turun: surah.tempatTurun.toLowerCase(),
      deskripsi: surah.deskripsi,
      audio: surah.audio,
      ayat: surah.ayat.map((ayat) => ({
        id: ayat.id,
        surah: ayat.surahId,
        nomor: ayat.nomorAyat,
        ar: ayat.arab,
        tr: ayat.latin,
        idn: ayat.terjemah,
        juz: ayat.juz,
      })),
    };

    await cacheSet(cacheKey, formattedResponse, CACHE_TTL_24H);
    return res.status(200).json(formattedResponse);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({
        status: false,
        message: `Internal server error`,
      });
    } else {
      return res.status(500).json({
        status: false,
        message: `Internal server error`,
      });
    }
  }
};

export const getAllJuz = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'alquran:juz:list';
    const cached = await cacheGetParsed<unknown>(cacheKey);
    if (cached) {
      return res
        .status(200)
        .json({
          message: 'Juz list fetched successfully',
          status: 200,
          data: cached,
        });
    }

    const juzList = await prisma.ayat.groupBy({
      by: ['juz'],
      where: {
        juz: {
          not: null,
        },
      },
      orderBy: {
        juz: 'asc',
      },
    });

    const formattedJuz = await Promise.all(
      juzList.map(async (item) => {
        const firstAyat = await prisma.ayat.findFirst({
          where: {
            juz: item.juz,
          },
          include: {
            surah: {
              select: {
                nomor: true,
                nama: true,
                namaLatin: true,
              },
            },
          },
          orderBy: [{ surahId: 'asc' }, { nomorAyat: 'asc' }],
        });

        const totalAyat = await prisma.ayat.count({
          where: {
            juz: item.juz,
          },
        });

        return {
          juz: item.juz,
          mulai_dari: firstAyat
            ? {
                surah: {
                  nomor: firstAyat.surah.nomor,
                  nama: firstAyat.surah.nama,
                  nama_latin: firstAyat.surah.namaLatin,
                },
                ayat: firstAyat.nomorAyat,
              }
            : null,
          total_ayat: totalAyat,
        };
      })
    );

    await cacheSet(cacheKey, formattedJuz, CACHE_TTL_24H);
    return res.status(200).json({
      message: 'Juz list fetched successfully',
      status: 200,
      data: formattedJuz,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({
        message: 'Internal server error',
        status: 500,
      });
    } else {
      return res.status(500).json({
        message: 'Internal server error',
        status: 500,
      });
    }
  }
};

export const getJuzById = async (req: Request, res: Response) => {
  try {
    const juzId = Number(req.params.idjuz);
    const cacheKey = `alquran:juz:${juzId}`;

    const cached = await cacheGetParsed<unknown>(cacheKey);
    if (cached) {
      return res
        .status(200)
        .json({
          message: `Juz ${juzId} fetched successfully`,
          status: 200,
          data: cached,
        });
    }

    if (isNaN(juzId) || juzId < 1 || juzId > 30) {
      return res.status(400).json({
        message: 'Invalid juz number. Must be between 1 and 30',
        status: 400,
      });
    }

    const ayatInJuz = await prisma.ayat.findMany({
      where: {
        juz: juzId,
      },
      include: {
        surah: {
          select: {
            nomor: true,
            nama: true,
            namaLatin: true,
          },
        },
      },
      orderBy: [{ surahId: 'asc' }, { nomorAyat: 'asc' }],
    });

    if (ayatInJuz.length === 0) {
      return res.status(404).json({
        message: `Juz ${juzId} not found`,
        status: 404,
      });
    }

    const halamanSet = new Set<number>();
    ayatInJuz.forEach((ayat) => {
      if (ayat.halaman) {
        halamanSet.add(ayat.halaman);
      }
    });
    const halamanList = Array.from(halamanSet).sort((a, b) => a - b);

    const firstAyat = ayatInJuz[0];
    const mulaiDari = {
      surah: {
        nomor: firstAyat.surah.nomor,
        nama: firstAyat.surah.nama,
        nama_latin: firstAyat.surah.namaLatin,
      },
      ayat: firstAyat.nomorAyat,
    };

    const formattedResponse = {
      juz: juzId,
      mulai_dari: mulaiDari,
      total_ayat: ayatInJuz.length,
      halaman: halamanList,
      ayat: ayatInJuz.map((ayat) => ({
        id: ayat.id,
        surah: {
          nomor: ayat.surah.nomor,
          nama: ayat.surah.nama,
          nama_latin: ayat.surah.namaLatin,
        },
        nomor_ayat: ayat.nomorAyat,
        halaman: ayat.halaman,
        arab: ayat.arab,
        latin: ayat.latin,
        terjemah: ayat.terjemah,
      })),
    };

    await cacheSet(cacheKey, formattedResponse, CACHE_TTL_24H);
    return res.status(200).json({
      message: `Juz ${juzId} fetched successfully`,
      status: 200,
      data: formattedResponse,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({
        message: 'Internal server error',
        status: 500,
      });
    } else {
      return res.status(500).json({
        message: 'Internal server error',
        status: 500,
      });
    }
  }
};
