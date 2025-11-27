// src/controllers/grnController.ts
import { Request, Response } from 'express';
import GRN from '../models/GRN';
import StockLevel from '../models/StockLevel';
import StockMovement from '../models/StockMovement';
import Warehouse from '../models/Warehouse';
import Product from '../models/Product';

interface AuthUser {
  id: string;
  role: 'super_admin' | 'warehouse_admin' | 'warehouse_manager' | 'viewer';
  warehouses: string[]; // allowed warehouse IDs
}

function ensureWarehouseAccess(user: AuthUser, warehouseId: any) {
  const wid = String(warehouseId);
  if (user.role === 'super_admin') return;
  if (user.warehouses.includes(wid)) return;
  const err: any = new Error('No access to this warehouse');
  err.statusCode = 403;
  throw err;
}

/**
 * POST /api/grn
 * Body: { warehouseId, supplierName?, supplierInvoiceNo?, lines: [{ productId, packingType, quantity, quantityBase }] }
 */
export async function createGRN(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    const { warehouseId, supplierName, supplierInvoiceNo, lines } = req.body || {};

    if (!warehouseId) {
      return res.status(400).json({ message: 'warehouseId required' });
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: 'At least one line required' });
    }

    // warehouse exists?
    const wh = await Warehouse.findById(warehouseId);
    if (!wh) {
      return res.status(400).json({ message: 'Invalid warehouseId' });
    }

    // manager access check
    ensureWarehouseAccess(user, warehouseId);

    const normalizedLines: {
      productId: string;
      packingType: 'LOOSE' | 'KATTA' | 'MASTER' | 'OTHER';
      quantity: number;
      quantityBase: number;
    }[] = [];

    for (const line of lines) {
      if (!line.productId || !line.quantityBase) {
        return res
          .status(400)
          .json({ message: 'Each line must have productId and quantityBase' });
      }
      const product = await Product.findById(line.productId);
      if (!product) {
        return res.status(400).json({
          message: `Invalid productId in lines: ${line.productId}`,
        });
      }

      normalizedLines.push({
        productId: line.productId,
        packingType: line.packingType || 'LOOSE',
        quantity: Number(line.quantity || line.quantityBase),
        quantityBase: Number(line.quantityBase),
      });
    }

    const grn = await GRN.create({
      warehouseId,
      supplierName,
      supplierInvoiceNo,
      lines: normalizedLines,
      status: 'DRAFT',
      createdBy: user.id,
    });

    res.json(grn);
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('createGRN error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * POST /api/grn/:id/approve
 */
// src/controllers/grnController.ts

export async function approveGRN(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    const { id } = req.params;
    const grn = await GRN.findById(id);
    if (!grn) return res.status(404).json({ message: 'GRN not found' });

    // manager access check on that GRN's warehouse
    ensureWarehouseAccess(user, grn.warehouseId);

    if (grn.status === 'APPROVED') {
      return res.status(400).json({ message: 'GRN already approved' });
    }

    const supplierName = (grn as any).supplierName || '';
    const supplierInvoiceNo = (grn as any).supplierInvoiceNo || '';

    // IN movement for each line
    for (const line of grn.lines) {
      const qty = Number((line as any).quantityBase || 0);
      if (!qty || qty <= 0) continue;

      const packingType = (line as any).packingType || 'LOOSE';

      // Update stock
      const level = await StockLevel.findOneAndUpdate(
        {
          warehouseId: grn.warehouseId,
          productId: line.productId,
        },
        { $inc: { quantity: qty } },
        { new: true, upsert: true }
      );

      if (!level) {
        return res
          .status(500)
          .json({ message: 'Failed to update stock level for GRN' });
      }

      // Human-readable notes including supplier
      const notesParts = [
        'GRN approval',
        supplierName && `Supplier: ${supplierName}`,
        supplierInvoiceNo && `Invoice: ${supplierInvoiceNo}`,
      ].filter(Boolean);
      const notes = notesParts.join(' | ');

      // Stock movement
      await StockMovement.create({
        productId: line.productId,
        warehouseId: grn.warehouseId,
        direction: 'IN',
        packingType,
        quantityBase: qty,
        // quantity: qty, // use this if your schema uses `quantity` instead of `quantityBase`
        transactionType: 'GRN',
        transactionId: grn._id,
        notes,                // ← supplier visible in ledger
        createdBy: user.id,
        timestamp: new Date(),
      });
    }

    grn.status = 'APPROVED';
    (grn as any).approvedBy = user.id;
    (grn as any).approvedAt = new Date();
    await grn.save();

    res.json({ message: 'GRN approved and stock updated', grn });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('approveGRN error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


/**
 * OPTIONAL: list GRNs filtered by user’s warehouses
 * GET /api/grn
 */
export async function listGRN(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    const filter: any = {};
    if (user.role !== 'super_admin') {
      filter.warehouseId = { $in: user.warehouses };
    }

    const list = await GRN.find(filter)
      .populate('warehouseId')
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (error) {
    console.error('listGRN error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
