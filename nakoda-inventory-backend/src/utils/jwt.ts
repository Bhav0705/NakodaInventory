import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

export type JwtPayload = {
  sub?: string;
  id?: string;
  role: string;
  assignedWarehouses?: string[];
  warehouses?: string[];
  email?: string;
  name?: string;
};

function getSecret(): Secret {
  const secret = process.env.JWT_SECRET as Secret;
  if (!secret) throw new Error("JWT_SECRET missing in .env");
  return secret;
}

export function signToken(payload: JwtPayload) {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
