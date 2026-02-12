import * as hafalanController from "../controllers/hafalanController";
import { Router } from "express";
import { authMiddleware, isUstadzOrAdmin } from "../middleware/auth";

const hafalanRoutes = Router();

// Simpan Hafalan
hafalanRoutes.post("/", authMiddleware, isUstadzOrAdmin, hafalanController.simpanHafalan);

// Get Progress by mode (surah or juz)
hafalanRoutes.get("/:santriId", authMiddleware, hafalanController.getProgress);

// Get Detail Hafalan per Surah (Mode Tambah & Mode Murajaah)
hafalanRoutes.get("/:santriId/surah/:surahId", authMiddleware, hafalanController.getDetailHafalanSurah);

// Get Detail Hafalan per Juz (Mode Tambah & Mode Murajaah)
hafalanRoutes.get("/:santriId/juz/:juzId", authMiddleware, hafalanController.getDetailHafalanJuz);

// GET Riwayat Hafalan by Santri
hafalanRoutes.get("/riwayat/:santriId", authMiddleware, hafalanController.getRiwayatHafalanBySantri);

// GET Riwayat Detail by Date and Surah
hafalanRoutes.get("/riwayat/detail/:santriId/surah/:surahId", authMiddleware, hafalanController.getRiwayatDetailByDateAndSurah);

// DELETE Riwayat Hafalan
hafalanRoutes.delete("/riwayat", authMiddleware, isUstadzOrAdmin, hafalanController.deleteRiwayatHafalan);

// GET Latest Hafalan All Santri
hafalanRoutes.get("/all-santri/latest", authMiddleware, isUstadzOrAdmin, hafalanController.getLatestHafalanAllSantri);

export default hafalanRoutes;