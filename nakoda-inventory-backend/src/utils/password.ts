import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(raw: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(raw, salt);
}

export async function comparePassword(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
