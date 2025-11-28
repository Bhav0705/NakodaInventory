import { Router } from 'express';
import {
  listProducts,
  createProduct,
  addAlias,
  addPacking,
  searchProducts
} from '../controllers/productController';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { uploadProductImage } from '../middleware/upload';

const router = Router();

router.get('/', auth, listProducts);

router.post(
  '/',
  auth,
  requireRole('super_admin'),
  uploadProductImage.array('media', 8),  
  createProduct
);

router.post('/alias', auth, requireRole('super_admin'), addAlias);
router.post('/packing', auth, requireRole('super_admin'), addPacking);
router.get('/search', auth, searchProducts);

export default router;
