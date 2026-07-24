import test from 'node:test';
import assert from 'node:assert/strict';
import { castNumberPair, castNumberTriple } from '../../src/domain/casting/number.js';
import { castDigitalSymbol } from '../../src/domain/casting/random.js';

test('pair and triple profiles never mix moving-line rules', () => {
  assert.deepEqual(castNumberPair('9', '16'), { profileId: 'number-pair-v1', upperNumber: 1, lowerNumber: 8, movingLine: 1, raw: ['9', '16'] });
  assert.deepEqual(castNumberTriple('9', '16', '12'), { profileId: 'number-triple-v1', upperNumber: 1, lowerNumber: 8, movingLine: 6, raw: ['9', '16', '12'] });
});

test('digital symbol casting consumes exactly three secure values', () => {
  const values = [0, 7, 5];
  const result = castDigitalSymbol((max) => values.shift() % max);
  assert.deepEqual(result, { profileId: 'digital-symbol-v1', upperNumber: 1, lowerNumber: 8, movingLine: 6 });
  assert.equal(values.length, 0);
});
