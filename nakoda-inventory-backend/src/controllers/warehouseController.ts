// src/controllers/warehouseController.ts
import { Request, Response } from 'express';
import Warehouse from '../models/Warehouse';

interface AuthUser {
  id: string;
  role: 'super_admin' | 'warehouse_admin' | 'warehouse_manager' | 'viewer';
  assignedWarehouses: string[];
}

/* -----------------------------
  LIST WAREHOUSES
----------------------------- */
export async function listWarehouses(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    let filter: any = {};

    if (user.role !== 'super_admin') {
      filter._id = { $in: user.assignedWarehouses || [] };
    }

    const list = await Warehouse.find(filter).sort({ name: 1 });

    res.json(
      list.map((w) => ({
        id: w._id,
        name: w.name,
        code: w.code,
        address: w.address,
        status: w.status,
      }))
    );
  } catch (error) {
    console.error('listWarehouses error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/* -----------------------------
  CREATE WAREHOUSE
----------------------------- */
export async function createWarehouse(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser;

    if (user.role !== 'super_admin' && user.role !== 'warehouse_admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const { name, code, address } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'name and code required' });
    }

    const existing = await Warehouse.findOne({ code });
    if (existing)
      return res.status(400).json({ message: 'Warehouse code already exists' });

    const w = await Warehouse.create({
      name,
      code,
      address,
      status: 'active',
    });

    res.json({
      id: w._id,
      name: w.name,
      code: w.code,
      address: w.address,
      status: w.status,
    });
  } catch (error) {
    console.error('createWarehouse error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/* -----------------------------
  UPDATE
----------------------------- */
export async function updateWarehouse(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser;

    if (user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can update' });
    }

    const { id } = req.params;

    const w = await Warehouse.findByIdAndUpdate(id, req.body, { new: true });
    if (!w) return res.status(404).json({ message: 'Warehouse not found' });

    res.json({
      id: w._id,
      name: w.name,
      code: w.code,
      address: w.address,
      status: w.status,
    });
  } catch (error) {
    console.error('updateWarehouse error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/* -----------------------------
  DELETE
----------------------------- */
export async function deleteWarehouse(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser;

    if (user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can delete' });
    }

    const { id } = req.params;

    const w = await Warehouse.findByIdAndDelete(id);
    if (!w) return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('deleteWarehouse error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
