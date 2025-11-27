# Nakoda Inventory Backend

Simple inventory backend for Nakoda Mobile.

## Setup

```bash
npm install
cp .env.example .env
# edit .env (MONGO_URI, etc.)
npm run dev
```

Default endpoints:

- `POST /api/auth/register-super-admin` — create first super admin (one-time)
- `POST /api/auth/login` — get JWT token
- `GET /api/auth/me` — current user

- `GET /api/warehouses` — list warehouses
- `POST /api/warehouses` — create warehouse (super_admin only)

- `GET /api/products` — list products
- `POST /api/products` — create product
- `POST /api/products/alias` — add alias
- `POST /api/products/packing` — add packing
- `GET /api/products/search?q=` — search products

- `GET /api/stock` — view stock (optional query: warehouseId, productId)

- `POST /api/grn` — create GRN (DRAFT)
- `POST /api/grn/:id/approve` — approve GRN, update stock

- `POST /api/dispatch` — create dispatch (DRAFT)
- `POST /api/dispatch/:id/approve` — approve dispatch, reduce stock

- `POST /api/inventory-media` — upload image/video for transaction
- `GET /api/inventory-media?transactionType=&transactionId=` — list media for transaction

Media files are stored in `INVENTORY_MEDIA_ROOT` with date-based folders.
