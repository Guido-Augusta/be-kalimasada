import { prisma } from '../utils/prisma';
import { JenisKelamin, Prisma, TahapHafalan } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { UpdateUstadzPayload } from '../controllers/ustadzController';

export interface UstadzData {
  email: string;
  password: string;
  nama: string;
  nomorHp: string;
  alamat: string;
  jenisKelamin: JenisKelamin;
  fotoProfil: string;
  waliKelasTahap?: TahapHafalan | null;
}

export interface UstadzFilter {
  waliKelasTahap?: TahapHafalan | string;
  search?: string;
}

export const createUstadz = async (data: UstadzData) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw new Error('Email already exists');

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: data.password,
        role: 'ustadz',
      },
    });

    const ustadz = await tx.ustadz.create({
      data: {
        userId: user.id,
        nama: data.nama,
        nomorHp: data.nomorHp,
        alamat: data.alamat,
        jenisKelamin: data.jenisKelamin,
        fotoProfil: data.fotoProfil,
        waliKelasTahap: data.waliKelasTahap,
      },
    });

    return { user, ustadz };
  });
};

export const getAllUstadz = async () => {
  const ustadz = await prisma.ustadz.findMany({ include: { user: true } });
  return ustadz;
};

export const getUstadzById = async (id: number) => {
  const ustadz = await prisma.ustadz.findUnique({ 
    where: { id }, 
    include: { user: true } 
  });

  if (!ustadz) return null;

  return { ...ustadz };
};

export const getUstadzByName = async (nama: string) => {
  const ustadzList = await prisma.ustadz.findMany({ 
    where: { 
      nama: { 
        contains: nama, 
        mode: 'insensitive' 
      } 
    }, 
    include: { 
      user: true 
    } 
  });

  return ustadzList;
};

export const updateUstadzAndUser = async (id: number, data: UpdateUstadzPayload) => {
  const { email, password, ...ustadzData } = data;

  return prisma.$transaction(async (tx) => {
    // 1. Find the existing Ustadz and User records
    const existingUstadz = await tx.ustadz.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!existingUstadz) throw new Error('Ustadz not found');

    const ustadzUserId = existingUstadz.userId;
    if (!ustadzUserId) throw new Error('Ustadz user account not found');

    // 2. Handle User account updates (email/password)
    if (email) {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== ustadzUserId) {
        throw new Error('Email already exists');
      }
    }

    await tx.user.update({
      where: { id: ustadzUserId },
      data: {
        ...(email && { email }),
        ...(password && { password }),
      },
    });

    // 3. Handle Ustadz profile updates
    const updatedUstadz = await tx.ustadz.update({
      where: { id },
      data: ustadzData,
    });
    
    return updatedUstadz;
  });
};

export const deleteUstadz = async (id: number) => {
  return prisma.$transaction(async (tx) => {
    const ustadz = await tx.ustadz.findUnique({ where: { id } });
    if (!ustadz) throw new Error('Ustadz not found');

    if (ustadz.fotoProfil && ustadz.fotoProfil.includes('/public/ustadz')) {
      try {
        const relativePath = ustadz.fotoProfil.replace(/^.*\/public\//, "public/");
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

    await tx.ustadz.delete({ where: { id } });
    await tx.user.delete({ where: { id: ustadz.userId } });
  });
};

export const findUstadzWithPagination = async (filter: UstadzFilter = {}, page: number, limit: number) => {
  const { waliKelasTahap, search } = filter as UstadzFilter;

  const where: Prisma.UstadzWhereInput = {};

  if (waliKelasTahap && waliKelasTahap !== "undefined" && waliKelasTahap !== "") {
    where.waliKelasTahap = waliKelasTahap as TahapHafalan;
  }

  if (search) {
    where.nama = {
      contains: search,
      mode: "insensitive",
    };
  }

  const [data, totalData] = await Promise.all([
    prisma.ustadz.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { id: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ustadz.count({ where }),
  ]);

  return { data, totalData };
};

export const getUstadzByUserId = async (userId: number) => {
  return prisma.ustadz.findUnique({
    where: { userId },
    select: { id: true },
  });
};