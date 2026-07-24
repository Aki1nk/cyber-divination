import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveHexagram } from '../../src/domain/hexagrams.js';

test('deriveHexagram builds mutual, changed, body and use', () => {
  const result = deriveHexagram({ upperNumber: 1, lowerNumber: 8, movingLine: 2 });
  assert.deepEqual(result.originalLines, [0, 0, 0, 1, 1, 1]);
  assert.deepEqual(result.changedLines, [0, 1, 0, 1, 1, 1]);
  assert.deepEqual(result.mutualLines, [0, 0, 1, 0, 1, 1]);
  assert.equal(result.body.key, 'qian');
  assert.equal(result.use.key, 'kun');
  assert.equal(result.originalId, '000111');
});

test('moving line in upper trigram makes upper the use trigram', () => {
  const result = deriveHexagram({ upperNumber: 1, lowerNumber: 8, movingLine: 5 });
  assert.equal(result.body.key, 'kun');
  assert.equal(result.use.key, 'qian');
});
