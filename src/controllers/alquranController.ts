import { prisma } from "../utils/prisma";
import { Request, Response } from "express";

export const getAlquran = async (req: Request, res: Response) => {
  try {
    const surah = await prisma.surah.findMany({
      orderBy: {
        nomor: 'asc'
      }
    });
    return res.status(200).json({ message: `Alquran data fetched successfully ${surah.length} surah`, status: 200, data: surah });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({ message: `Internal server error`, status: 500 });
    } else {
      return res.status(500).json({ message: `Internal server error`, status: 500 });
    }
  }
};

export const getSurahByNumber = async (req: Request, res: Response) => {
  try {
    const surah = await prisma.surah.findUnique({ 
      where: { 
        nomor: Number(req.params.nomor) 
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
            juz: true
          }
        }
      }
    });

    if (!surah) {
      return res.status(404).json({ 
        status: false,
        message: `Surah ${req.params.nomor} not found` 
      });
    }

    // Format the response
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
      ayat: surah.ayat.map(ayat => ({
        id: ayat.id,
        surah: ayat.surahId,
        nomor: ayat.nomorAyat,
        ar: ayat.arab,
        tr: ayat.latin,
        idn: ayat.terjemah,
        juz: ayat.juz
      }))
    };

    return res.status(200).json(formattedResponse);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({
        status: false,
        message: `Internal server error`
      });
    } else {
      return res.status(500).json({
        status: false,
        message: `Internal server error`
      });
    }
  }
};

export const getAllJuz = async (req: Request, res: Response) => {
  try {
    const juzList = await prisma.ayat.groupBy({
      by: ['juz'],
      where: {
        juz: {
          not: null
        }
      },
      orderBy: {
        juz: 'asc'
      }
    });

    const formattedJuz = await Promise.all(
      juzList.map(async (item) => {
        const firstAyat = await prisma.ayat.findFirst({
          where: {
            juz: item.juz
          },
          include: {
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
        });

        const totalAyat = await prisma.ayat.count({
          where: {
            juz: item.juz
          }
        });

        return {
          juz: item.juz,
          mulai_dari: firstAyat
            ? {
                surah: {
                  nomor: firstAyat.surah.nomor,
                  nama: firstAyat.surah.nama,
                  nama_latin: firstAyat.surah.namaLatin
                },
                ayat: firstAyat.nomorAyat
              }
            : null,
          total_ayat: totalAyat
        };
      })
    );

    return res.status(200).json({
      message: 'Juz list fetched successfully',
      status: 200,
      data: formattedJuz
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({
        message: 'Internal server error',
        status: 500
      });
    } else {
      return res.status(500).json({
        message: 'Internal server error',
        status: 500
      });
    }
  }
};

export const getJuzById = async (req: Request, res: Response) => {
  try {
    const juzId = Number(req.params.idjuz);

    if (isNaN(juzId) || juzId < 1 || juzId > 30) {
      return res.status(400).json({
        message: 'Invalid juz number. Must be between 1 and 30',
        status: 400
      });
    }

    const ayatInJuz = await prisma.ayat.findMany({
      where: {
        juz: juzId
      },
      include: {
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
    });

    if (ayatInJuz.length === 0) {
      return res.status(404).json({
        message: `Juz ${juzId} not found`,
        status: 404
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
        nama_latin: firstAyat.surah.namaLatin
      },
      ayat: firstAyat.nomorAyat
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
          nama_latin: ayat.surah.namaLatin
        },
        nomor_ayat: ayat.nomorAyat,
        halaman: ayat.halaman,
        arab: ayat.arab,
        latin: ayat.latin,
        terjemah: ayat.terjemah
      }))
    };

    return res.status(200).json({
      message: `Juz ${juzId} fetched successfully`,
      status: 200,
      data: formattedResponse
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({
        message: 'Internal server error',
        status: 500
      });
    } else {
      return res.status(500).json({
        message: 'Internal server error',
        status: 500
      });
    }
  }
};