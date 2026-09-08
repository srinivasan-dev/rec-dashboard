/**
 * Money is never represented as a floating-point number in this codebase (see
 * docs/architecture.md §8). Amounts are parsed once, from CSV decimal strings, into integer
 * minor units (e.g. "267.80" -> 26780) using string manipulation only — never
 * `parseFloat` followed by `* 100`, which reintroduces the float error it's meant to avoid.
 */

const DECIMAL_AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/** Parses a decimal currency string (as found in the CSVs) into integer minor units. */
export function parseAmountToMinorUnits(decimal: string): number {
  const trimmed = decimal.trim();
  if (!DECIMAL_AMOUNT_PATTERN.test(trimmed)) {
    throw new Error(`Invalid decimal amount: "${decimal}"`);
  }

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const paddedFraction = fractionPart.padEnd(2, '0');

  const minorUnits = Number(wholePart) * 100 + Number(paddedFraction);
  return negative ? -minorUnits : minorUnits;
}

/** Formats integer minor units back into a decimal string for display (e.g. 26780 -> "267.80"). */
export function formatMinorUnitsAsDecimal(minorUnits: number): string {
  const negative = minorUnits < 0;
  const absolute = Math.abs(minorUnits);
  const whole = Math.trunc(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}
