import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nakoda_secret';

export interface JwtPayload {
  id: string;
  role: string;
  assignedWarehouses: string[];
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
