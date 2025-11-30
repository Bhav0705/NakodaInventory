// src/routes/stockRoutes.ts
import { Router } from 'express';
import { getStock, getStockLedger, adjustStock } from '../controllers/stockController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, getStock);
router.get('/ledger', auth, getStockLedger);


router.post('/adjust', auth, adjustStock);

export default router;
