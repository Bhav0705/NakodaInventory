// src/routes/auth.ts
import { Router } from 'express';
import {
  login,
  registerSuperAdmin,
  me,
  hasSuperAdmin,
  createUser,
} from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = Router();

// one-time super admin
router.post('/register-super-admin', registerSuperAdmin);

// check if super admin already exists (for LoginPage)
router.get('/has-super-admin', hasSuperAdmin);

// login
router.post('/login', login);

// only super_admin can create other users (admin / manager / viewer)
router.post('/create-user', auth, createUser);

// current user info
router.get('/me', auth, me);

export default router;
