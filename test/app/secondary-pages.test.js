import test from 'node:test';
import assert from 'node:assert/strict';
import { filterClassics } from '../../src/ui/views/classics.js';
import { renderHistory } from '../../src/ui/views/history.js';

test('classics search matches hexagram name and six-line id', () => {
  const classics = [{ id: '111111', name: '乾' }, { id: '100010', name: '屯' }];
  assert.deepEqual(filterClassics(classics, '乾').map((item) => item.id), ['111111']);
  assert.deepEqual(filterClassics(classics, '100010').map((item) => item.name), ['屯']);
});

test('history links immutable records to result pages', () => {
  const html = renderHistory([{ id: 'gua-1', question: '是否继续推进？', method: 'number-pair', createdAt: '2026-07-24T10:00:00.000Z', classics: { original: { name: '乾' } } }]);
  assert.match(html, /#\/result\/gua-1/);
  assert.match(html, /是否继续推进/);
});
