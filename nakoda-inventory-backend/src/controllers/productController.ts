// src/controllers/productController.ts
import { Request, Response } from 'express';
import Product from '../models/Product';
import ProductAlias from '../models/ProductAlias';
import ProductPacking from '../models/ProductPacking';

export async function listProducts(_req: Request, res: Response) {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
}

export async function createProduct(req: Request, res: Response) {
  try {
    const { name, sku, category } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ message: 'name and sku required' });
    }

    const existing = await Product.findOne({ sku });
    if (existing) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    // files from multer.array('media')
    const files = (req as any).files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ message: 'Please upload at least one product image' });
    }

    // build gallery URLs
    const images = files.map(
      (f) => `/uploads/products/${f.filename}`
    );

    const mainImageUrl = images[0]; // first image is main

    const product = await Product.create({
      name,
      sku,
      category,
      baseUnit: 'PCS',
      mainImageUrl,
      images,
      status: 'active',
    });

    // default packing row
    await ProductPacking.findOneAndUpdate(
      { productId: product._id },
      {
        type: 'PIECE',
        unitName: 'PCS',
        conversionToBase: 1,
        isDefault: true,
      },
      { upsert: true, new: true }
    );

    res.json(product);
  } catch (err) {
    console.error('createProduct error:', err);
    res.status(500).json({ message: 'Failed to create product' });
  }
}

export async function addAlias(req: Request, res: Response) {
  const { productId, alias } = req.body;
  if (!productId || !alias) {
    return res.status(400).json({ message: 'productId and alias required' });
  }

  const aliasDoc = await ProductAlias.create({
    productId,
    alias,
    priority: 100,
  });

  res.json(aliasDoc);
}

export async function addPacking(req: Request, res: Response) {
  const { productId, unitName } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'productId required' });
  }

  const packing = await ProductPacking.findOneAndUpdate(
    { productId },
    {
      type: 'PIECE',
      unitName: unitName || 'PCS',
      conversionToBase: 1,
      isDefault: true,
    },
    { upsert: true, new: true }
  );

  res.json(packing);
}

export async function searchProducts(req: Request, res: Response) {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);

  const regex = new RegExp(q, 'i');

  let products = await Product.find({
    $or: [{ sku: regex }, { name: regex }],
  }).limit(20);

  if (products.length === 0) {
    const aliases = await ProductAlias.find({ alias: regex }).limit(20);
    const productIds = aliases.map((a) => a.productId);
    products = await Product.find({ _id: { $in: productIds } }).limit(20);
  }

  res.json(products);
}
