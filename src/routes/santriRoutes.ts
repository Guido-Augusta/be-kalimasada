import { Router } from 'express';
import * as santriController from '../controllers/santriController';
import { createUploadMiddleware } from '../utils/upload';
import { authMiddleware, isAdmin, isAdminUstadSantri, isSantriOrAdmin, isUstadzOrAdmin } from '../middleware/auth';

const santriRoutes = Router();
const upload = createUploadMiddleware("santri");

// Reset semua total poin
// santriRoutes.put('/reset-points', authMiddleware, isAdmin, santriController.resetAllPoints);

santriRoutes.post('/', authMiddleware, isAdmin, upload.single("fotoProfil"), santriController.create);
santriRoutes.get('/peringkat', authMiddleware, isUstadzOrAdmin, santriController.getPeringkatSantri);
santriRoutes.get('/nama/:nama', authMiddleware, isUstadzOrAdmin, santriController.getByName);
santriRoutes.get('/', authMiddleware, santriController.getAll);
santriRoutes.get('/:id', authMiddleware, santriController.getOne);
santriRoutes.put('/:id', authMiddleware, isAdminUstadSantri, upload.single("fotoProfil"), santriController.update);
santriRoutes.delete('/:id', authMiddleware, isAdmin, santriController.remove);

// Mengurangi poin individu
// santriRoutes.put('/:id/deduct-points', authMiddleware, isAdmin, santriController.deductPoints);

export default santriRoutes;