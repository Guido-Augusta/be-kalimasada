import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { JenisKelamin, TahapHafalan, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

export interface SantriFilter {
  tahapHafalan?: TahapHafalan;
  search?: string;
  ortuId?: number;
  page: number;
  limit: number;
}

export interface SantriData {
  email: string;
  password: string;
  ortuId: number[];
  nama: string;
  nomorHp?: string;
  noInduk: string;
  alamat: string;
  jenisKelamin: JenisKelamin;
  tanggalLahir: Date;
  fotoProfil?: string;
  tahapHafalan: TahapHafalan;
}

export interface SantriUpdateData {
  email?:string;
  password?:string;
  nama?: string;
  nomorHp?: string;
  noInduk?: string;
  alamat?: string;
  jenisKelamin?: JenisKelamin;
  tanggalLahir?: Date;
  fotoProfil?: string | null;
  ortuId?: number[];
  tahapHafalan?: TahapHafalan;
}

export const createSantri = async (data: SantriData) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw new Error('Email already exists');

  const existingSantriByNoInduk = await prisma.santri.findUnique({ where: { noInduk: data.noInduk } });
  if (existingSantriByNoInduk) throw new Error('Nomor Induk already exists');

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: data.password,
        role: 'santri',
      },
    });

    const santri = await tx.santri.create({
      data: {
        nama: data.nama,
        nomorHp: data.nomorHp,
        alamat: data.alamat,
        jenisKelamin: data.jenisKelamin,
        tanggalLahir: new Date(data.tanggalLahir),
        fotoProfil: data.fotoProfil,
        userId: user.id,
        orangTua: {
          connect: data.ortuId.map(id => ({ id }))
        },
        tahapHafalan: data.tahapHafalan,
        noInduk: data.noInduk,
        peringkat: 0,
      },
    });

    return { user, santri };
  });
};

export const getAllSantri = async () => {
  return prisma.santri.findMany({ include: { user: true } });
};

export const getSantriById = async (id: number) => {
  const santri = await prisma.santri.findUnique({ 
    where: { id }, 
    select: {
      id: true,
      userId: true,
      nama: true,
      nomorHp: true,
      noInduk: true,
      alamat: true,
      jenisKelamin: true,
      tanggalLahir: true,
      fotoProfil: true,
      tahapHafalan: true,
      peringkat: true,
      totalPoin: true,
      createdAt: true,
      poinUpdatedAt: true,
      user: true,
      orangTua: {
        select: {
          id: true,
          nama: true,
          tipe: true,
        },
      },
    },
  });

  if (!santri) {
    return null;
  }

  const waliKelas = await prisma.ustadz.findMany({
    where: {
      waliKelasTahap: santri.tahapHafalan,
    },
    select: {
      id: true,
      nama: true,
      nomorHp: true,
      waliKelasTahap: true,
    },
  });

  return { ...santri, waliKelas };
};

export const getSantriByName = async (nama: string) => {
  const santri = await prisma.santri.findMany({ 
    where: { nama: { contains: nama, mode: 'insensitive' } }, 
    include: {
      user: true,
      orangTua: { 
        select: {
          id: true,
          nama: true,
          tipe: true
        }
      } 
    } 
  });
  return santri;
};

export const updateSantriAndUser = async (id: number, data: SantriUpdateData) => {
  const { ortuId, noInduk, ...santriData } = data;

  return prisma.$transaction(async (tx) => {
    const existingSantri = await tx.santri.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!existingSantri) throw new Error('Santri not found');

    const santriUserId = existingSantri.userId;
    if (!santriUserId) throw new Error('Santri user account not found');

    if (noInduk && noInduk !== existingSantri.noInduk) {
      const existingSantriByNoInduk = await tx.santri.findUnique({ where: { noInduk } });
      if (existingSantriByNoInduk) {
        throw new Error('Nomor Induk already exists');
      }
    }

    const { email, password, ...restData } = santriData as SantriUpdateData;
    let newHashedPassword: string | undefined;

    if (password) {
      newHashedPassword= await bcrypt.hash(password, 10);
    }
    
    if (email) {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== santriUserId) {
        throw new Error('Email already exists');
      }
    }

    await tx.user.update({
      where: { id: santriUserId },
      data: {
        ...(email && { email }),
        ...(newHashedPassword && { password: newHashedPassword }),
      },
    });

    const updatePayload: Prisma.SantriUpdateInput = { ...restData, ...(noInduk && { noInduk }) };

    if (ortuId) {
      updatePayload.orangTua = {
        set: ortuId.map(ortuId => ({ id: ortuId })),
      };
    }
    
    const updatedSantri = await tx.santri.update({
      where: { id },
      data: updatePayload,
    });
    
    return updatedSantri;
  });
};

