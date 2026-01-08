import { prisma } from '../utils/prisma';
import { JenisKelamin, Prisma, TipeOrangTua } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export interface OrangTuaData {
  email?: string;
  password?: string;
  nama: string;
  nomorHp: string;
  alamat: string;
  jenisKelamin: JenisKelamin;
  tipe: TipeOrangTua;
  fotoProfil?: string;
}

export interface updateOrangTuaData {
  id?: number;
  userId?: number;
  email?: string;
  password?: string | null;
  nama?: string;
  nomorHp?: string;
  alamat?: string;
  jenisKelamin?: JenisKelamin;
  tipe?: TipeOrangTua;
  fotoProfil?: string | null;
}

export interface OrangTuaFilter {
  search?: string;
  tipe?: TipeOrangTua;
}

export const createOrangTua = async (data: OrangTuaData) => {
    // Check if email and password are provided to create a linked user account
  if (data.email && data.password) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new Error('Email already exists');

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email!,
          password: data.password!,
          role: 'ortu',
        },
      });

      const { email, password, ...ortuOnlyData } = data;
      const orangTua = await tx.orangTua.create({
        data: {
          userId: user.id,
          ...ortuOnlyData,
        },
      });

      return { user, orangTua };
    });
  } else {
    // If no email/password, create only the OrangTua record without a user link
    const { email, password, ...ortuOnlyData } = data;
    const orangTua = await prisma.orangTua.create({
      data: {
        ...ortuOnlyData,
        userId: null,
      },
    });
    return { user: null, orangTua };
  }
};

export const getOrangTua = async () => {
  const orangTua = await prisma.orangTua.findMany({ include: { user: true } });
  return orangTua;
};

export const getOrangTuaById = async (id: number) => {
  const orangTua = await prisma.orangTua.findUnique({ 
    where: { id }, 
    include: { 
      user: true,
      santri: {
        select: {
          id: true,
          nama: true
        }
      } 
    }
  });
  return orangTua;
};

export const getOrangTuaByName = async (nama: string) => {
  const orangTua = await prisma.orangTua.findMany({ 
    where: { nama: { contains: nama, mode: 'insensitive' } }, 
    include: { 
      user: true,
      santri: {
        select: {
          id: true,
          nama: true
        }
      }
    } 
  });
  return orangTua;
};

export const updateOrangTuaProfileAndUser = async (id: number, data: updateOrangTuaData) => {
  const { email, password, ...ortuData } = data;

  return prisma.$transaction(async (tx) => {
    // Find the existing OrangTua record and its user
    const existingOrtu = await tx.orangTua.findUnique({ where: { id }, include: { user: true } });
    if (!existingOrtu) {
      throw new Error('Orang Tua not found');
    }

    // Handle user account updates (email/password)
    if (email || password) {
      // If the OrangTua has a linked User account, update it
      if (existingOrtu.userId) {
        // Check for duplicate email if it's being updated
        if (email && email !== existingOrtu.user?.email) {
          const existingEmail = await tx.user.findUnique({ where: { email } });
          if (existingEmail) throw new Error('Email already exists');
        }

        await tx.user.update({
          where: { id: existingOrtu.userId },
          data: {
            ...(email && { email }),
            ...(password && { password }),
          },
        });
      } else {
        // If the OrangTua does not have a linked User account, create one
        if (!email || !password) {
            throw new Error('Email and password must be provided to create a new user account');
        }
        const newUser = await tx.user.create({
          data: {
            email,
            password,
            role: 'ortu'
          }
        });
        ortuData.userId = newUser.id;
      }
    }

    // Update the OrangTua record
    const updatedOrtu = await tx.orangTua.update({ where: { id }, data: ortuData });
    return updatedOrtu;
  });
};

export const deleteOrangTua = async (id: number) => {
  return prisma.$transaction(async (tx) => {
    const orangTua = await tx.orangTua.findUnique({ where: { id } });
    if (!orangTua) throw new Error('Orang Tua not found');

    if (orangTua.fotoProfil && orangTua.fotoProfil.includes('/public/ortu')) {
      try {
        const relativePath = orangTua.fotoProfil.replace(/^.*\/public\//, "public/");
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
    await tx.orangTua.delete({ where: { id } });
    await tx.user.delete({ where: { id: orangTua.userId! } });
  });
};

export const findOrangTuaWithPagination = async (filter: OrangTuaFilter = {}, page = 1, limit = 10) => {
  const { search, tipe } = filter;

  const where: Prisma.OrangTuaWhereInput = {};

  if (search) {
    where.nama = {
      contains: search,
      mode: "insensitive",
    };
  }
  
  if (tipe) {
    where.tipe = tipe;
  }

  const skip = (page - 1) * limit;

  const [data, totalData] = await Promise.all([
    prisma.orangTua.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.orangTua.count({ where }),
  ]);

  return { data, totalData };
};