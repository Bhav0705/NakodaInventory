// src/controllers/userController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import Warehouse from '../models/Warehouse';
import { hashPassword } from '../utils/password';

/**
 * 🔥 GET /api/users
 * Filter by role optional
 */
export async function listUsers(req: Request, res: Response) {
  const { role } = req.query as { role?: string };

  const filter: any = {};
  if (role) filter.role = role;

  const users = await User.find(filter)
    .populate("assignedWarehouses")
    .sort({ createdAt: -1 });

  res.json(
    users.map((u: any) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      assignedWarehouses: (u.assignedWarehouses || []).map((w: any) => ({
        id: w._id,
        name: w.name,
        code: w.code,
      })),
    }))
  );
}

/**
 * 🔥 POST /api/users
 * Create Admin / Manager / Viewer
 * Super clean validation
 */
export async function createUser(req: Request, res: Response) {
  try {
    const { name, email, password, role, assignedWarehouses } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "name, email, password, role required",
      });
    }

    // unique email
    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash
    const hashed = await hashPassword(password);

    // warehouses validation
    let whIds: string[] = [];
    if (Array.isArray(assignedWarehouses) && assignedWarehouses.length > 0) {
      const found = await Warehouse.find({
        _id: { $in: assignedWarehouses },
      }).select("_id");

      whIds = found.map((w) => w._id.toString());
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      assignedWarehouses: whIds,
      status: "active",
    });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedWarehouses: whIds,
    });
  } catch (error: any) {
    console.error("createUser Error", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * 🔥 PATCH /api/users/:id/warehouses
 * Update Manager warehouse rights
 */
export async function updateUserWarehouses(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { assignedWarehouses } = req.body as { assignedWarehouses?: string[] };

    if (!Array.isArray(assignedWarehouses)) {
      return res.status(400).json({
        message: "assignedWarehouses must be an array of IDs",
      });
    }

    const foundWh = await Warehouse.find({
      _id: { $in: assignedWarehouses },
    }).select("_id");

    const whIds = foundWh.map((w) => w._id.toString());

    const user = await User.findByIdAndUpdate(
      id,
      { assignedWarehouses: whIds },
      { new: true }
    ).populate("assignedWarehouses");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedWarehouses: (user.assignedWarehouses as any[]).map((w) => ({
        id: w._id,
        name: w.name,
        code: w.code,
      })),
    });
  } catch (error: any) {
    console.error("updateUserWarehouses Error", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * 🔥 PATCH /api/users/:id/status
 * Activate / Deactivate User
 */
export async function updateUserStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: "active" | "inactive" };

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "status must be active or inactive",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (error: any) {
    console.error("updateUserStatus Error", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
