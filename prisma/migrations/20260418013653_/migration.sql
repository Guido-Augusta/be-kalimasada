/*
  Warnings:

  - You are about to drop the column `alamat` on the `Santri` table. All the data in the column will be lost.
  - You are about to drop the column `fotoProfil` on the `Santri` table. All the data in the column will be lost.
  - You are about to drop the column `jenisKelamin` on the `Santri` table. All the data in the column will be lost.
  - You are about to drop the column `noInduk` on the `Santri` table. All the data in the column will be lost.
  - You are about to drop the column `nomorHp` on the `Santri` table. All the data in the column will be lost.
  - You are about to drop the column `tanggalLahir` on the `Santri` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nama]` on the table `Santri` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Santri_noInduk_key";

-- AlterTable
ALTER TABLE "public"."Santri" DROP COLUMN "alamat",
DROP COLUMN "fotoProfil",
DROP COLUMN "jenisKelamin",
DROP COLUMN "noInduk",
DROP COLUMN "nomorHp",
DROP COLUMN "tanggalLahir";

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Santri_nama_key" ON "public"."Santri"("nama");
