import { Router } from 'express';
import * as ustadzController from '../controllers/ustadzController';
import { authMiddleware, isAdmin, isUstadzOrAdmin } from '../middleware/auth';
import { createUploadMiddleware } from '../utils/upload';

const ustadzRoutes = Router();
const upload = createUploadMiddleware("ustadz");

// ustadzRoutes.use(authMiddleware, isAdmin);

ustadzRoutes.post('/', authMiddleware, isAdmin, upload.single("fotoProfil"), ustadzController.create);
ustadzRoutes.get('/', authMiddleware, isAdmin, ustadzController.getAll);
ustadzRoutes.get('/:id', authMiddleware, ustadzController.getOne);
ustadzRoutes.get('/nama/:nama', authMiddleware, isAdmin, ustadzController.getByName);
ustadzRoutes.put('/:id', authMiddleware, isUstadzOrAdmin, upload.single("fotoProfil"), ustadzController.update);
ustadzRoutes.delete('/:id', authMiddleware, isAdmin, ustadzController.remove);

export default ustadzRoutes;
