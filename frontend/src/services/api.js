// frontend/src/services/api.js
// [M6] Use VITE_API_URL as-is after ensuring it starts with https://.
// The fragile .onrender.com heuristic has been removed — Render's `host` property
// now returns the full hostname, so the format string in render.yaml handles it.

const API_BASE_URL = (() => {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '';
  return raw.startsWith('http') ? raw : `https://${raw}`;
})();

export const getApiUrl = (endpoint) => {
  // Ensure the endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};
