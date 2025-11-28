// src/controllers/dispatchController.ts
import { Request, Response } from 'express';
import Dispatch from '../models/Dispatch';
import StockLevel from '../models/StockLevel';
import StockMovement from '../models/StockMovement';
import Warehouse from '../models/Warehouse';
import Product from '../models/Product';

interface AuthUser {
  id: string;
  role: 'super_admin' | 'warehouse_admin' | 'warehouse_manager' | 'viewer';
  warehouses: string[];
}

function ensureWarehouseAccess(user: AuthUser, warehouseId: any) {
  const wid = String(warehouseId);
  if (user.role === 'super_admin') return;
  if (user.warehouses.includes(wid)) return;
  const err: any = new Error('No access to this warehouse');
  err.statusCode = 403;
  throw err;
}


export async function createDispatch(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    const { warehouseId, partyName, dispatchType, lines } = req.body || {};

    if (!warehouseId) {
      return res.status(400).json({ message: 'warehouseId required' });
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: 'At least one line required' });
    }

    const wh = await Warehouse.findById(warehouseId);
    if (!wh) {
      return res.status(400).json({ message: 'Invalid warehouseId' });
    }

    ensureWarehouseAccess(user, warehouseId);

    const normalizedLines: {
      productId: string;
      quantity: number;        // pieces
      sellingPrice?: number;
    }[] = [];

    for (const line of lines) {
      if (!line.productId || line.quantity == null) {
        return res
          .status(400)
          .json({ message: 'Each line must have productId and quantity' });
      }

      const qty = Number(line.quantity);
      if (!qty || qty <= 0) {
        return res
          .status(400)
          .json({ message: 'Line quantity must be a positive number (pieces)' });
      }

      const product = await Product.findById(line.productId);
      if (!product) {
        return res.status(400).json({
          message: `Invalid productId in lines: ${line.productId}`
        });
      }

      normalizedLines.push({
        productId: line.productId,
        quantity: qty,
        sellingPrice:
          line.sellingPrice != null ? Number(line.sellingPrice) : undefined
      });
    }

    const dispatch = await Dispatch.create({
      warehouseId,
      partyName,
      dispatchType: dispatchType || 'SALE',
      lines: normalizedLines,
      status: 'DRAFT',
      createdBy: user.id
    });

    res.json(dispatch);
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('createDispatch error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * POST /api/dispatch/:id/approve
 * Approves dispatch, validates stock, deducts pieces, creates OUT stock movements.
 */
export async function approveDispatch(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    const { id } = req.params;
    const dispatchDoc = await Dispatch.findById(id);
    if (!dispatchDoc)
      return res.status(404).json({ message: 'Dispatch not found' });

    const dispatch: any = dispatchDoc;
    ensureWarehouseAccess(user, dispatch.warehouseId);

    if (dispatch.status === 'APPROVED') {
      return res.status(400).json({ message: 'Dispatch already approved' });
    }

    const partyName = dispatch.partyName || '';

    // 1) validate stock for each line (all in pieces)
    for (const line of dispatch.lines) {
      const qty = Number((line as any).quantity || 0);
      if (!qty || qty <= 0) continue;

      const level = await StockLevel.findOne({
        warehouseId: dispatch.warehouseId,
        productId: line.productId
      });

      const available = level?.quantity || 0;
      if (available < qty) {
        return res.status(400).json({
          message: `Insufficient stock for product in this warehouse (need ${qty}, have ${available})`
        });
      }
    }

    // 2) deduct stock + create OUT movement
    for (const line of dispatch.lines) {
      const qty = Number((line as any).quantity || 0);
      if (!qty || qty <= 0) continue;

      const level = await StockLevel.findOneAndUpdate(
        {
          warehouseId: dispatch.warehouseId,
          productId: line.productId
        },
        { $inc: { quantity: -qty } },
        { new: true }
      );

      if (!level || level.quantity < 0) {
        return res.status(500).json({
          message: 'Stock level went negative for dispatch. Aborting.'
        });
      }

      const notesParts = [
        'Dispatch approval',
        partyName && `Party: ${partyName}`
      ].filter(Boolean);
      const notes = notesParts.join(' | ');

      await StockMovement.create({
        productId: line.productId,
        warehouseId: dispatch.warehouseId,
        direction: 'OUT',
        quantityBase: qty,            // pieces
        transactionType: 'DISPATCH',
        transactionId: dispatch._id,
        notes,
        createdBy: user.id,
        timestamp: new Date()
      });
    }

    dispatch.status = 'APPROVED';
    dispatch.approvedBy = user.id;
    dispatch.approvedAt = new Date();
    await dispatch.save();

    res.json({ message: 'Dispatch approved and stock updated', dispatch });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('approveDispatch error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * GET /api/dispatch
 * List dispatch documents filtered by user’s warehouses.
 */
export async function listDispatch(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    const filter: any = {};
    if (user.role !== 'super_admin') {
      filter.warehouseId = { $in: user.warehouses };
    }

    const list = await Dispatch.find(filter)
      .populate('warehouseId')
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (error) {
    console.error('listDispatch error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
