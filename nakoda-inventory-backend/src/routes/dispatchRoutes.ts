// src/routes/dispatchRoutes.ts
import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  createDispatch,
  approveDispatch,
  listDispatch,
} from '../controllers/dispatchController';

const router = Router();

router.get('/', auth, listDispatch);        // optional list
router.post('/', auth, createDispatch);
router.post('/:id/approve', auth, approveDispatch);

export default router;
