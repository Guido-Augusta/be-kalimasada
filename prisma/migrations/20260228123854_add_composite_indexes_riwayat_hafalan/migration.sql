-- CreateIndex
CREATE INDEX "RiwayatHafalan_santriId_status_tanggalHafalan_idx" ON "public"."RiwayatHafalan"("santriId", "status", "tanggalHafalan");

-- CreateIndex
CREATE INDEX "RiwayatHafalan_santriId_status_ayatId_idx" ON "public"."RiwayatHafalan"("santriId", "status", "ayatId");
