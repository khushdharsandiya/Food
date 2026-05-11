const API_ORIGIN = 'http://localhost:4000';

/** SVG placeholder when image missing or fails */
export const MENU_IMAGE_PLACEHOLDER =
    'data:image/svg+xml,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect fill="#2a1e14" width="480" height="360"/><text fill="#d4a574" font-family="Georgia,serif" font-size="20" x="240" y="180" text-anchor="middle">Food image</text></svg>`
    );

/** Full URL for cart / orders (DB may store relative `/uploads/...`). */
export function resolveItemImageUrl(imageUrl) {
    if (imageUrl == null) return '';
    const s = String(imageUrl).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return `${API_ORIGIN}${s}`;
    return `${API_ORIGIN}/uploads/${s.replace(/^uploads\/?/i, '')}`;
}

/** Safe src for menu cards (API usually returns absolute URLs). */
export function menuImageSrc(imageUrl) {
    const s = imageUrl != null && String(imageUrl).trim();
    return s || MENU_IMAGE_PLACEHOLDER;
}

/** Fallback image by dish keywords when original remote URL fails. */
export function menuImageFallback(name = '', category = '') {
    return MENU_IMAGE_PLACEHOLDER;
}
