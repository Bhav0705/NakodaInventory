
// src/controllers/warehouseController.ts
import { Request, Response } from 'express';
import Warehouse from '../models/Warehouse';
import User from '../models/User';    

interface AuthUser {
  id: string;
  role: string;
  assignedWarehouses?: string[];
  warehouses?: string[];
}

export async function listWarehouses(req: Request, res: Response) {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    const filter: any = {};

    // ---------- PERMISSION FILTER ----------
    // super_admin -> saare warehouses
    if (user.role !== 'super_admin') {
      const allowed = user.warehouses?.length
        ? user.warehouses
        : user.assignedWarehouses?.length
        ? user.assignedWarehouses
        : [];

      if (!allowed.length) return res.json([]); // koi permission नहीं

      filter._id = { $in: allowed };
    }

    const docs = await Warehouse.find(filter).sort({ name: 1 });

    // ---------- ASSIGNED USERS MAPPING (sirf admin view ke लिए) ----------
    let assignmentsByWh: Record<string, any[]> = {};

    if (user.role === 'super_admin' && docs.length) {
      const whIds = docs.map((w) => String(w._id));

      const users = await User.find(
  { assignedWarehouses: { $in: whIds } },  // ✅ this field is in your DB
  { name: 1, email: 1, role: 1, assignedWarehouses: 1 }
).lean();

      for (const u of users) {
        // admin ko list se हटा दो
        if (u.role === 'super_admin') continue;

        const uw = (u.assignedWarehouses || []).map((x:any) => String(x));
        for (const wid of uw) {
          if (!whIds.includes(wid)) continue;
          if (!assignmentsByWh[wid]) assignmentsByWh[wid] = [];
          assignmentsByWh[wid].push({
            id: String(u._id),
            name: u.name,
            email: u.email,
            role: u.role,
          });
        }
      }
    }

    // ---------- RESPONSE ----------
    res.json(
      docs.map((w) => ({
        id: w._id.toString(),
        name: w.name,
        code: w.code,
        address: w.address,
        status: w.status,
        // super_admin ko list milegi, बाकी users ko empty array
        assignedUsers:
          user.role === 'super_admin'
            ? assignmentsByWh[w._id.toString()] || []
            : [],
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
export async function listTransferWarehouses(req: Request, res: Response) {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Unauthenticated" });

    // load all warehouses
    const warehouses = await Warehouse.find().sort({ name: 1 }).lean();

    let fromList: any[] = [];
    let toList: any[] = [];

    // super admin → from/to = all
    if (user.role === "super_admin") {
      fromList = warehouses;
      toList = warehouses;
    } else {
      // non-admin → From only assigned
      const allowed = user.warehouses || [];
      fromList = warehouses.filter((w) => allowed.includes(String(w._id)));

      // ToList = all except same ID
      toList = warehouses;
    }

    return res.json({
      fromWarehouses: fromList.map((w) => ({
        id: String(w._id),
        name: w.name,
        code: w.code,
      })),
      toWarehouses: toList.map((w) => ({
        id: String(w._id),
        name: w.name,
        code: w.code,
      })),
    });
  } catch (error) {
    console.error("listTransferWarehouses error", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
