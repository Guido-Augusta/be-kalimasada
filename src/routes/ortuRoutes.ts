import { Router } from 'express';
import * as ortuController from '../controllers/ortuControllers';
import { authMiddleware, isAdmin, isOrtuOrAdmin } from '../middleware/auth';
import { createUploadMiddleware } from '../utils/upload';

const ortuRoutes = Router();
const upload = createUploadMiddleware("ortu");

ortuRoutes.post('/', authMiddleware, isAdmin, upload.single("fotoProfil"), ortuController.create);
ortuRoutes.get('/', authMiddleware, isAdmin, ortuController.getAll);
ortuRoutes.get('/:id', authMiddleware, ortuController.getOne);
ortuRoutes.get('/nama/:nama', authMiddleware, isAdmin, ortuController.getByName);
ortuRoutes.put('/:id', authMiddleware, isOrtuOrAdmin, upload.single("fotoProfil"), ortuController.update);
ortuRoutes.delete('/:id', authMiddleware, isAdmin, ortuController.remove);

export default ortuRoutes;