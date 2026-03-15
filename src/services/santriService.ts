import * as santriRepo from '../repositories/santriRepo';
import bcrypt from 'bcrypt';
import { SantriData } from '../repositories/santriRepo';
import prisma from '../utils/prisma';
import { TahapHafalan } from '@prisma/client';

const TINGKATAN_ORDER: TahapHafalan[] = ['Level1', 'Level2', 'Level3'];

export const registerSantri = async (data: SantriData) => {
  const hashed = await bcrypt.hash(data.password, 10);
  return santriRepo.createSantri({ ...data, password: hashed });
};

export const getSantriById = santriRepo.getSantriById;
export const getSantriByName = santriRepo.getSantriByName;
export const deleteSantri = santriRepo.deleteSantri;

export const updateSantri = async (
  id: number,
  data: santriRepo.SantriUpdateData
) => {
  return santriRepo.updateSantriAndUser(id, data);
};

export const getSantriForOrtu = async (
  ortuId: number,
  options: {
    search?: string;
    page?: number;
    limit?: number;
  }
) => {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 10;

  const { data, totalData } = await santriRepo.findSantriWithPagination({
    ortuId,
    search: options.search,
    page,
    limit,
  });

  const totalPages = Math.ceil(totalData / limit);

  return {
    pagination: { page, limit, totalData, totalPages },
    data,
  };
};

export const getAllSantriWithPagination = async (
  page: number,
  limit: number,
  search?: string,
  tahapHafalan?: TahapHafalan,
  ortuId?: number
) => {
  const { data, totalData, totalSantri } =
    await santriRepo.findSantriWithPagination({
      page,
      limit,
      search,
      tahapHafalan,
      ortuId,
    });

  const totalPages = Math.ceil(totalData / limit);

  return {
    pagination: { page, limit, totalData, totalPages },
    data,
    totalSantri,
  };
};

export const updatePeringkatSantri = async () => {
  try {
    await prisma.$executeRaw`
      UPDATE "Santri" s
      SET "totalPoin" = COALESCE(r.total, 0)
      FROM (
        SELECT "santriId", SUM("poinDidapat") AS total
        FROM "RiwayatHafalan"
        GROUP BY "santriId"
      ) r
      WHERE r."santriId" = s.id
    `;

    await prisma.$executeRaw`
      WITH ranked AS (
        SELECT 
          id,
          DENSE_RANK() OVER (
            PARTITION BY "tahapHafalan"
            ORDER BY "totalPoin" DESC, "poinUpdatedAt" ASC, id ASC
          ) AS peringkat
        FROM "Santri"
      )
      UPDATE "Santri" s
      SET "peringkat" = r.peringkat
      FROM ranked r
      WHERE s.id = r.id
    `;
  } catch (error) {
    console.error(error);
  }
};

// reset point all santri and rank
export const resetAllSantriPoints = async () => {
  try {
    const result = await santriRepo.resetAllSantriTotalPoin();
    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error('Failed to reset all santri points.');
    }
  }
};

// deduct point individual
export const deductSantriPoints = async (santriId: number, poin: number) => {
  const santri = await santriRepo.getSantriById(santriId);
  if (!santri) {
    throw new Error('Santri not found');
  }

  if (poin < 0) {
    throw new Error('Points to deduct must be a positive number.');
  }

  const finalPoin = santri.totalPoin - poin >= 0 ? poin : santri.totalPoin;

  return santriRepo.decrementSantriTotalPoin(santriId, finalPoin);
};

export const getRankedSantriWithPagination = async (
  page: number,
  limit: number,
  search?: string,
  tahapHafalan?: TahapHafalan
) => {
  if (page <= 0) page = 1;
  if (limit <= 0) limit = 10;

  const { data, totalData } = await santriRepo.getRankedSantriWithPagination(
    page,
    limit,
    search,
    tahapHafalan
  );
  const totalPages = Math.ceil(totalData / limit);

  return {
    pagination: {
      page,
      limit,
      totalData,
      totalPages,
    },
    data,
  };
};
