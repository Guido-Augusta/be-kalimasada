import { Request, Response } from 'express';
import { ChartRange, getChartData } from '../services/chartService';
import { prisma } from '../utils/prisma';
import { cacheGetParsed, cacheSet } from '../services/cacheService';

const CACHE_TTL_5M = 300;

export async function getChartHafalanController(req: Request, res: Response) {
  try {
    const { range = '1w', santriId, mode = 'ayat' } = req.query;
    const selectedSantriId = santriId;

    if (!selectedSantriId) {
      return res
        .status(400)
        .json({ message: 'santriId is required', status: 400 });
    }

    const modeParam = mode as string;
    if (modeParam !== 'ayat' && modeParam !== 'halaman') {
      return res.status(400).json({
        message: "mode must be 'ayat' or 'halaman'",
        status: 400,
      });
    }

    const santriIdNum = parseInt(selectedSantriId as string, 10);
    const cacheKey = `chart:${santriIdNum}:${range}:${modeParam}`;

    const cached = await cacheGetParsed<{
      message: string;
      status: number;
      mode: string;
      santri: { nama: string; tahapHafalan: string; totalPoin: number };
      data: unknown[];
    }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const santri = await prisma.santri.findUnique({ where: { id: santriIdNum } });
    if (!santri) {
      return res.status(404).json({ message: 'Santri not found', status: 404 });
    }

    const data = await getChartData(santriIdNum, range as ChartRange, modeParam);

    const response = {
      message: 'Chart data',
      status: 200,
      mode: modeParam,
      santri: {
        nama: santri.nama,
        tahapHafalan: santri.tahapHafalan,
        totalPoin: santri.totalPoin,
      },
      data,
    };

    await cacheSet(cacheKey, response, CACHE_TTL_5M);
    return res.json(response);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Server error', status: 500 });
    } else {
      return res.status(500).json({ message: 'Server error', status: 500 });
    }
  }
}
