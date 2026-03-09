-- CreateEnum
CREATE TYPE "public"."KualitasHafalan" AS ENUM ('Kurang', 'Cukup', 'Baik', 'SangatBaik');

-- CreateEnum
CREATE TYPE "public"."KeteranganHafalan" AS ENUM ('Mengulang', 'Lanjut');

-- AlterTable
ALTER TABLE "public"."RiwayatHafalan" ADD COLUMN     "keterangan" "public"."KeteranganHafalan",
ADD COLUMN     "kualitas" "public"."KualitasHafalan";
