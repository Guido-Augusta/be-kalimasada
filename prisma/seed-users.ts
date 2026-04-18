import { PrismaClient, Role, JenisKelamin, TahapHafalan, TipeOrangTua } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Mulai seeding data user...');

  // 1. Seed Admin
  const emailAdmin = process.env.EMAIL_ADMIN || 'admin@gmail.com';
  const passwordAdmin = process.env.PASSWORD_ADMIN || 'admin123';
  const hashedAdmin = await bcrypt.hash(passwordAdmin, 10);

  const admin = await prisma.user.upsert({
    where: { email: emailAdmin },
    update: { password: hashedAdmin },
    create: {
      email: emailAdmin,
      password: hashedAdmin,
      role: Role.admin,
    },
  });
  console.log('✅ Admin seeded:', admin.email);

  // 2. Seed Ustadz
  const ustadzData = [
    { email: 'ustad1@gmail.com', password: 'ustad123', nama: 'Ustadz Ahmad', tahap: TahapHafalan.Level1 },
    { email: 'ustad2@gmail.com', password: 'ustad234', nama: 'Ustadz Budi', tahap: TahapHafalan.Level2 },
    { email: 'ustad3@gmail.com', password: 'ustad345', nama: 'Ustadz Candra', tahap: TahapHafalan.Level3 },
  ];

  for (const data of ustadzData) {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: { password: hashed },
      create: {
        email: data.email,
        password: hashed,
        role: Role.ustadz,
      },
    });

    await prisma.ustadz.upsert({
      where: { userId: user.id },
      update: { nama: data.nama, waliKelasTahap: data.tahap },
      create: {
        userId: user.id,
        nama: data.nama,
        nomorHp: '08123456789' + data.email.charAt(5),
        alamat: 'Jl. Masjid No. ' + data.email.charAt(5),
        jenisKelamin: JenisKelamin.L,
        waliKelasTahap: data.tahap,
      },
    });
    console.log(`✅ Ustadz seeded: ${data.nama}`);
  }

  // 3. Seed Ortu
  const ortuData = [
    { email: 'ortu1@gmail.com', password: 'ortu123', nama: 'Bapak Ahmad', tipe: TipeOrangTua.Ayah },
    { email: 'ortu2@gmail.com', password: 'ortu234', nama: 'Ibu Siti', tipe: TipeOrangTua.Ibu },
  ];

  for (const data of ortuData) {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: { password: hashed },
      create: {
        email: data.email,
        password: hashed,
        role: Role.ortu,
      },
    });

    await prisma.orangTua.upsert({
      where: { userId: user.id },
      update: { nama: data.nama, tipe: data.tipe },
      create: {
        userId: user.id,
        nama: data.nama,
        nomorHp: '08123456780' + data.email.charAt(4),
        alamat: 'Jl. Ortomedia No. 1',
        jenisKelamin: data.tipe === TipeOrangTua.Ayah ? JenisKelamin.L : JenisKelamin.P,
        tipe: data.tipe,
      },
    });
    console.log(`✅ Ortu seeded: ${data.nama}`);
  }

  // 4. Seed Santri
  const santrisData = [
    { nama: 'Santri Satu', password: 'santri123', tahap: TahapHafalan.Level1, emailOrtu: 'ortu1@gmail.com' },
    { nama: 'Santri Dua', password: 'santri234', tahap: TahapHafalan.Level2, emailOrtu: 'ortu2@gmail.com' },
  ];

  for (const data of santrisData) {
    const hashed = await bcrypt.hash(data.password, 10);
    
    // Check if santri user already exists by looking up via santri relation
    let user = await prisma.user.findFirst({
      where: { santri: { nama: data.nama } }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          password: hashed,
          role: Role.santri,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed }
      });
    }

    const ortu = await prisma.orangTua.findFirst({
      where: { user: { email: data.emailOrtu } }
    });

    await prisma.santri.upsert({
      where: { userId: user.id },
      update: { nama: data.nama, tahapHafalan: data.tahap },
      create: {
        userId: user.id,
        nama: data.nama,
        tahapHafalan: data.tahap,
        peringkat: 0,
        orangTua: ortu ? { connect: { id: ortu.id } } : undefined,
      },
    });
    console.log(`✅ Santri seeded: ${data.nama}`);
  }

  console.log('Seeding user selesai ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
