// src/utils/media.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '');

export function resolveMediaUrl(path?: string) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}
