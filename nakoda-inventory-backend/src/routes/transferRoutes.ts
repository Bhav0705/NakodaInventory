// src/routes/transferRoutes.ts
import { Router } from 'express';
import { auth } from '../middleware/auth';
import { createTransfer, approveTransfer } from '../controllers/transferController';

const router = Router();

// any manager with access to fromWarehouse can create
router.post('/', auth, createTransfer);

// approve (for now, any authenticated with access to fromWarehouse; super_admin has all)
router.post('/:id/approve', auth, approveTransfer);

export default router;
