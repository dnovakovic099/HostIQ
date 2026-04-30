/**
 * Helpers for rendering SecureStay-derived payloads safely.
 *
 * The SecureStay /cleaner-report endpoint emits items in shapes that
 * vary by version (e.g. a quote may live under public_quote OR
 * public_review OR quote). React will crash with "Objects are not
 * valid as a React child" if we ever try to render an object directly,
 * so all SS payload rendering goes through these helpers.
 */

/**
 * Returns a renderable string for a value that might be a string, a
 * number, or an object containing a string under one of `keys`. Never
 * returns an object.
 */
export function renderableText(value, keys = []) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    for (const k of keys) {
      const v = value[k];
      if (typeof v === 'string' && v.trim()) return v;
      if (typeof v === 'number') return String(v);
    }
  }
  return '';
}

/**
 * Formats a SecureStay rating for display. Ratings are on a 1-5 scale.
 * Returns "5 ★" or empty string if the rating is missing/invalid.
 */
export function formatStars(rating) {
  if (typeof rating !== 'number' || Number.isNaN(rating)) return '';
  return `${rating} ★`;
}

/**
 * SecureStay considers a guest review "low" when rating ≤ 3 (out of 5).
 * Centralized so server + mobile stay aligned.
 */
export const LOW_RATING_THRESHOLD = 3;
