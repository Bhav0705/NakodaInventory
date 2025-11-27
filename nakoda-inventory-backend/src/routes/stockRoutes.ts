// src/routes/stockRoutes.ts
import { Router } from 'express';
import { getStock, getStockLedger } from '../controllers/stockController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, getStock);
router.get('/ledger', auth, getStockLedger);

export default router;
