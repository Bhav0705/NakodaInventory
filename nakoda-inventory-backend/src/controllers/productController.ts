import { Request, Response } from 'express';
import Product from '../models/Product';
import ProductAlias from '../models/ProductAlias';
import ProductPacking from '../models/ProductPacking';

export async function listProducts(_req: Request, res: Response) {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
}

export async function createProduct(req: Request, res: Response) {
  const { name, sku, category, baseUnit } = req.body;
  if (!name || !sku) return res.status(400).json({ message: 'name and sku required' });
  const existing = await Product.findOne({ sku });
  if (existing) return res.status(400).json({ message: 'SKU already exists' });
  const product = await Product.create({ name, sku, category, baseUnit: baseUnit || 'PCS' });
  res.json(product);
}

export async function addAlias(req: Request, res: Response) {
  const { productId, alias } = req.body;
  if (!productId || !alias) return res.status(400).json({ message: 'productId and alias required' });
  const aliasDoc = await ProductAlias.create({ productId, alias, priority: 100 });
  res.json(aliasDoc);
}

export async function addPacking(req: Request, res: Response) {
  const { productId, type, unitName, conversionToBase, isDefault } = req.body;
  if (!productId || !type || !unitName || !conversionToBase) {
    return res.status(400).json({ message: 'missing fields' });
  }
  const packing = await ProductPacking.create({
    productId,
    type,
    unitName,
    conversionToBase,
    isDefault: !!isDefault
  });
  res.json(packing);
}

export async function searchProducts(req: Request, res: Response) {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);

  // search by SKU / name first
  const regex = new RegExp(q, 'i');
  let products = await Product.find({
    $or: [{ sku: regex }, { name: regex }]
  }).limit(20);

  if (products.length === 0) {
    // search aliases
    const aliases = await ProductAlias.find({ alias: regex }).limit(20);
    const productIds = aliases.map((a) => a.productId);
    products = await Product.find({ _id: { $in: productIds } }).limit(20);
  }

  res.json(products);
}
