const PALETTE = ["#F59E0B", "#FBBF24", "#DC2626", "#22C55E", "#2563EB", "#D946EF", "#0EA5E9", "#F97316"];

export function colorFromString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
