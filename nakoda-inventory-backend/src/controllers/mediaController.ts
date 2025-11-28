import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import InventoryMedia from '../models/InventoryMedia';
import Warehouse from '../models/Warehouse';
import mongoose from 'mongoose';
import path from 'path';
import { config } from '../config/env';

export async function uploadMedia(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { transactionType, transactionId, direction, warehouseId } = req.body;

  if (!transactionType || !transactionId || !direction || !warehouseId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const files = req.files as Express.Multer.File[];
  if (!files?.length) return res.status(400).json({ message: 'No files uploaded' });

  // Find warehouse
  let realWarehouseId: mongoose.Types.ObjectId;
  if (mongoose.Types.ObjectId.isValid(warehouseId)) {
    realWarehouseId = new mongoose.Types.ObjectId(warehouseId);
  } else {
    const wh = await Warehouse.findOne({
      $or: [{ code: warehouseId }, { name: warehouseId }],
    });
    if (!wh) return res.status(400).json({ message: 'Invalid warehouseId' });
    realWarehouseId = wh._id;
  }

  const docs = [];
  for (const file of files) {
    const relative = path
      .relative(config.inventoryMediaRoot, file.path)
      .replace(/\\/g, '/');

    const fileType = file.mimetype.startsWith('video') ? 'video' : 'image';

    docs.push(
      await InventoryMedia.create({
        transactionType,
        transactionId,
        warehouseId: realWarehouseId,
        direction,
        fileType,
        localPath: relative,
        createdBy: req.user.id,
      })
    );
  }

  res.json({ message: 'Uploaded', media: docs });
}

export async function listMedia(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { transactionType, transactionId } = req.query;

  if (!transactionType || !transactionId) {
    return res.status(400).json({ message: 'Missing transactionType or transactionId' });
  }

  const list = await InventoryMedia.find({
    transactionType,
    transactionId,
  }).sort({ createdAt: -1 });

  res.json(list);
}
