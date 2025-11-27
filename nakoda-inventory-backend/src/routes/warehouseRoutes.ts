import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from '../controllers/warehouseController';

const router = Router();

// Everyone authenticated can list (with filter)
router.get('/', auth, listWarehouses);

router.post('/', auth, createWarehouse);
router.put('/:id', auth, updateWarehouse);
router.delete('/:id', auth, deleteWarehouse);

export default router;
