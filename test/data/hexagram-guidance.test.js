import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getHexagramGuidance, HEXAGRAM_GUIDANCE } from '../../src/data/hexagram-guidance.js';

test('modern guidance covers the same 64 unique hexagrams as the classics vendor', async () => {
  const classics = JSON.parse(await readFile('src/vendor/64gua.json', 'utf8'));
  const classicIds = classics.map((record) => record.id).sort();
  const guidanceIds = Object.keys(HEXAGRAM_GUIDANCE).sort();

  assert.equal(guidanceIds.length, 64);
  assert.deepEqual(guidanceIds, classicIds);
});

test('every guidance entry contains complete modern interpretation fields', () => {
  for (const [id, guidance] of Object.entries(HEXAGRAM_GUIDANCE)) {
    assert.equal(guidance.id, id);
    assert.ok(guidance.name.length > 0);
    assert.ok(guidance.situation.length > 0);
    assert.ok(guidance.process.length > 0);
    assert.ok(guidance.tendency.length > 0);
    assert.ok(guidance.favorable.length > 0);
    assert.ok(guidance.cautions.length > 0);
    assert.ok(guidance.actions.length > 0);
    assert.deepEqual(guidance.sourceKeys, [`modern_guidance:${id}`]);
    assert.ok(Object.isFrozen(guidance));
  }
});

test('unknown ids return an explicit frozen fallback', () => {
  const fallback = getHexagramGuidance('missing');
  assert.equal(fallback.id, 'missing');
  assert.match(fallback.situation, /资料未覆盖/);
  assert.deepEqual(fallback.sourceKeys, ['modern_guidance:fallback']);
  assert.ok(Object.isFrozen(fallback));
});
