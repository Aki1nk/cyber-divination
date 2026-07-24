import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLayout } from '../../src/ui/layout.js';
import { renderHome } from '../../src/ui/views/home.js';

test('home shell exposes main content, statement and four navigation items', () => {
  const html = renderLayout({ routeName: 'home', content: renderHome() });
  assert.match(html, /id="main-content"/);
  assert.match(html, /文化体验/);
  assert.match(html, /诚心问易/);
  assert.equal((html.match(/class="bottom-nav__link/g) || []).length, 4);
});
