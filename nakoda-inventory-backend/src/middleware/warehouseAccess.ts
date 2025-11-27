import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requireWarehouseAccess(paramName: string = 'warehouseId') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const warehouseId =
      req.body?.[paramName] ||
      req.params?.[paramName] ||
      req.query?.[paramName];

    if (!warehouseId) {
      return res.status(400).json({ message: 'warehouseId required' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Super Admin bypass
    if (user.role === 'super_admin') return next();

    // Warehouse Admin bypass
    if (user.role === 'warehouse_admin') return next();

    // Managers + Viewers must be restricted
    if (!user.assignedWarehouses?.includes(String(warehouseId))) {
      return res.status(403).json({ message: 'No access to this warehouse' });
    }

    next();
  };
}
