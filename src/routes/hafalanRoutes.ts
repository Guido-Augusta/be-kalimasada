import * as hafalanController from "../controllers/hafalanController";
import { Router } from "express";
import { authMiddleware, isUstadzOrAdmin } from "../middleware/auth";

const hafalanRoutes = Router();

// Simpan Hafalan
hafalanRoutes.post("/", authMiddleware, isUstadzOrAdmin, hafalanController.simpanHafalan);

// Get Surah Progress
hafalanRoutes.get("/:santriId/surah", authMiddleware, hafalanController.getSurahProgress);

// Get Detail Hafalan per Surah (Mode Tambah & Mode Murajaah)
hafalanRoutes.get("/:santriId/surah/:surahId", authMiddleware, hafalanController.getDetailHafalanSurah);

// GET Riwayat Hafalan by Santri
hafalanRoutes.get("/riwayat/:santriId", authMiddleware, hafalanController.getRiwayatHafalanBySantri);

// GET Riwayat Detail by Date and Surah
hafalanRoutes.get("/riwayat/detail/:santriId/surah/:surahId", authMiddleware, hafalanController.getRiwayatDetailByDateAndSurah);

// DELETE Riwayat Hafalan
hafalanRoutes.delete("/riwayat", authMiddleware, isUstadzOrAdmin, hafalanController.deleteRiwayatHafalan);

// GET Latest Hafalan All Santri
hafalanRoutes.get("/all-santri/latest", authMiddleware, isUstadzOrAdmin, hafalanController.getLatestHafalanAllSantri);

export default hafalanRoutes;