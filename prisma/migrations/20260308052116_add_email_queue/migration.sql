-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "public"."EmailQueue" (
    "id" SERIAL NOT NULL,
    "emailOrtu" TEXT NOT NULL,
    "namaOrtu" TEXT NOT NULL,
    "namaSantri" TEXT NOT NULL,
    "tanggalHafalan" TIMESTAMP(3) NOT NULL,
    "namaSurah" TEXT NOT NULL,
    "jumlahAyat" INTEGER NOT NULL,
    "ayatNomorList" TEXT NOT NULL,
    "statusHafalan" TEXT NOT NULL,
    "kualitas" TEXT,
    "keterangan" TEXT,
    "catatan" TEXT,
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailQueue_status_createdAt_idx" ON "public"."EmailQueue"("status", "createdAt");
