# Nakoda Inventory Frontend

React + Vite + TypeScript frontend that connects to the Nakoda Inventory backend.

## Setup

```bash
npm install
cp .env.example .env
# if backend is on a different URL, change VITE_API_BASE_URL
npm run dev
```

This expects backend running on `http://localhost:5000` with routes under `/api`.

Main pages:

- `/login` — Login with email/password (backend auth).
- `/` — Dashboard, protected.
- `/warehouses` — List warehouses.
- `/products` — List + create products (super_admin only).
- `/grn` — Create + approve GRN (inbound).
- `/dispatch` — Create + approve Dispatch (outbound).
- `/media-test` — Upload images/videos for GRN/Dispatch etc.

Ensure your backend `.env` has `CORS_ORIGIN=http://localhost:5173`.
