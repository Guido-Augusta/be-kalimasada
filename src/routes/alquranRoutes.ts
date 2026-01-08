import { Router } from 'express';
import * as alquranController from '../controllers/alquranController';

const alquranRoutes = Router();

alquranRoutes.get('/', alquranController.getAlquran);
alquranRoutes.get('/surah/:nomor', alquranController.getSurahByNumber);

export default alquranRoutes;
