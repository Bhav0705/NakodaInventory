// src/config/media.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''; // e.g. http://localhost:5000/api

// http://localhost:5000/api  →  http://localhost:5000
export const MEDIA_BASE = API_BASE.replace(/\/api\/?$/, '');

export function getMediaUrl(relativePath: string) {
  return `${MEDIA_BASE}/inventory-media/${relativePath}`;
}
