/*
  Warnings:

  - A unique constraint covering the columns `[noInduk]` on the table `Santri` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Santri" ADD COLUMN     "noInduk" TEXT,
ALTER COLUMN "nomorHp" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Santri_noInduk_key" ON "public"."Santri"("noInduk");
