import { Request, Response } from 'express';
import { HafalanService } from '../services/hafalanService';
import { AuthRequest } from '../middleware/auth';
import { getUstadzByUserId } from '../repositories/ustadzRepo';
import { StatusHafalan, TahapHafalan } from '@prisma/client';
import {
  SimpanHafalanSchema,
  SimpanHafalanByHalamanSchema,
} from '../validation/hafalanValidation';

export const getProgress = async (req: Request, res: Response) => {
  try {
    const { santriId } = req.params;
    const mode = req.query.mode as string;

    if (!mode || (mode !== 'surah' && mode !== 'juz')) {
      return res.status(400).json({
        message:
          "Query parameter 'mode' is required and must be 'surah' or 'juz'",
        status: 400,
      });
    }

    const result = await HafalanService.getProgress(Number(santriId), mode);
    return res.status(200).json({
      message: `${mode === 'surah' ? 'Surah' : 'Juz'} retrieved`,
      status: 200,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    }
  }
};

export const getDetailHafalanSurah = async (req: Request, res: Response) => {
  try {
    const { santriId, surahId } = req.params;
    const { mode } = req.query;
    const result = await HafalanService.getDetailHafalanSurah(
      Number(santriId),
      Number(surahId),
      String(mode)
    );
    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message, status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    }
  }
};

export const getDetailHafalanJuz = async (req: Request, res: Response) => {
  try {
    const { santriId, juzId } = req.params;
    const { mode } = req.query;

    if (!mode || (mode !== 'tambah' && mode !== 'murajaah' && mode !== 'tahsin')) {
      return res.status(400).json({
        message:
          "Query parameter 'mode' is required and must be 'tambah', 'murajaah', or 'tahsin'",
        status: 400,
      });
    }

    const result = await HafalanService.getDetailHafalanJuz(
      Number(santriId),
      Number(juzId),
      String(mode)
    );
    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message, status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    }
  }
};

export const simpanHafalan = async (req: AuthRequest, res: Response) => {
  const role = req.user?.role;
  const userId = req.user?.id;
  let ustadzId;

  try {
    const validation = SimpanHafalanSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    if (!userId || !role) {
      return res.status(401).json({ message: 'Unauthorized', status: 401 });
    }

    if (role === 'ustadz') {
      const ustadz = await getUstadzByUserId(userId);

      if (!ustadz) {
        return res.status(403).json({
          message: 'Ustadz not found for the authenticated user.',
          status: 403,
        });
      }
      ustadzId = ustadz.id;
    } else if (role === 'admin') {
      const ustadzIdFromBody = req.body.ustadzId;
      if (!ustadzIdFromBody) {
        return res.status(400).json({
          message: 'Ustadz ID is required for admin role.',
          status: 400,
        });
      }
      ustadzId = Number(ustadzIdFromBody);
    } else {
      return res.status(403).json({
        message: 'Forbidden: You do not have permission to save hafalan.',
        status: 403,
      });
    }

    const result = await HafalanService.simpanHafalan(
      Number(data.santriId),
      ustadzId,
      data.ayatIds,
      data.status,
      data.kualitas,
      data.keterangan,
      data.catatan
    );
    return res.status(200).json({ ...result, status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message, status: 400 });
    } else {
      return res.status(400).json({ message: 'Internal server error', status: 400 });
    }
  }
};

export const simpanHafalanByHalaman = async (
  req: AuthRequest,
  res: Response
) => {
  const role = req.user?.role;
  const userId = req.user?.id;
  let ustadzId;

  try {
    const validation = SimpanHafalanByHalamanSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    if (!userId || !role) {
      return res.status(401).json({ message: 'Unauthorized', status: 401 });
    }

    if (role === 'ustadz') {
      const ustadz = await getUstadzByUserId(userId);

      if (!ustadz) {
        return res.status(403).json({
          message: 'Ustadz not found for the authenticated user.',
          status: 403,
        });
      }
      ustadzId = ustadz.id;
    } else if (role === 'admin') {
      const ustadzIdFromBody = req.body.ustadzId;
      if (!ustadzIdFromBody) {
        return res.status(400).json({
          message: 'Ustadz ID is required for admin role.',
          status: 400,
        });
      }
      ustadzId = Number(ustadzIdFromBody);
    } else {
      return res.status(403).json({
        message: 'Forbidden: You do not have permission to save hafalan.',
        status: 403,
      });
    }

    const result = await HafalanService.simpanHafalanByHalaman(
      Number(data.santriId),
      ustadzId,
      Number(data.halamanAwal),
      Number(data.halamanAkhir),
      data.status,
      data.kualitas,
      data.keterangan,
      data.catatan
    );
    return res.status(200).json({ ...result, status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message, status: 400 });
    } else {
      return res.status(400).json({ message: 'Internal server error', status: 400 });
    }
  }
};

