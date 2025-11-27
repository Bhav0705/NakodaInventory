// src/routes/grnRoutes.ts
import { Router } from 'express';
import { auth } from '../middleware/auth';
import { createGRN, approveGRN, listGRN } from '../controllers/grnController';

const router = Router();

router.get('/', auth, listGRN);          // optional list
router.post('/', auth, createGRN);
router.post('/:id/approve', auth, approveGRN);

export default router;
