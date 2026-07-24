export function normalizeReportedInteger(value) {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) throw new TypeError('报数必须是十进制非负整数');
  return BigInt(text);
}

export function moduloIndex(value, divisor) {
  const numericValue = typeof value === 'bigint' ? value : BigInt(value);
  const numericDivisor = typeof divisor === 'bigint' ? divisor : BigInt(divisor);
  if (numericDivisor <= 0n) throw new RangeError('除数必须大于零');
  const remainder = numericValue % numericDivisor;
  return Number(remainder === 0n ? numericDivisor : remainder);
}
