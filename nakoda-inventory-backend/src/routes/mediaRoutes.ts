import { Router } from 'express';
import { uploadMedia, listMedia } from '../controllers/mediaController';
import { auth } from '../middleware/auth';
import { inventoryMediaUpload } from '../middleware/inventoryMediaUpload';

const router = Router();

router.post('/', auth, inventoryMediaUpload.array('files', 10), uploadMedia);
router.get('/', auth, listMedia);

export default router;
