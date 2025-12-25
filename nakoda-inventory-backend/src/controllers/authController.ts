// src/controllers/authController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

/* -----------------------------
  REGISTER SUPER ADMIN (ONE-TIME)
----------------------------- */
export async function registerSuperAdmin(req: Request, res: Response) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, password required' });
  }

  // block if any super_admin already exists
  const superExists = await User.exists({ role: 'super_admin' });
  if (superExists) {
    return res
      .status(403)
      .json({ message: 'Super admin already exists. Please login instead.' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  const hashed = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role: 'super_admin',
    assignedWarehouses: [],
  });

  const assignedIds: string[] = [];

 const token = signToken({
  sub: user._id.toString(),
  id: user._id.toString(),
  role: user.role,
  assignedWarehouses: assignedIds,
  warehouses: assignedIds,
  email: user.email,
  name: user.name,
});

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedWarehouses: assignedIds,
      warehouses: assignedIds,
    },
  });
}

/* -----------------------------
  LOGIN
----------------------------- */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await User.findOne({ email, status: 'active' }).populate(
    'assignedWarehouses'
  );

  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const ok = await comparePassword(password, user.password);
  if (!ok) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const assignedIds: string[] = (user.assignedWarehouses as any[]).map((w) =>
    w._id.toString()
  );

  const token = signToken({
  sub: user._id.toString(),
  id: user._id.toString(),
  role: user.role,
  assignedWarehouses: assignedIds,
  warehouses: assignedIds,
  email: user.email,
  name: user.name,
});


  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedWarehouses: assignedIds,
      warehouses: assignedIds,
    },
  });
}

/* -----------------------------
  ME
----------------------------- */
export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

const userId = (req.user as any).id || (req.user as any).sub;
const data = await User.findById(userId).populate('assignedWarehouses');


  if (!data) {
    return res.status(404).json({ message: 'User not found' });
  }

  const assigned: string[] = (data.assignedWarehouses as any[]).map((w) =>
    w._id.toString()
  );

  res.json({
    id: data._id,
    name: data.name,
    email: data.email,
    role: data.role,
    assignedWarehouses: assigned,
    warehouses: assigned, // keep both for frontend
  });
}

/* -----------------------------
  HAS SUPER ADMIN? (for frontend)
----------------------------- */
export async function hasSuperAdmin(_req: Request, res: Response) {
  const exists = await User.exists({ role: 'super_admin' });
  res.json({ hasSuperAdmin: !!exists });
}

/* -----------------------------
  CREATE USER (ONLY SUPER_ADMIN)
----------------------------- */
export async function createUser(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // only super_admin can create admin / manager / viewer
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admin can create users' });
  }

  const { name, email, password, role, assignedWarehouses } = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, role required' });
  }

  // allowed roles for created users
  const allowedRoles = ['super_admin', 'warehouse_admin', 'warehouse_manager', 'viewer'] as const;
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  const hashed = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role,
    assignedWarehouses: Array.isArray(assignedWarehouses)
      ? assignedWarehouses
      : [],
  });

  const assignedIds: string[] = (user.assignedWarehouses as any[]).map((w) =>
    w.toString()
  );

  // no auto-login here; just return created user
  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedWarehouses: assignedIds,
      warehouses: assignedIds,
    },
  });
}
