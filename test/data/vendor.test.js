import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('vendored classics contain 64 unique hexagrams', async () => {
  const records = JSON.parse(await readFile('src/vendor/64gua.json', 'utf8'));
  assert.equal(records.length, 64);
  assert.equal(new Set(records.map((record) => record.id)).size, 64);
  assert.equal(records.find((record) => record.id === '111111').name, '乾');
  assert.equal(records.find((record) => record.id === '000000').name, '坤');
  assert.equal(records.find((record) => record.id === '100010').name, '屯');
});

test('vendored lunar library exposes Solar and Lunar', async () => {
  const lunar = await import('../../src/vendor/lunar.cjs');
  assert.equal(typeof lunar.default.Solar.fromYmd, 'function');
  assert.equal(typeof lunar.default.Lunar.fromYmd, 'function');
});
