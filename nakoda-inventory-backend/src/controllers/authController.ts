import { Request, Response } from 'express';
import User from '../models/User';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

/* -----------------------------
  REGISTER SUPER ADMIN
----------------------------- */
export async function registerSuperAdmin(req: Request, res: Response) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, password required' });
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
    id: user._id.toString(),
    role: user.role,
    assignedWarehouses: assignedIds,
    warehouses: assignedIds, // mirror
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
    id: user._id.toString(),
    role: user.role,
    assignedWarehouses: assignedIds,
    warehouses: assignedIds, // alias for convenience
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

  const data = await User.findById(req.user.id).populate('assignedWarehouses');

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