export const deleteSantri = async (id: number) => {
  return prisma.$transaction(async (tx) => {
    const santri = await tx.santri.findUnique({ where: { id } });
    if (!santri) throw new Error('Santri not found');

    if (santri.fotoProfil && santri.fotoProfil.includes('/public/santri')) {
      try {
        const relativePath = santri.fotoProfil.replace(/^.*\/public\//, "public/");
        const filePath = path.join(__dirname, '../../', relativePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Gagal menghapus file foto profil:', error.message);
        }
      }
    }

    await tx.santri.delete({ where: { id } });
    await tx.user.delete({ where: { id: santri.userId } });
  });
};

export const findSantri = async (filter: SantriFilter = { page: 1, limit: 10 }) => {
  const { tahapHafalan, search } = filter as SantriFilter;

  const where: Prisma.SantriWhereInput = {};

  if (tahapHafalan) {
    where.tahapHafalan = tahapHafalan;
  }

  if (search) {
    where.nama = {
      contains: search,
      mode: "insensitive",
    };
  }

  return prisma.santri.findMany({
    where,
    include: {
      user: {
        select: { id: true, email: true, role: true },
      },
      orangTua: {
        select: { id: true, nama: true, tipe: true },
      },
    },
    orderBy: { nama: "asc" },
  });
};

export const findAllSantri = async () => {
  return prisma.santri.findMany({
    include: { 
      user: true, 
      orangTua: { select: { id: true, nama: true, tipe: true } } 
    },
    orderBy: { nama: "asc" },
  });
};

export const findSantriWithPagination = async (filter: SantriFilter = { page: 1, limit: 10 }) => {
  const { tahapHafalan, search, ortuId, page, limit } = filter;
  const totalSantri = await prisma.santri.count();

  const where: Prisma.SantriWhereInput = {};
  
  if (tahapHafalan) {
    where.tahapHafalan = tahapHafalan as TahapHafalan;
  }
  
  if (search && search !== "undefined" && search !== "") {
    where.nama = { contains: search, mode: "insensitive" };
  }

  if (ortuId !== undefined) {
    const ortuIdNum = Number(ortuId);
    if (!isNaN(ortuIdNum)) {
      where.orangTua = {
        some: { id: ortuIdNum },
      };
  }
}

  const skip = (page - 1) * limit;

  const [data, totalData] = await Promise.all([
    prisma.santri.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, role: true } },
        orangTua: { select: { id: true, nama: true, tipe: true } },
      },
      // orderBy: { nama: "asc" },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.santri.count({ where }),
  ]);

  return { data, totalData, totalSantri };
};

export const resetAllSantriTotalPoin = async () => {
  return prisma.santri.updateMany({
    data: {
      totalPoin: 0,
      peringkat: 0,
      poinUpdatedAt: new Date()
    },
  });
};

export const decrementSantriTotalPoin = async (id: number, poinToDeduct: number) => {
  return prisma.santri.update({
    where: { id },
    data: {
      totalPoin: {
        decrement: poinToDeduct,
      },
      poinUpdatedAt: new Date()
    },
  });
};

export const getRankedSantriWithPagination = async (page: number, limit: number, search?: string, tahapHafalan?: TahapHafalan) => {
  const skip = (page - 1) * limit;

  const where: Prisma.SantriWhereInput = {};
  if (search) {
    where.nama = {
      contains: search,
      mode: 'insensitive',
    };
  }

  if (tahapHafalan) {
    where.tahapHafalan = tahapHafalan;
  }

  const [data, totalData] = await Promise.all([
    prisma.santri.findMany({
      where,
      orderBy: {
        peringkat: 'asc',
      },
      select: {
        id: true,
        nama: true,
        totalPoin: true,
        peringkat: true,
        tahapHafalan: true,
        fotoProfil: true,
        noInduk: true,
      },
      skip,
      take: limit,
    }),
    prisma.santri.count({ where }),
  ]);

  return { data, totalData };
};