function secureIndex(max) {
  if (!Number.isInteger(max) || max <= 0) throw new RangeError('随机范围必须为正整数');
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / max) * max;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % max;
}

export function castDigitalSymbol(randomIndex = secureIndex) {
  return Object.freeze({
    profileId: 'digital-symbol-v1',
    upperNumber: randomIndex(8) + 1,
    lowerNumber: randomIndex(8) + 1,
    movingLine: randomIndex(6) + 1
  });
}
