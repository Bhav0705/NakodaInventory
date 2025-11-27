// src/controllers/stockController.ts
import { Request, Response } from 'express';
import StockLevel from '../models/StockLevel';
import StockMovement from '../models/StockMovement';

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
        ? { id: s.warehouseId._id, name: s.warehouseId.name, code: s.warehouseId.code }
        : null,
      product: s.productId
        ? {
            id: s.productId._id,
            name: s.productId.name,
            sku: s.productId.sku,
            category: s.productId.category,
          }
        : null,
      quantity: s.quantity,
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
    return res.status(400).json({ message: 'warehouseId and productId are required' });
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
    const qty = m.quantityBase || 0;
    running += m.direction === 'IN' ? qty : -qty;

    return {
      id: m._id,
      timestamp: m.timestamp || (m as any).createdAt,
      transactionType: m.transactionType,
      direction: m.direction,
      quantity: qty,
      runningQuantity: running,
      notes: m.notes,
      transactionId: m.transactionId,
    };
  });

  res.json(rows);
}
