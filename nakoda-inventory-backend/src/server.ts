import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';

import { config } from './config/env';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import warehouseRoutes from './routes/warehouseRoutes';
import productRoutes from './routes/productRoutes';
import stockRoutes from './routes/stockRoutes';
import grnRoutes from './routes/grnRoutes';
import dispatchRoutes from './routes/dispatchRoutes';
import mediaRoutes from './routes/mediaRoutes';
import userRoutes from './routes/userRoutes';
import transferRoutes from './routes/transferRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

async function start() {
  await connectDatabase();

  if (!fs.existsSync(config.inventoryMediaRoot)) {
    fs.mkdirSync(config.inventoryMediaRoot, { recursive: true });
  }

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(morgan('dev'));
  app.use(express.json());

  // static media
  app.use(
    '/inventory-media',
    express.static(config.inventoryMediaRoot, {
      fallthrough: false,
    })
  );

  app.get('/', (_req, res) => {
    res.json({ message: 'Nakoda Inventory Backend API' });
  });

app.use('/api/auth', authRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/inventory-media', mediaRoutes);
      
app.use('/api/users', userRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/dashboard', dashboardRoutes);

  app.use(errorHandler);

  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
