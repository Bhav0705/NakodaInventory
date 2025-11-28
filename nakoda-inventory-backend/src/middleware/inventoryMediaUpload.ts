import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const folder = `${yyyy}-${mm}-${dd}`;
    const fullPath = path.join(config.inventoryMediaRoot, folder);

    try {
      fs.mkdirSync(fullPath, { recursive: true });
    } catch (e) {
      console.error('Error creating upload directory', fullPath, e);
      return cb(e as any, '');
    }

    cb(null, fullPath);
  },

  filename: (req, file, cb) => {
    const { transactionType, transactionId, direction } = req.body;

    const now = new Date();
    const ts = now
      .toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .slice(0, 19);

    const ext = path.extname(file.originalname) || '.bin';

    // sanitize filename-safe strings
    const safeTx = (transactionType || 'TXN').replace(/\W+/g, '');
    const safeId = (transactionId || 'NA').replace(/\W+/g, '');
    const safeDir = (direction || 'X').replace(/\W+/g, '');

    const base = `${safeDir}_${safeTx}-${safeId}_${ts}`;
    const field = file.fieldname || 'file';

    cb(null, `${base}_${field}${ext}`);
  },
});

export const inventoryMediaUpload = multer({
  storage,
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image/video allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});
