import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReportedInteger, moduloIndex } from '../../src/domain/modulo.js';
import { getTrigram } from '../../src/domain/trigrams.js';

test('modulo and exact integer rules are stable', () => {
  assert.equal(moduloIndex(8n, 8n), 8);
  assert.equal(moduloIndex(12n, 6n), 6);
  assert.equal(moduloIndex(17n, 8n), 1);
  assert.equal(normalizeReportedInteger('900719925474099312345'), 900719925474099312345n);
  assert.throws(() => normalizeReportedInteger('-1'), /非负整数/);
  assert.throws(() => normalizeReportedInteger('1.5'), /非负整数/);
});

test('trigram numbers follow the approved mapping', () => {
  assert.deepEqual(getTrigram(1), { number: 1, key: 'qian', name: '乾', lines: [1, 1, 1], element: 'metal', direction: 'northwest' });
  assert.equal(getTrigram(8).name, '坤');
});
