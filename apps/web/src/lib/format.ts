/**
 * Format cents as a dollar string.
 * @param cents - The amount in cents
 * @returns Formatted string like "$12.99"
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Parse a dollar string to cents.
 * @param dollars - A string like "12.99" or "12"
 * @returns The amount in cents, or 0 if invalid
 */
export function parsePriceToCents(dollars: string): number {
  const parsed = parseFloat(dollars);
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}
