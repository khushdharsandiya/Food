/** Normalize DB / admin category labels to keys used by OurMenu / OurHomeMenu */
const CATEGORY_ALIASES = {
  maxican: 'mexican',
};

/**
 * @param {unknown} category
 * @returns {string} lowercase bucket key (empty → 'uncategorized')
 */
export function normalizeMenuCategoryKey(category) {
  const raw = String(category ?? '')
    .toLowerCase()
    .trim();
  if (!raw) return 'uncategorized';
  return CATEGORY_ALIASES[raw] || raw;
}
