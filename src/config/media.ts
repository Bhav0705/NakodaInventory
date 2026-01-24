
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''; 

export const MEDIA_BASE = API_BASE.replace(/\/api\/?$/, '');

export function getMediaUrl(relativePath: string) {
  return `${MEDIA_BASE}/inventory-media/${relativePath}`;
}
