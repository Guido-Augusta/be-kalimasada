import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma';
import * as bcrypt from 'bcrypt';
import { Role, JenisKelamin, TahapHafalan, TipeOrangTua } from '@prisma/client';
import 'dotenv/config';

describe('Seed Data Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should seed admin from .env', async () => {
    const emailAdmin = process.env.EMAIL_ADMIN;
    const passwordAdmin = process.env.PASSWORD_ADMIN;

    expect(emailAdmin).toBeDefined();
    expect(passwordAdmin).toBeDefined();

    const existingAdmin = await prisma.user.findFirst({ where: { role: Role.admin } });
    if (existingAdmin) {
      console.log('Admin already exists, skipping...');
      return;
    }

    const hashed = await bcrypt.hash(passwordAdmin as string, 10);
    const admin = await prisma.user.create({
      data: {
        email: emailAdmin as string,
        password: hashed,
        role: Role.admin,
      },
    });

    console.log('✅ Admin seeded:', admin.email);
    expect(admin.role).toBe(Role.admin);
  });

  it('should seed 3 ustadz as wali kelas', async () => {
    const existingUstadz = await prisma.ustadz.count();
    if (existingUstadz >= 3) {
      console.log('Ustadz already exists, skipping...');
      return;
    }

    const ustadzData = [
      {
        email: 'ustad1@gmail.com',
        password: 'ustad123',
        nama: 'Ustadz Ahmad',
        nomorHp: '081234567891',
        alamat: 'Jl. Masjid No. 1',
        jenisKelamin: JenisKelamin.L,
        fotoProfil: '/public/ustadz/default.jpg',
        waliKelasTahap: TahapHafalan.Level1,
      },
      {
        email: 'ustad2@gmail.com',
        password: 'ustad234',
        nama: 'Ustadz Budi',
        nomorHp: '081234567892',
        alamat: 'Jl. Masjid No. 2',
        jenisKelamin: JenisKelamin.L,
        fotoProfil: '/public/ustadz/default.jpg',
        waliKelasTahap: TahapHafalan.Level2,
      },
      {
        email: 'ustad3@gmail.com',
        password: 'ustad345',
        nama: 'Ustadz Candra',
        nomorHp: '081234567893',
        alamat: 'Jl. Masjid No. 3',
        jenisKelamin: JenisKelamin.L,
        fotoProfil: '/public/ustadz/default.jpg',
        waliKelasTahap: TahapHafalan.Level3,
      },
    ];

    for (const data of ustadzData) {
      const hashed = await bcrypt.hash(data.password, 10);
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email,
            password: hashed,
            role: Role.ustadz,
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

      console.log('✅ Ustadz seeded:', result.ustadz.nama, '- Wali Kelas:', data.waliKelasTahap);
    }

    const ustadzCount = await prisma.ustadz.count();
    expect(ustadzCount).toBeGreaterThanOrEqual(3);
  });

  it('should seed 2 ortu with user accounts', async () => {
    const existingOrtu = await prisma.orangTua.count();
    if (existingOrtu >= 2) {
      console.log('Orang Tua already exists, skipping...');
      return;
    }

    const ortuData = [
      {
        email: 'ortu1@gmail.com',
        password: 'ortu123',
        nama: 'Bapak Ahmad',
        nomorHp: '081234567801',
        alamat: 'Jl. Ortomedia No. 1',
        jenisKelamin: JenisKelamin.L,
        tipe: TipeOrangTua.Ayah,
        fotoProfil: '/public/ortu/default.jpg',
      },
      {
        email: 'ortu2@gmail.com',
        password: 'ortu234',
        nama: 'Ibu Siti',
        nomorHp: '081234567802',
        alamat: 'Jl. Ortomedia No. 1',
        jenisKelamin: JenisKelamin.P,
        tipe: TipeOrangTua.Ibu,
        fotoProfil: '/public/ortu/default.jpg',
      },
    ];

    const ortuIds: number[] = [];

    for (const data of ortuData) {
      const hashed = await bcrypt.hash(data.password, 10);

      const orangTua = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email,
            password: hashed,
            role: Role.ortu,
          },
        });

        return tx.orangTua.create({
          data: {
            nama: data.nama,
            nomorHp: data.nomorHp,
            alamat: data.alamat,
            jenisKelamin: data.jenisKelamin,
            tipe: data.tipe,
            fotoProfil: data.fotoProfil,
            userId: user.id,
          },
        });
      });

      ortuIds.push(orangTua.id);
      console.log('✅ Orang Tua seeded:', orangTua.nama, '- Tipe:', data.tipe);
    }

    const ortuCount = await prisma.orangTua.count();
    expect(ortuCount).toBeGreaterThanOrEqual(2);
  });

  it('should seed 2 santris with their own ortu', async () => {
    const existingSantri = await prisma.santri.count();
    if (existingSantri >= 2) {
      console.log('Santri already exists, skipping...');
      return;
    }

    const ortuList = await prisma.orangTua.findMany({
      take: 2,
      orderBy: { id: 'asc' },
    });

    expect(ortuList.length).toBeGreaterThanOrEqual(2);

    const santrisData = [
      {
        password: 'santri123',
        nama: 'Santri Satu',
        tahapHafalan: TahapHafalan.Level1,
        ortuId: [ortuList[0].id],
      },
      {
        password: 'santri234',
        nama: 'Santri Dua',
        tahapHafalan: TahapHafalan.Level2,
        ortuId: [ortuList[1].id],
      },
    ];

    for (const data of santrisData) {
      const hashed = await bcrypt.hash(data.password, 10);
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            password: hashed,
            role: Role.santri,
          },
        });

        const existedOrtu = await tx.orangTua.findUnique({ where: { id: data.ortuId[0] } });

        const santri = await tx.santri.create({
          data: {
            nama: data.nama,
            userId: user.id,
            orangTua: {
              connect: data.ortuId.map((id) => ({ id })),
            },
            tahapHafalan: data.tahapHafalan,
            peringkat: 0,
          },
        });

        return { user, santri, ortu: existedOrtu };
      });

      console.log('✅ Santri seeded:', data.nama, '- Tahap:', data.tahapHafalan, '- Orang Tua:', result.ortu?.nama);
    }

    const santrisCount = await prisma.santri.count();
    expect(santrisCount).toBeGreaterThanOrEqual(2);
  });
});