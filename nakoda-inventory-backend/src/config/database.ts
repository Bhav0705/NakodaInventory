import mongoose from 'mongoose';
import { config } from './env';

export async function connectDatabase() {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI not set');
  }
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
}
