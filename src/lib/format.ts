export function fmtCurrency(amount: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2;
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtMultiplier(x: number): string {
  if (x >= 100) return `${x.toFixed(0)}×`;
  if (x >= 10) return `${x.toFixed(1)}×`;
  return `${x.toFixed(2)}×`;
}

export function shortHash(hex: string, head = 8, tail = 6): string {
  if (!hex || hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}
