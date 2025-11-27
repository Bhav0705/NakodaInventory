import { Router } from 'express';
import { login, registerSuperAdmin, me } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/register-super-admin', registerSuperAdmin);
router.post('/login', login);
router.get('/me', auth, me);

export default router;
