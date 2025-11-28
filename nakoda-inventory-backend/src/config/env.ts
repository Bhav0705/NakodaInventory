import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  env: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  inventoryMediaRoot:
    process.env.INVENTORY_MEDIA_ROOT ||
    path.join(__dirname, '..', '..', 'inventory-media'),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
