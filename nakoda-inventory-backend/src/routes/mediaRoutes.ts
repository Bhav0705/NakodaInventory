import { Router } from 'express';
import { uploadMedia, listMedia } from '../controllers/mediaController';
import { auth } from '../middleware/auth';
import { inventoryMediaUpload } from '../middleware/inventoryMediaUpload';

const router = Router();

// Upload
router.post(
  '/upload',
  auth,
  inventoryMediaUpload.array('files', 10),
  uploadMedia
);

// List
router.get(
  '/list',
  auth,
  listMedia
);

export default router;
