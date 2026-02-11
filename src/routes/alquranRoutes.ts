import { Router } from 'express';
import * as alquranController from '../controllers/alquranController';

const alquranRoutes = Router();

alquranRoutes.get('/surah', alquranController.getAlquran);
alquranRoutes.get('/surah/:nomor', alquranController.getSurahByNumber);
alquranRoutes.get('/juz', alquranController.getAllJuz);
alquranRoutes.get('/juz/:idjuz', alquranController.getJuzById);

export default alquranRoutes;
