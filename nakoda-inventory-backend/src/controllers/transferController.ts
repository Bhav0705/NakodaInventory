// src/controllers/transferController.ts
import { Request, Response } from 'express';
import Transfer from '../models/Transfer';
import StockLevel from '../models/StockLevel';
import StockMovement from '../models/StockMovement';
import Warehouse from '../models/Warehouse';
import Product from '../models/Product';

interface AuthUser {
  id: string;
  role: string;
  warehouses: string[];
}

export async function createTransfer(req: Request, res: Response) {
  const user = req.user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: 'Unauthenticated' });

  const { fromWarehouseId, toWarehouseId, lines, remarks } = req.body || {};

  if (!fromWarehouseId || !toWarehouseId) {
    return res
      .status(400)
      .json({ message: 'fromWarehouseId and toWarehouseId required' });
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ message: 'At least one line required' });
  }

  if (fromWarehouseId === toWarehouseId) {
    return res
      .status(400)
      .json({ message: 'From and To warehouse cannot be same for transfer' });
  }

  const fromWh = await Warehouse.findById(fromWarehouseId);
  const toWh = await Warehouse.findById(toWarehouseId);
  if (!fromWh || !toWh) {
    return res.status(400).json({ message: 'Invalid warehouse id(s)' });
  }

  // optional: check user has access to fromWarehouse
  if (
    user.role !== 'super_admin' &&
    !user.warehouses.includes(String(fromWarehouseId))
  ) {
    return res.status(403).json({ message: 'No access to source warehouse' });
  }

  const normalizedLines: { productId: string; quantity: number }[] = [];

  for (const line of lines) {
    if (!line.productId || line.quantity == null) {
      return res
        .status(400)
        .json({ message: 'productId and quantity required' });
    }

    const qty = Number(line.quantity);
    if (!qty || qty <= 0) {
      return res
        .status(400)
        .json({ message: 'quantity must be a positive number (pieces)' });
    }

    const product = await Product.findById(line.productId);
    if (!product) {
      return res
        .status(400)
        .json({ message: `Invalid productId ${line.productId}` });
    }

    normalizedLines.push({
      productId: line.productId,
      quantity: qty, // pieces
    });
  }

  const transfer = await Transfer.create({
    fromWarehouseId,
    toWarehouseId,
    lines: normalizedLines,
    status: 'DRAFT',
    remarks,
    createdBy: user.id,
  });

  res.json(transfer);
}

export async function approveTransfer(req: Request, res: Response) {
  const user = req.user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: 'Unauthenticated' });

  const { id } = req.params;
  const transfer = await Transfer.findById(id);
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

  if (transfer.status === 'APPROVED') {
    return res.status(400).json({ message: 'Transfer already approved' });
  }

  // check access to fromWarehouse
  if (
    user.role !== 'super_admin' &&
    !user.warehouses.includes(String(transfer.fromWarehouseId))
  ) {
    return res.status(403).json({ message: 'No access to source warehouse' });
  }

  // ---- NEW: resolve warehouse labels for notes ----
  const fromWh = await Warehouse.findById(transfer.fromWarehouseId).lean();
  const toWh = await Warehouse.findById(transfer.toWarehouseId).lean();

  const fromLabel = fromWh
    ? `${fromWh.name}${fromWh.code ? ` (${fromWh.code})` : ''}`
    : String(transfer.fromWarehouseId);

  const toLabel = toWh
    ? `${toWh.name}${toWh.code ? ` (${toWh.code})` : ''}`
    : String(transfer.toWarehouseId);
  // -------------------------------------------------

  // 1) validate stock in source warehouse (all quantities in pieces)
  for (const line of transfer.lines) {
    const qty = Number((line as any).quantity || 0);
    if (!qty || qty <= 0) continue;

    const current = await StockLevel.findOne({
      warehouseId: transfer.fromWarehouseId,
      productId: line.productId,
    });

    const available = current?.quantity || 0;
    if (available < qty) {
      return res.status(400).json({
        message: 'Insufficient stock in source warehouse for one or more items',
      });
    }
  }

  // 2) perform OUT from source + IN to destination
  for (const line of transfer.lines) {
    const qty = Number((line as any).quantity || 0);
    if (!qty || qty <= 0) continue;

    // Source warehouse — OUT
    const sourceLevel = await StockLevel.findOneAndUpdate(
      {
        warehouseId: transfer.fromWarehouseId,
        productId: line.productId,
      },
      { $inc: { quantity: -qty } },
      { new: true }
    );

    if (!sourceLevel || sourceLevel.quantity < 0) {
      return res.status(500).json({
        message: 'Stock level went negative in source warehouse. Aborting.',
      });
    }

    // Movement from source (OUT)
    await StockMovement.create({
      productId: line.productId,
      warehouseId: transfer.fromWarehouseId,
      direction: 'OUT',
      quantityBase: qty, // pieces
      transactionType: 'TRANSFER_OUT',
      transactionId: transfer._id,
      // 👇 UPDATED NOTE: show destination warehouse
      notes: `Warehouse transfer OUT → ${toLabel}`,
      createdBy: user.id,
      timestamp: new Date(),
    });

    // Destination warehouse — IN
    await StockLevel.findOneAndUpdate(
      {
        warehouseId: transfer.toWarehouseId,
        productId: line.productId,
      },
      { $inc: { quantity: qty } },
      { new: true, upsert: true }
    );

    // Movement to destination (IN)
    await StockMovement.create({
      productId: line.productId,
      warehouseId: transfer.toWarehouseId,
      direction: 'IN',
      quantityBase: qty, // pieces
      transactionType: 'TRANSFER_IN',
      transactionId: transfer._id,
      // 👇 UPDATED NOTE: show source warehouse
      notes: `Warehouse transfer IN ← ${fromLabel}`,
      createdBy: user.id,
      timestamp: new Date(),
    });
  }

  transfer.status = 'APPROVED';
  transfer.approvedBy = user.id as any;
  transfer.approvedAt = new Date();
  await transfer.save();

  res.json({ message: 'Transfer approved', transfer });
}

