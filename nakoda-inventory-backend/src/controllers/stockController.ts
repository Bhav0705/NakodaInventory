// src/controllers/stockController.ts
import { Request, Response } from 'express';
import StockLevel from '../models/StockLevel';
import StockMovement from '../models/StockMovement';
import { AuthRequest } from '../middleware/auth'; // ✅ add this

export async function getStock(req: Request, res: Response) {
  const { warehouseId, productId } = req.query as {
    warehouseId?: string;
    productId?: string;
  };

  const filter: any = {};
  if (warehouseId) filter.warehouseId = warehouseId;
  if (productId) filter.productId = productId;

  const stock = await StockLevel.find(filter)
    .populate('warehouseId')
    .populate('productId')
    .sort({ 'productId.name': 1 });

  res.json(
    stock.map((s: any) => ({
      id: s._id,
      warehouse: s.warehouseId
        ? {
            id: s.warehouseId._id,
            name: s.warehouseId.name,
            code: s.warehouseId.code,
          }
        : null,
      product: s.productId
        ? {
            id: s.productId._id,
            name: s.productId.name,
            sku: s.productId.sku,
            category: s.productId.category,
          }
        : null,
      quantity: s.quantity, // pieces
      updatedAt: s.updatedAt,
    }))
  );
}

export async function getStockLedger(req: Request, res: Response) {
  const { warehouseId, productId, limit } = req.query as {
    warehouseId?: string;
    productId?: string;
    limit?: string;
  };

  if (!warehouseId || !productId) {
    return res
      .status(400)
      .json({ message: 'warehouseId and productId are required' });
  }

  const max = Math.min(Number(limit) || 200, 1000);

  const movements = await StockMovement.find({
    warehouseId,
    productId,
  })
    .sort({ timestamp: 1, createdAt: 1 })
    .limit(max);

  let running = 0;
  const rows = movements.map((m) => {
    const qty = m.quantityBase || 0; // pieces
    running += m.direction === 'IN' ? qty : -qty;

    return {
      id: m._id,
      timestamp: m.timestamp || (m as any).createdAt,
      transactionType: m.transactionType,
      direction: m.direction,
      quantity: qty, // pieces
      runningQuantity: running, // pieces
      notes: m.notes,
      transactionId: m.transactionId,
    };
  });

  res.json(rows);
}

// ✅ use AuthRequest instead of Request + AuthUser
export async function adjustStock(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const { warehouseId, productId, newQuantity, notes } = req.body || {};

    if (!warehouseId || !productId) {
      return res
        .status(400)
        .json({ message: 'warehouseId and productId are required' });
    }
    if (newQuantity === undefined || newQuantity === null) {
      return res
        .status(400)
        .json({ message: 'newQuantity required (pieces)' });
    }

    const targetQty = Number(newQuantity);
    if (!Number.isFinite(targetQty) || targetQty < 0) {
      return res
        .status(400)
        .json({ message: 'newQuantity must be a non-negative number' });
    }

    // Only super_admin or warehouse_admin allowed
    if (
      user.role !== 'super_admin' &&
      user.role !== 'warehouse_admin'
    ) {
      return res.status(403).json({
        message: 'Only super admin or warehouse admin can adjust stock',
      });
    }

    // Ensure access to this warehouse
     if (
      user.role !== 'super_admin' &&
      (!user.warehouses || !user.warehouses.includes(String(warehouseId)))
    ) {
      return res.status(403).json({ message: 'No access to this warehouse' });
    }

    // Load existing stock level (if missing, treat as 0)
    const currentDoc = await StockLevel.findOne({
      warehouseId,
      productId,
    });

    const currentQty = currentDoc?.quantity || 0;
    const delta = targetQty - currentQty;

    if (delta === 0) {
      return res.json({
        message: 'No change in quantity (already same value)',
        quantity: currentQty,
      });
    }

    if (targetQty < 0) {
      return res
        .status(400)
        .json({ message: 'Resulting stock cannot be negative' });
    }

    // Update stock level
    const updated = await StockLevel.findOneAndUpdate(
      { warehouseId, productId },
      { $set: { quantity: targetQty } },
      { new: true, upsert: true }
    );

    const positive = delta > 0;

    await StockMovement.create({
      warehouseId,
      productId,
      direction: positive ? 'IN' : 'OUT',
      quantityBase: Math.abs(delta),
      transactionType: positive
        ? 'ADJUSTMENT_POSITIVE'
        : 'ADJUSTMENT_NEGATIVE',
      transactionId: updated?._id,
      notes:
        notes ||
        `Manual adjustment from ${currentQty} → ${targetQty} pcs`,
      createdBy: user.id,
      timestamp: new Date(),
    });

    res.json({
      message: 'Stock adjusted',
      previousQuantity: currentQty,
      newQuantity: targetQty,
    });
  } catch (error: any) {
    console.error('adjustStock error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
