import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public disclosures identify GPT-5.5 as the configured AI model', async () => {
  const files = await Promise.all([
    readFile('index.html', 'utf8'),
    readFile('src/ui/views/ask.js', 'utf8'),
    readFile('src/ui/views/privacy.js', 'utf8')
  ]);
  for (const source of files) assert.match(source, /GPT-5\.5/);
});