export const getRiwayatHafalanBySantri = async (
  req: Request,
  res: Response
) => {
  try {
    const { santriId } = req.params;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const sort = req.query.sort as string; // 'tanggal' or 'status'
    const sortBy = req.query.sortBy as string; // 'asc' or 'desc'
    const status = req.query.status as string;
    const mode = req.query.mode as string; // 'ayat' or 'halaman'

    // Default to 'ayat' if mode is not provided (backward compatibility)
    const modeParam = mode || 'ayat';

    if (modeParam !== 'ayat' && modeParam !== 'halaman') {
      return res.status(400).json({
        message: "Query parameter 'mode' must be 'ayat' or 'halaman'",
        status: 400,
      });
    }

    const result = await HafalanService.getRiwayatHafalanBySantri(
      Number(santriId),
      page,
      limit,
      sort,
      sortBy,
      status,
      modeParam
    );

    if (!result.santri) {
      return res.status(404).json({
        message: 'Santri not found',
        status: 404,
      });
    }

    return res.json({
      message: 'Success retrieve riwayat hafalan',
      status: 200,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    }
  }
};

export const deleteRiwayatHafalan = async (req: Request, res: Response) => {
  try {
    const { santriId, surahId, juzId, tanggal, status } = req.body;

    if (!santriId || !tanggal || !status) {
      return res.status(400).json({
        message: 'SantriId, tanggal, dan status are required.',
        status: 400,
      });
    }

    if (!surahId && !juzId) {
      return res.status(400).json({
        message: 'Either surahId or juzId is required.',
        status: 400,
      });
    }

    const result = await HafalanService.deleteRiwayatHafalan(
      Number(santriId),
      surahId ? Number(surahId) : undefined,
      juzId ? Number(juzId) : undefined,
      String(tanggal),
      String(status)
    );

    if (result.count === 0) {
      return res.status(404).json({
        message: 'Riwayat hafalan not found',
        status: 404,
      });
    }

    return res.json({
      message: result.message,
      status: 200,
      deletedCount: result.count,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    }
  }
};

export const getRiwayatDetailByDateAndSurah = async (
  req: Request,
  res: Response
) => {
  try {
    const { santriId, surahId } = req.params;
    const { tanggal, status } = req.query;

    if (!santriId || !surahId || !tanggal || !status) {
      return res.status(400).json({
        message: 'SantriId, surahId, tanggal, dan status are required.',
        status: 400,
      });
    }

    const result = await HafalanService.getRiwayatDetailByDateAndSurah(
      Number(santriId),
      Number(surahId),
      String(tanggal),
      String(status)
    );

    if (!result) {
      return res.status(404).json({
        message: 'Riwayat detail hafalan not found.',
        status: 404,
      });
    }

    return res.status(200).json({
      message: 'Detail riwayat hafalan retrieved.',
      status: 200,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    }
  }
};

export const getRiwayatDetailByDateAndJuz = async (
  req: Request,
  res: Response
) => {
  try {
    const { santriId, juzId } = req.params;
    const { tanggal, status } = req.query;

    if (!santriId || !juzId || !tanggal || !status) {
      return res.status(400).json({
        message: 'SantriId, juzId, tanggal, dan status are required.',
        status: 400,
      });
    }

    const result = await HafalanService.getRiwayatDetailByDateAndJuz(
      Number(santriId),
      Number(juzId),
      String(tanggal),
      String(status)
    );

    if (!result) {
      return res.status(404).json({
        message: 'Riwayat detail hafalan not found.',
        status: 404,
      });
    }

    return res.status(200).json({
      message: 'Detail riwayat hafalan by juz retrieved.',
      status: 200,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    }
  }
};

export const getLatestHafalanAllSantri = async (
  req: Request,
  res: Response
) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const sortByAyat = req.query.sortByAyat as string | undefined;
    const sortByHalaman = req.query.sortByHalaman as string | undefined;
    const name = req.query.name as string | undefined;
    const mode = req.query.mode as string | undefined;
    let tahapHafalan: TahapHafalan | undefined;
    const statusQuery = req.query.status as string | undefined;
    let statusFilter: StatusHafalan | undefined;

    if (statusQuery) {
      const statusMap: Record<string, StatusHafalan> = {
        tambahhafalan: StatusHafalan.TambahHafalan,
        murajaah: StatusHafalan.Murajaah,
        tahsin: StatusHafalan.Tahsin,
      };
      const statusNormalized = statusQuery.toLowerCase();
      statusFilter = statusMap[statusNormalized];
    }

    if (req.query.tahapHafalan) {
      const tahapQuery = req.query.tahapHafalan as string;
      const tahapNormalized = tahapQuery.toLowerCase();
      const tahapMap: Record<string, TahapHafalan> = {
        level1: TahapHafalan.Level1,
        level2: TahapHafalan.Level2,
        level3: TahapHafalan.Level3,
      };
      tahapHafalan = tahapMap[tahapNormalized];
    }

    const result = await HafalanService.getLatestHafalanAllSantri(
      page,
      limit,
      tahapHafalan,
      statusFilter,
      sortByAyat,
      sortByHalaman,
      name,
      mode
    );

    return res.status(200).json({ status: 200, ...result });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    } else {
      return res
        .status(500)
        .json({ message: 'Internal server error', status: 500 });
    }
  }
};
