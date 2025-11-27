// src/routes/userRoutes.ts
import { Router } from 'express';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  listUsers,
  createUser,
  updateUserWarehouses,
  updateUserStatus,
} from '../controllers/userController';

const router = Router();

// only super_admin can manage users
router.get('/', auth, requireRole('super_admin'), listUsers);
router.post('/', auth, requireRole('super_admin'), createUser);
router.patch('/:id/warehouses', auth, requireRole('super_admin'), updateUserWarehouses);
router.patch('/:id/status', auth, requireRole('super_admin'), updateUserStatus);

export default router;
