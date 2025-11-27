// src/controllers/mediaController.ts
import { Response } from 'express';
import path from 'path';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config/env';
import InventoryMedia from '../models/InventoryMedia';
import Warehouse from '../models/Warehouse';

export async function uploadMedia(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { transactionType, transactionId, direction, warehouseId } = req.body as any;

  if (!transactionType || !transactionId || !direction || !warehouseId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // 🔹 Resolve warehouseId: allow _id OR code OR name
  let warehouseObjectId: mongoose.Types.ObjectId | null = null;

  if (mongoose.Types.ObjectId.isValid(warehouseId)) {
    // Proper Mongo _id
    warehouseObjectId = new mongoose.Types.ObjectId(warehouseId);
  } else {
    // Try to find by code or name
    const wh = await Warehouse.findOne({
      $or: [{ code: warehouseId }, { name: warehouseId }],
    });

    if (!wh) {
      return res
        .status(400)
        .json({ message: `Invalid warehouseId/code/name: ${warehouseId}` });
    }

    warehouseObjectId = wh._id;
  }

  const files = (req as any).files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const docs = [];
  for (const file of files) {
    const relative = path
      .relative(config.inventoryMediaRoot, file.path)
      .replace(/\\/g, '/')
      .replace(/\//g, '/');

    const fileType = file.mimetype.startsWith('video') ? 'video' : 'image';

    const doc = await InventoryMedia.create({
      transactionType,
      transactionId,
      direction,
      warehouseId: warehouseObjectId, // ✅ always ObjectId in DB
      fileType,
      localPath: relative,
      createdBy: req.user.id,
    });

    docs.push(doc);
  }

  res.json({ message: 'Uploaded', media: docs });
}

export async function listMedia(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { transactionType, transactionId } = req.query as any;
  if (!transactionType || !transactionId) {
    return res
      .status(400)
      .json({ message: 'transactionType and transactionId required' });
  }

  const media = await InventoryMedia.find({ transactionType, transactionId }).sort({
    createdAt: -1,
  });

  res.json(media);
}
