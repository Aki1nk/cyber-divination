import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('shell declares language, skip link and reduced motion', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('src/styles/ritual.css', 'utf8');
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /class="skip-link"/);
  assert.doesNotMatch(html, /<audio|autoplay/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('manifest icons exist at installable sizes', async () => {
  await Promise.all([
    access('public/icons/app-icon.svg'),
    access('public/icons/icon-192.png'),
    access('public/icons/icon-512.png'),
    access('public/icons/maskable-512.png')
  ]);
});

test('interactive views use native controls and arrow-key tabs', async () => {
  const [app, layout, ask, result] = await Promise.all([
    readFile('src/app.js', 'utf8'),
    readFile('src/ui/layout.js', 'utf8'),
    readFile('src/ui/views/ask.js', 'utf8'),
    readFile('src/ui/views/result.js', 'utf8')
  ]);
  assert.match(layout, /<nav[^>]+aria-label="主导航"/);
  assert.match(ask, /<button[^>]+type="submit"/);
  assert.match(result, /role="tab"/);
  assert.match(app, /ArrowLeft/);
  assert.match(app, /ArrowRight/);
  assert.doesNotMatch(`${layout}${ask}${result}`, /tabindex="[1-9]/);
});
