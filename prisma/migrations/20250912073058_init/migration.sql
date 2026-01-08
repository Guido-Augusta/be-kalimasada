-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('admin', 'santri', 'ustadz', 'ortu');

-- CreateEnum
CREATE TYPE "public"."JenisKelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "public"."Platform" AS ENUM ('web', 'mobile');

-- CreateEnum
CREATE TYPE "public"."TahapHafalan" AS ENUM ('Level1', 'Level2', 'Level3');

-- CreateEnum
CREATE TYPE "public"."StatusHafalan" AS ENUM ('TambahHafalan', 'Murajaah');

-- CreateEnum
CREATE TYPE "public"."TempatTurun" AS ENUM ('Makkiyyah', 'Madaniyyah');

-- CreateEnum
CREATE TYPE "public"."TipeOrangTua" AS ENUM ('Ayah', 'Ibu', 'Wali');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ustadz" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "nomorHp" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "jenisKelamin" "public"."JenisKelamin" NOT NULL,
    "fotoProfil" TEXT,
    "tahapHafalan" "public"."TahapHafalan" NOT NULL DEFAULT 'Level1',
    "waliKelasTahap" "public"."TahapHafalan",

    CONSTRAINT "Ustadz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrangTua" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "nama" TEXT NOT NULL,
    "nomorHp" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "jenisKelamin" "public"."JenisKelamin" NOT NULL,
    "fotoProfil" TEXT,
    "tipe" "public"."TipeOrangTua" NOT NULL,

    CONSTRAINT "OrangTua_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Santri" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "nomorHp" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "jenisKelamin" "public"."JenisKelamin" NOT NULL,
    "tanggalLahir" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotoProfil" TEXT,
    "tahapHafalan" "public"."TahapHafalan" NOT NULL,
    "totalPoin" INTEGER NOT NULL DEFAULT 0,
    "peringkat" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poinUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Santri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Surah" (
    "id" SERIAL NOT NULL,
    "nomor" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "namaLatin" TEXT NOT NULL,
    "totalAyat" INTEGER NOT NULL,
    "tempatTurun" "public"."TempatTurun" NOT NULL,
    "arti" TEXT NOT NULL,
    "deskripsi" TEXT,

    CONSTRAINT "Surah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ayat" (
    "id" SERIAL NOT NULL,
    "surahId" INTEGER NOT NULL,
    "nomorAyat" INTEGER NOT NULL,
    "arab" TEXT NOT NULL,
    "latin" TEXT NOT NULL,
    "terjemah" TEXT NOT NULL,
    "juz" INTEGER,

    CONSTRAINT "Ayat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RiwayatHafalan" (
    "id" SERIAL NOT NULL,
    "santriId" INTEGER NOT NULL,
    "ustadzId" INTEGER,
    "ayatId" INTEGER NOT NULL,
    "tanggalHafalan" TIMESTAMP(3) NOT NULL,
    "status" "public"."StatusHafalan" NOT NULL,
    "catatan" TEXT,
    "poinDidapat" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiwayatHafalan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TokenStore" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "platform" "public"."Platform" NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResetToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_SantriOrangTua" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SantriOrangTua_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ustadz_userId_key" ON "public"."Ustadz"("userId");

-- CreateIndex
CREATE INDEX "Ustadz_userId_idx" ON "public"."Ustadz"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrangTua_userId_key" ON "public"."OrangTua"("userId");

-- CreateIndex
CREATE INDEX "OrangTua_userId_idx" ON "public"."OrangTua"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Santri_userId_key" ON "public"."Santri"("userId");

-- CreateIndex
CREATE INDEX "Santri_userId_idx" ON "public"."Santri"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Surah_nomor_key" ON "public"."Surah"("nomor");

-- CreateIndex
CREATE INDEX "Surah_nomor_idx" ON "public"."Surah"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "Ayat_surahId_nomorAyat_key" ON "public"."Ayat"("surahId", "nomorAyat");

-- CreateIndex
CREATE INDEX "RiwayatHafalan_santriId_idx" ON "public"."RiwayatHafalan"("santriId");

-- CreateIndex
CREATE INDEX "RiwayatHafalan_ustadzId_idx" ON "public"."RiwayatHafalan"("ustadzId");

-- CreateIndex
CREATE INDEX "RiwayatHafalan_ayatId_idx" ON "public"."RiwayatHafalan"("ayatId");

-- CreateIndex
CREATE INDEX "RiwayatHafalan_tanggalHafalan_idx" ON "public"."RiwayatHafalan"("tanggalHafalan");

-- CreateIndex
CREATE UNIQUE INDEX "TokenStore_token_key" ON "public"."TokenStore"("token");

-- CreateIndex
CREATE INDEX "TokenStore_userId_idx" ON "public"."TokenStore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResetToken_token_key" ON "public"."ResetToken"("token");

-- CreateIndex
CREATE INDEX "ResetToken_userId_idx" ON "public"."ResetToken"("userId");

-- CreateIndex
CREATE INDEX "_SantriOrangTua_B_index" ON "public"."_SantriOrangTua"("B");

-- AddForeignKey
ALTER TABLE "public"."Ustadz" ADD CONSTRAINT "Ustadz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrangTua" ADD CONSTRAINT "OrangTua_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Santri" ADD CONSTRAINT "Santri_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ayat" ADD CONSTRAINT "Ayat_surahId_fkey" FOREIGN KEY ("surahId") REFERENCES "public"."Surah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RiwayatHafalan" ADD CONSTRAINT "RiwayatHafalan_santriId_fkey" FOREIGN KEY ("santriId") REFERENCES "public"."Santri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RiwayatHafalan" ADD CONSTRAINT "RiwayatHafalan_ustadzId_fkey" FOREIGN KEY ("ustadzId") REFERENCES "public"."Ustadz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RiwayatHafalan" ADD CONSTRAINT "RiwayatHafalan_ayatId_fkey" FOREIGN KEY ("ayatId") REFERENCES "public"."Ayat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TokenStore" ADD CONSTRAINT "TokenStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResetToken" ADD CONSTRAINT "ResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SantriOrangTua" ADD CONSTRAINT "_SantriOrangTua_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."OrangTua"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SantriOrangTua" ADD CONSTRAINT "_SantriOrangTua_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Santri"("id") ON DELETE CASCADE ON UPDATE CASCADE;
