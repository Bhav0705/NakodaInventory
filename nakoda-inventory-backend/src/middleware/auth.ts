import { Request, Response, NextFunction } from "express";
import { JwtPayload, verifyToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload & { warehouses?: string[] };
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.substring(7);

  try {
    const payload = verifyToken(token);

    // KEY FIX
    payload.warehouses = payload.assignedWarehouses || [];

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
