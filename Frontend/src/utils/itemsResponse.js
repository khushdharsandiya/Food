/**
 * GET /api/items may return a raw array or { items: [] };
 * keep parsing safe even when the response shape varies.
 */
export function itemsArrayFromApiResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items;
  return [];
}
