import { formatMinorUnitsAsDecimal, parseAmountToMinorUnits } from './money';

describe('parseAmountToMinorUnits', () => {
  it('parses a two-decimal amount exactly', () => {
    expect(parseAmountToMinorUnits('267.80')).toBe(26780);
  });

  it('parses a whole-number amount', () => {
    expect(parseAmountToMinorUnits('50')).toBe(5000);
  });

  it('parses a single-decimal-digit amount', () => {
    expect(parseAmountToMinorUnits('5.1')).toBe(510);
  });

  it('parses a negative amount', () => {
    expect(parseAmountToMinorUnits('-12.34')).toBe(-1234);
  });

  it('parses zero', () => {
    expect(parseAmountToMinorUnits('0.00')).toBe(0);
  });

  it('never reintroduces float drift for values that are lossy in binary floating point', () => {
    // parseFloat('0.10') * 100 is 10.000000000000002 in IEEE 754 -- this parser must not do that.
    expect(parseAmountToMinorUnits('0.10')).toBe(10);
    expect(parseAmountToMinorUnits('0.20')).toBe(20);
    expect(parseAmountToMinorUnits('0.10') + parseAmountToMinorUnits('0.20')).toBe(30);
  });

  it('rejects a malformed amount instead of silently coercing it', () => {
    expect(() => parseAmountToMinorUnits('not-a-number')).toThrow();
    expect(() => parseAmountToMinorUnits('1.234')).toThrow();
    expect(() => parseAmountToMinorUnits('')).toThrow();
  });
});

describe('formatMinorUnitsAsDecimal', () => {
  it('formats minor units back into a two-decimal string', () => {
    expect(formatMinorUnitsAsDecimal(26780)).toBe('267.80');
  });

  it('pads a sub-ten-cent remainder with a leading zero', () => {
    expect(formatMinorUnitsAsDecimal(500)).toBe('5.00');
    expect(formatMinorUnitsAsDecimal(1007)).toBe('10.07');
  });

  it('formats a negative amount with a single leading minus sign', () => {
    expect(formatMinorUnitsAsDecimal(-1234)).toBe('-12.34');
  });

  it('round-trips through parse and format', () => {
    for (const decimal of ['267.80', '0.01', '5.10', '1000.00', '-42.05']) {
      expect(formatMinorUnitsAsDecimal(parseAmountToMinorUnits(decimal))).toBe(decimal);
    }
  });
});
