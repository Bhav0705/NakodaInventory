import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const folder = `${yyyy}-${mm}-${dd}`;
    const full = path.join(config.inventoryMediaRoot, folder);
    fs.mkdirSync(full, { recursive: true });
    cb(null, full);
  },
  filename: (req, file, cb) => {
    const { transactionType, transactionId, direction } = req.body as any;
    const now = new Date();
    const ts = now.toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
    const ext = path.extname(file.originalname) || '.bin';
    const base =
      `${direction || 'X'}_${transactionType || 'TXN'}-${transactionId || 'NA'}_${ts}`.replace(
        /\s+/g,
        ''
      );
    const field = file.fieldname || 'file';
    cb(null, `${base}_${field}${ext}`);
  }
});

export const inventoryMediaUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});
