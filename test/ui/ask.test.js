import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAsk } from '../../src/ui/views/ask.js';

test('ask view exposes four methods and labels digital casting as modern', () => {
  const html = renderAsk();
  assert.match(html, /时间起卦/);
  assert.match(html, /数字起卦/);
  assert.match(html, /现代数字取象法/);
  assert.match(html, /外应取象/);
  assert.equal((html.match(/data-method=/g) || []).length, 5);
});
