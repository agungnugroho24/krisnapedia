/** Format number using compact notation (1.2K, 12.4K, 3.1M). */
export function formatCompactNumber(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (n < 1000) return String(n);
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
