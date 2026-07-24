import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProject } from '../../tools/build.mjs';

test('build emits a versioned precache service worker', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'cyber-pwa-'));
  try {
    await buildProject({ outputDir });
    const worker = await readFile(join(outputDir, 'sw.js'), 'utf8');
    assert.match(worker, /cyber-divination-[a-f0-9]{12}/);
    assert.match(worker, /src\/vendor\/64gua\.json/);
    assert.match(worker, /mode === 'navigate'/);
    assert.doesNotMatch(worker, /__PRECACHE__|__CACHE_VERSION__/);
    assert.match(await readFile(join(outputDir, 'src/app.js'), 'utf8'), /serviceWorker\.register\('\/sw\.js'\)/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
